// WeatherService — service-oriented adapter over the Open-Meteo ICON
// forecast API, fronted by a per-POI Postgres read-through cache. Fresh
// cache rows serve without an upstream forecast call; stale or missing
// POIs are batched into a single HTTP request via the multi-location
// `latitude=lat1,lat2&longitude=lng1,lng2` syntax and the raw hourly
// blocks are cached until the covering ICON model's next run. Fog
// probability and the "beautiful sunrise/sunset" flag are derived
// per-request from the (cached or fetched) hourly block.
//
// References:
// - Open-Meteo DWD ICON API: https://open-meteo.com/en/docs/dwd-api
// - Fog from dewpoint depression: when the spread (T − Td) is small the
//   air is near saturation. Operational meteorology uses ~2.5°C as the
//   high-fog-potential threshold (Tardif & Rasmussen 2007, "Event-Based
//   Climatology and Typology of Fog in the New York City Region", J. Appl.
//   Meteorol. Climatol., 46(8): 1141–1168). We model probability as a
//   quadratic falloff cutting off at 4°C.

import { db } from "@/prisma/db";
import { coveringModel, modelClock, type IconModel } from "./model-clock";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// When a model's meta.json is unavailable the clock cannot say when the next
// run lands; trust affected cache rows for a short window instead of
// re-checking on every request.
const META_GRACE_MS = 10 * 60 * 1000;

export type ForecastInput = {
	id: number;
	latitude: number;
	longitude: number;
	// One fog probability is computed per target timestamp. Pass as many as
	// you'd like to inspect across the morning (e.g. sunrise, +1 h, +2 h).
	fogTargets: string[];
	sunriseAt: string | null;
	sunsetAt: string | null;
};

export type FogForecast = {
	probability: number; // 0–100
	at: string; // ISO timestamp of the hour we evaluated
	temperature: number; // °C
	dewPoint: number; // °C
	spread: number; // T − Td, °C
};

export type BeautyForecast = {
	beautiful: boolean;
	at: string;
	cloudCoverLow: number; // %
	cloudCoverMid: number;
	cloudCoverHigh: number;
};

export type PoiForecast = {
	// One reading per requested `fogTargets` entry. Targets that fall outside
	// the forecast window or whose hour has missing data are skipped.
	fog: FogForecast[];
	sunrise: BeautyForecast | null;
	sunset: BeautyForecast | null;
};

// Beauty criteria (per the user spec): low+mid clouds ≤ 10 % (mostly clear at
// horizon for the sun to peek through) AND high clouds ≥ 80 % (a high deck to
// catch the warm light and turn pink).
const BEAUTY_LOW_MID_MAX = 10;
const BEAUTY_HIGH_MIN = 80;

type HourlyBlock = {
	time: string[];
	temperature_2m: Array<number | null>;
	dew_point_2m: Array<number | null>;
	cloud_cover_low: Array<number | null>;
	cloud_cover_mid: Array<number | null>;
	cloud_cover_high: Array<number | null>;
};

type LocationResult = {
	hourly: HourlyBlock;
};

// Structural view of a `PoiForecast` cache row as the ORM lane returns it
// (timestamptz columns decode to `Date`).
type CachedForecastRow = {
	poiId: number;
	model: string;
	hourly: unknown;
	fetchedAt: Date;
	staleAt: Date;
};

/**
 * Service encapsulating all weather-forecast concerns. Consumers depend on
 * this interface instead of the Open-Meteo wire format, so the provider can
 * be swapped (or mocked in tests) without touching call sites.
 */
export class WeatherService {
	constructor(private readonly baseUrl: string = OPEN_METEO_URL) {}

	/**
	 * Resolve a forecast for every POI and return a `Map<poiId, PoiForecast>`.
	 * Missing entries mean "forecast unavailable" — callers should degrade
	 * rather than fail the request.
	 *
	 * Read-through cached: a cache row is fresh while `now < staleAt` and it
	 * was fetched on the current UTC day; fresh rows serve without an upstream
	 * forecast call. Stale/missing POIs are refetched in one batched call and
	 * upserted with a `staleAt` from their covering model's run clock. A DB
	 * failure degrades to the direct fetch; an upstream failure serves expired
	 * rows when present.
	 */
	async getForecasts(pois: ForecastInput[]): Promise<Map<number, PoiForecast>> {
		const out = new Map<number, PoiForecast>();
		if (pois.length === 0) return out;
		const now = new Date();

		const rows = await this.loadCacheRows(pois.map((p) => p.id));
		const dbHealthy = rows !== null;

		// Partition cached rows by the freshness rule; a malformed cached
		// `hourly` payload is treated as a missing row.
		const cachedFresh = new Map<number, HourlyBlock>();
		const cachedExpired = new Map<number, HourlyBlock>();
		for (const p of pois) {
			const row = rows?.get(p.id);
			if (!row) continue;
			const hourly = parseHourlyBlock(row.hourly);
			if (!hourly) continue;
			(isFresh(row, now) ? cachedFresh : cachedExpired).set(p.id, hourly);
		}
		const toRefresh = pois.filter((p) => !cachedFresh.has(p.id));

		// Attribute each refresh candidate to its covering model and resolve the
		// per-model staleness clock (at most one meta fetch per unique model).
		const modelByPoi = new Map<number, IconModel>();
		let staleAtByModel = new Map<IconModel, Date | null>();
		if (toRefresh.length > 0) {
			for (const p of toRefresh) {
				modelByPoi.set(p.id, coveringModel(p.latitude, p.longitude));
			}
			staleAtByModel = await modelClock.nextStaleAt(modelByPoi.values());
		}

		// Meta unknown (endpoint down) + expired row present → treat as "no new
		// run": serve the row under grace and skip the upstream refetch. POIs
		// without a row must still fetch regardless of meta health.
		const graceServed = new Set<number>();
		const toFetch: ForecastInput[] = [];
		for (const p of toRefresh) {
			const model = modelByPoi.get(p.id);
			const metaKnown = model != null && staleAtByModel.get(model) != null;
			if (!metaKnown && cachedExpired.has(p.id)) {
				graceServed.add(p.id);
			} else {
				toFetch.push(p);
			}
		}

		// One batched upstream call for everything that must be refetched.
		const fetched =
			toFetch.length > 0 ? await this.fetchHourlyBlocks(toFetch) : null;

		if (dbHealthy && fetched && fetched.size > 0) {
			await this.upsertForecasts(toFetch, fetched, modelByPoi, staleAtByModel, now);
		}
		if (dbHealthy && graceServed.size > 0) {
			await this.extendGrace(
				[...graceServed],
				new Date(now.getTime() + META_GRACE_MS),
			);
		}

		// Serve, best source first: fresh cache → fresh fetch → expired row
		// (grace-served, or upstream fallback per the degradation contract).
		let expiredFallback = 0;
		for (const p of pois) {
			const hourly =
				cachedFresh.get(p.id) ?? fetched?.get(p.id) ?? cachedExpired.get(p.id);
			if (!hourly) continue;
			if (
				!cachedFresh.has(p.id) &&
				!fetched?.has(p.id) &&
				!graceServed.has(p.id)
			) {
				expiredFallback++;
			}
			out.set(p.id, this.summarize({ hourly }, p));
		}

		// One decision line per request cycle.
		const n = pois.length;
		if (cachedFresh.size === n) {
			console.log(`forecast cache: all ${n} fresh`);
		} else {
			const parts = [`refreshed ${fetched?.size ?? 0} of ${n} POIs`];
			if (cachedFresh.size > 0) parts.push(`${cachedFresh.size} fresh`);
			if (graceServed.size > 0) {
				parts.push(`${graceServed.size} grace-served (meta unavailable)`);
			}
			if (expiredFallback > 0) {
				parts.push(`${expiredFallback} expired served (upstream failed)`);
			}
			if (n - out.size > 0) parts.push(`${n - out.size} unavailable`);
			if (!dbHealthy) parts.push("db unavailable, direct fetch");
			console.log(`forecast cache: ${parts.join(", ")}`);
		}

		return out;
	}

	/** Load cache rows for the given POI ids; `null` signals a DB failure. */
	private async loadCacheRows(
		ids: number[],
	): Promise<Map<number, CachedForecastRow> | null> {
		try {
			const rows = await db.orm.public.PoiForecast.where((f) =>
				f.poiId.in(ids),
			).all();
			const out = new Map<number, CachedForecastRow>();
			for (const row of rows) out.set(row.poiId, row);
			return out;
		} catch (err) {
			console.warn("forecast cache read failed, using direct fetch:", err);
			return null;
		}
	}

	/**
	 * Fetch the raw hourly block for every POI in a single Open-Meteo request.
	 * Returns `null` on any failure — including a location-count mismatch,
	 * whose misaligned data must never be cached or served.
	 */
	private async fetchHourlyBlocks(
		pois: ForecastInput[],
	): Promise<Map<number, HourlyBlock> | null> {
		const url = this.buildRequestUrl(pois);

		let payload: LocationResult | LocationResult[];
		try {
			const res = await fetch(url.toString(), {
				// No client-side caching: Next.js dynamic route already disables this
				// for /api/pois, but be explicit so the upstream cache layer doesn't
				// hand us a stale forecast.
				cache: "no-store",
			});
			if (!res.ok) {
				console.warn(`Open-Meteo returned ${res.status}`);
				return null;
			}
			payload = (await res.json()) as LocationResult | LocationResult[];
		} catch (err) {
			console.warn("Open-Meteo fetch failed:", err);
			return null;
		}

		// Multi-location responses are arrays; single-location is an object.
		const items = Array.isArray(payload) ? payload : [payload];
		if (items.length !== pois.length) {
			console.warn(
				`Open-Meteo returned ${items.length} locations for ${pois.length} POIs`,
			);
			return null;
		}

		const out = new Map<number, HourlyBlock>();
		for (let i = 0; i < pois.length; i++) {
			out.set(pois[i].id, items[i].hourly);
		}
		return out;
	}

	/**
	 * Upsert one cache row per refetched POI. `staleAt` comes from the POI's
	 * covering model clock; an unknown clock (meta fetch failed) falls back to
	 * a short grace window. Write failures are logged, never thrown — the
	 * fetched data still serves this request.
	 */
	private async upsertForecasts(
		refetched: ForecastInput[],
		fetched: Map<number, HourlyBlock>,
		modelByPoi: Map<number, IconModel>,
		staleAtByModel: Map<IconModel, Date | null>,
		now: Date,
	): Promise<void> {
		const grace = new Date(now.getTime() + META_GRACE_MS);
		const writes = refetched.flatMap((p) => {
			const hourly = fetched.get(p.id);
			const model = modelByPoi.get(p.id);
			if (!hourly || !model) return [];
			const patch = {
				model,
				hourly,
				fetchedAt: now,
				staleAt: staleAtByModel.get(model) ?? grace,
			};
			return [
				db.orm.public.PoiForecast.upsert({
					create: { poiId: p.id, ...patch },
					update: patch,
				}),
			];
		});
		const results = await Promise.allSettled(writes);
		const failed = results.filter((r) => r.status === "rejected").length;
		if (failed > 0) {
			console.warn(`forecast cache: ${failed} upsert(s) failed, serving uncached`);
		}
	}

	/** Push `staleAt` forward on rows served under grace (meta unavailable). */
	private async extendGrace(poiIds: number[], staleAt: Date): Promise<void> {
		try {
			await db.orm.public.PoiForecast.where((f) => f.poiId.in(poiIds)).update({
				staleAt,
			});
		} catch (err) {
			console.warn("forecast cache: grace extension failed:", err);
		}
	}

	private buildRequestUrl(pois: ForecastInput[]): URL {
		const url = new URL(this.baseUrl);
		url.searchParams.set(
			"latitude",
			pois.map((p) => p.latitude.toFixed(5)).join(","),
		);
		url.searchParams.set(
			"longitude",
			pois.map((p) => p.longitude.toFixed(5)).join(","),
		);
		url.searchParams.set(
			"hourly",
			[
				"temperature_2m",
				"dew_point_2m",
				"cloud_cover_low",
				"cloud_cover_mid",
				"cloud_cover_high",
			].join(","),
		);
		// DWD ICON seamless: per-location best of (D2 → EU → global) so we keep
		// 2 km resolution over Central Europe while still covering POIs elsewhere
		// (a single icon_d2 request fails with HTTP 400 if any location is outside
		// the D2 area).
		url.searchParams.set("models", "icon_seamless");
		// Two days is enough to reach tomorrow's sunrise even when the user opens
		// the page late in the evening.
		url.searchParams.set("forecast_days", "2");
		url.searchParams.set("timezone", "UTC");
		return url;
	}

	private summarize(loc: LocationResult, input: ForecastInput): PoiForecast {
		const h = loc.hourly;

		const fog: FogForecast[] = [];
		for (const target of input.fogTargets) {
			const idx = nearestHourIndex(h.time, target);
			if (idx == null) continue;
			const t = h.temperature_2m[idx];
			const td = h.dew_point_2m[idx];
			if (typeof t !== "number" || typeof td !== "number") continue;
			fog.push({
				probability: fogProbability(t, td),
				at: `${h.time[idx]}Z`,
				temperature: t,
				dewPoint: td,
				spread: Number((t - td).toFixed(2)),
			});
		}

		return {
			fog,
			sunrise: beautyAt(h, input.sunriseAt),
			sunset: beautyAt(h, input.sunsetAt),
		};
	}
}

/** Default shared instance; the app talks to one weather provider. */
export const weatherService = new WeatherService();

// Quadratic falloff: spread=0 → 100 %, spread=4 → 0 %.
// Tuned against the rule of thumb that spread < ~2.5 °C is a high fog risk.
function fogProbability(temperature: number, dewPoint: number): number {
	const spread = Math.max(0, temperature - dewPoint);
	const x = Math.max(0, 1 - spread / 4);
	return Math.round(100 * x * x);
}

function isBeautifulSunsetOrSunrise(
	low: number,
	mid: number,
	high: number,
): boolean {
	return (
		low <= BEAUTY_LOW_MID_MAX &&
		mid <= BEAUTY_LOW_MID_MAX &&
		high >= BEAUTY_HIGH_MIN
	);
}

function beautyAt(
	h: HourlyBlock,
	targetIso: string | null,
): BeautyForecast | null {
	if (!targetIso) return null;
	const idx = nearestHourIndex(h.time, targetIso);
	if (idx == null) return null;
	const low = h.cloud_cover_low[idx];
	const mid = h.cloud_cover_mid[idx];
	const high = h.cloud_cover_high[idx];
	if (
		typeof low !== "number" ||
		typeof mid !== "number" ||
		typeof high !== "number"
	) {
		return null;
	}
	return {
		beautiful: isBeautifulSunsetOrSunrise(low, mid, high),
		at: `${h.time[idx]}Z`,
		cloudCoverLow: low,
		cloudCoverMid: mid,
		cloudCoverHigh: high,
	};
}

// A cached row serves only while the covering model's run is current AND the
// row was fetched on the current UTC day: sunrise targets are computed per
// request, and a fetch from yesterday cannot guarantee its 2-day forecast
// window still reaches tomorrow's sunrise.
function isFresh(row: CachedForecastRow, now: Date): boolean {
	const staleAtMs = row.staleAt.getTime();
	const fetchedMs = row.fetchedAt.getTime();
	if (!Number.isFinite(staleAtMs) || !Number.isFinite(fetchedMs)) return false;
	if (now.getTime() >= staleAtMs) return false;
	return (
		new Date(fetchedMs).toISOString().slice(0, 10) ===
		now.toISOString().slice(0, 10)
	);
}

function isNumberOrNullArray(v: unknown): v is Array<number | null> {
	return Array.isArray(v) && v.every((x) => x === null || typeof x === "number");
}

// Validate a cached jsonb payload back into an HourlyBlock; anything
// malformed is treated as a missing cache row.
function parseHourlyBlock(value: unknown): HourlyBlock | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const b = value as Record<string, unknown>;
	if (!Array.isArray(b.time) || !b.time.every((t) => typeof t === "string")) {
		return null;
	}
	if (
		!isNumberOrNullArray(b.temperature_2m) ||
		!isNumberOrNullArray(b.dew_point_2m) ||
		!isNumberOrNullArray(b.cloud_cover_low) ||
		!isNumberOrNullArray(b.cloud_cover_mid) ||
		!isNumberOrNullArray(b.cloud_cover_high)
	) {
		return null;
	}
	return value as HourlyBlock;
}

// Open-Meteo emits naive ISO timestamps (no `Z`) but they are UTC when we
// ask for `timezone=UTC`. Append the suffix so `Date.parse` reads them as
// UTC instead of as local time.
function parseHourly(t: string): number {
	return Date.parse(`${t}Z`);
}

function nearestHourIndex(times: string[], targetIso: string): number | null {
	const target = Date.parse(targetIso);
	if (Number.isNaN(target)) return null;
	let bestIdx = -1;
	let bestDiff = Infinity;
	for (let i = 0; i < times.length; i++) {
		const diff = Math.abs(parseHourly(times[i]) - target);
		if (diff < bestDiff) {
			bestDiff = diff;
			bestIdx = i;
		}
	}
	// Only accept matches within an hour: anything further means the target
	// falls outside the returned forecast window.
	if (bestIdx === -1 || bestDiff > 60 * 60 * 1000) return null;
	return bestIdx;
}

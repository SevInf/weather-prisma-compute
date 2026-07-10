// Read-through cache over an upstream ForecastSource; hourly blocks are cached
// until the covering model's next run.

import {
	ForecastCacheWriteError,
	forecastCacheRepository,
	type ForecastCacheRepository,
	type ForecastCacheRow,
	type ForecastCacheWrite,
} from "@/repositories/forecast-cache-repository";
import { openMeteoForecastRepository } from "@/repositories/open-meteo-forecast-repository";
import type {
	ForecastPoint,
	ForecastSource,
	HourlyBlock,
	PoiId,
} from "./forecast-source";
import {
	coveringModel,
	GRACE_MS,
	modelClock,
	type IconModel,
	type ModelRunClock,
	type ModelStaleness,
} from "./model-clock";

type StaleAtByModel = Map<IconModel, ModelStaleness | null>;

type FreshnessPartition = {
	fresh: Map<PoiId, HourlyBlock>;
	expired: Map<PoiId, HourlyBlock>;
	toRefresh: ForecastPoint[];
};

type RefreshTriage = {
	graceServed: Set<PoiId>;
	toFetch: ForecastPoint[];
};

type ServingAssembly = {
	served: Map<PoiId, HourlyBlock>;
	expiredFallback: number;
};

type DecisionStats = {
	total: number;
	fresh: number;
	refreshed: number;
	graceServed: number;
	expiredFallback: number;
	unavailable: number;
	dbHealthy: boolean;
};

export class CachedForecastSource implements ForecastSource {
	#cache: ForecastCacheRepository;
	#upstream: ForecastSource;
	#clock: ModelRunClock;

	constructor(
		cache: ForecastCacheRepository,
		upstream: ForecastSource,
		clock: ModelRunClock,
	) {
		this.#cache = cache;
		this.#upstream = upstream;
		this.#clock = clock;
	}

	/** Fresh row (`now < staleAt` AND fetched today UTC) serves without upstream fetch.
	 * DB failure → direct fetch; upstream failure → expired rows; missing entry = unavailable. */
	async hourlyBlocks(points: ForecastPoint[]): Promise<Map<PoiId, HourlyBlock> | null> {
		if (points.length === 0) return new Map();
		const now = new Date();

		const rows = await this.#readCache(points.map((p) => p.id));
		const { fresh, expired, toRefresh } = partitionByFreshness(points, rows ?? [], now);

		const modelByPoi = attributeModels(toRefresh);
		const staleAtByModel: StaleAtByModel = toRefresh.length
			? await this.#clock.nextStaleAt(modelByPoi.values())
			: new Map();
		const { graceServed, toFetch } = triageRefresh(toRefresh, modelByPoi, staleAtByModel, expired);

		const fetched = toFetch.length ? await this.#upstream.hourlyBlocks(toFetch) : null;
		if (rows && fetched?.size) {
			await this.#persistWrites(planCacheWrites(toFetch, fetched, modelByPoi, staleAtByModel, now));
		}
		if (rows && graceServed.size) {
			await this.#extendGrace([...graceServed], new Date(now.getTime() + GRACE_MS));
		}

		const { served, expiredFallback } = assembleServing(points, fresh, fetched, expired, graceServed);
		console.log(formatDecisionLine({
			total: points.length, fresh: fresh.size, refreshed: fetched?.size ?? 0,
			graceServed: graceServed.size, expiredFallback,
			unavailable: points.length - served.size, dbHealthy: rows !== null,
		}));
		return served;
	}

	async #readCache(ids: PoiId[]): Promise<ForecastCacheRow[] | null> {
		try {
			return await this.#cache.findByPoiIds(ids);
		} catch (err) {
			console.warn("forecast cache read failed, using direct fetch:", err);
			return null;
		}
	}

	async #persistWrites(writes: ForecastCacheWrite[]): Promise<void> {
		try {
			await this.#cache.upsertMany(writes);
		} catch (err) {
			const failed =
				err instanceof ForecastCacheWriteError ? err.failedCount : writes.length;
			console.warn(`forecast cache: ${failed} upsert(s) failed, serving uncached`);
		}
	}

	async #extendGrace(poiIds: PoiId[], until: Date): Promise<void> {
		try {
			await this.#cache.extendStaleAt(poiIds, until);
		} catch (err) {
			console.warn("forecast cache: grace extension failed:", err);
		}
	}
}

function partitionByFreshness(
	points: ForecastPoint[],
	rows: ForecastCacheRow[],
	now: Date,
): FreshnessPartition {
	const rowById = new Map<PoiId, ForecastCacheRow>();
	for (const row of rows) rowById.set(row.poiId, row);

	const fresh = new Map<PoiId, HourlyBlock>();
	const expired = new Map<PoiId, HourlyBlock>();
	for (const p of points) {
		const row = rowById.get(p.id);
		if (!row) continue;
		const hourly = parseHourlyBlock(row.hourly);
		if (!hourly) continue;
		(isFresh(row, now) ? fresh : expired).set(p.id, hourly);
	}
	return { fresh, expired, toRefresh: points.filter((p) => !fresh.has(p.id)) };
}

function attributeModels(toRefresh: ForecastPoint[]): Map<PoiId, IconModel> {
	const modelByPoi = new Map<PoiId, IconModel>();
	for (const p of toRefresh) {
		modelByPoi.set(p.id, coveringModel(p.latitude, p.longitude));
	}
	return modelByPoi;
}

// Meta null or grace-extended = no new run: expired rows serve under grace (no refetch); rowless POIs still fetch.
function triageRefresh(
	toRefresh: ForecastPoint[],
	modelByPoi: Map<PoiId, IconModel>,
	staleAtByModel: StaleAtByModel,
	expired: Map<PoiId, HourlyBlock>,
): RefreshTriage {
	const graceServed = new Set<PoiId>();
	const toFetch: ForecastPoint[] = [];
	for (const p of toRefresh) {
		const model = modelByPoi.get(p.id);
		const staleness = model != null ? (staleAtByModel.get(model) ?? null) : null;
		const newRunAvailable = staleness != null && !staleness.graceExtended;
		if (!newRunAvailable && expired.has(p.id)) {
			graceServed.add(p.id);
		} else {
			toFetch.push(p);
		}
	}
	return { graceServed, toFetch };
}

function planCacheWrites(
	toFetch: ForecastPoint[],
	fetched: Map<PoiId, HourlyBlock>,
	modelByPoi: Map<PoiId, IconModel>,
	staleAtByModel: StaleAtByModel,
	now: Date,
): ForecastCacheWrite[] {
	const grace = new Date(now.getTime() + GRACE_MS);
	return toFetch.flatMap((p) => {
		const hourly = fetched.get(p.id);
		const model = modelByPoi.get(p.id);
		if (!hourly || !model) return [];
		return [
			{
				poiId: p.id,
				model,
				hourly,
				fetchedAt: now,
				staleAt: staleAtByModel.get(model)?.staleAt ?? grace,
			},
		];
	});
}

// Best source first: fresh cache → fresh fetch → expired row.
function assembleServing(
	points: ForecastPoint[],
	fresh: Map<PoiId, HourlyBlock>,
	fetched: Map<PoiId, HourlyBlock> | null,
	expired: Map<PoiId, HourlyBlock>,
	graceServed: Set<PoiId>,
): ServingAssembly {
	const served = new Map<PoiId, HourlyBlock>();
	let expiredFallback = 0;
	for (const p of points) {
		const hourly = fresh.get(p.id) ?? fetched?.get(p.id) ?? expired.get(p.id);
		if (!hourly) continue;
		if (!fresh.has(p.id) && !fetched?.has(p.id) && !graceServed.has(p.id)) {
			expiredFallback++;
		}
		served.set(p.id, hourly);
	}
	return { served, expiredFallback };
}

// One decision line per request cycle.
function formatDecisionLine(s: DecisionStats): string {
	if (s.fresh === s.total) return `forecast cache: all ${s.total} fresh`;
	const parts = [`refreshed ${s.refreshed} of ${s.total} POIs`];
	if (s.fresh > 0) parts.push(`${s.fresh} fresh`);
	if (s.graceServed > 0) parts.push(`${s.graceServed} grace-served (no new run)`);
	if (s.expiredFallback > 0) {
		parts.push(`${s.expiredFallback} expired served (upstream failed)`);
	}
	if (s.unavailable > 0) parts.push(`${s.unavailable} unavailable`);
	if (!s.dbHealthy) parts.push("db unavailable, direct fetch");
	return `forecast cache: ${parts.join(", ")}`;
}

// Same-UTC-day rule: yesterday's 2-day forecast window may miss tomorrow's sunrise.
function isFresh(row: ForecastCacheRow, now: Date): boolean {
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

// Malformed cached payload = missing row.
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

export const cachedForecastSource: ForecastSource = new CachedForecastSource(
	forecastCacheRepository,
	openMeteoForecastRepository,
	modelClock,
);

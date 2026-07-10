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
} from "./forecast-source";
import {
	coveringModel,
	GRACE_MS,
	modelClock,
	type IconModel,
	type ModelRunClock,
	type ModelStaleness,
} from "./model-clock";

export class CachedForecastSource implements ForecastSource {
	constructor(
		private readonly cache: ForecastCacheRepository,
		private readonly upstream: ForecastSource,
		private readonly clock: ModelRunClock,
	) {}

	/** Fresh row (`now < staleAt` AND fetched today UTC) serves without upstream fetch.
	 * DB failure → direct fetch; upstream failure → expired rows; missing entry = unavailable. */
	async hourlyBlocks(
		points: ForecastPoint[],
	): Promise<Map<number, HourlyBlock> | null> {
		const out = new Map<number, HourlyBlock>();
		if (points.length === 0) return out;
		const now = new Date();

		let rows: ForecastCacheRow[] | null;
		try {
			rows = await this.cache.findByPoiIds(points.map((p) => p.id));
		} catch (err) {
			console.warn("forecast cache read failed, using direct fetch:", err);
			rows = null;
		}
		const dbHealthy = rows !== null;
		const rowById = new Map<number, ForecastCacheRow>();
		for (const row of rows ?? []) rowById.set(row.poiId, row);

		const cachedFresh = new Map<number, HourlyBlock>();
		const cachedExpired = new Map<number, HourlyBlock>();
		for (const p of points) {
			const row = rowById.get(p.id);
			if (!row) continue;
			const hourly = parseHourlyBlock(row.hourly);
			if (!hourly) continue;
			(isFresh(row, now) ? cachedFresh : cachedExpired).set(p.id, hourly);
		}
		const toRefresh = points.filter((p) => !cachedFresh.has(p.id));

		const modelByPoi = new Map<number, IconModel>();
		let staleAtByModel = new Map<IconModel, ModelStaleness | null>();
		if (toRefresh.length > 0) {
			for (const p of toRefresh) {
				modelByPoi.set(p.id, coveringModel(p.latitude, p.longitude));
			}
			staleAtByModel = await this.clock.nextStaleAt(modelByPoi.values());
		}

		// Meta null or grace-extended = no new run: expired rows serve under grace (no refetch); rowless POIs still fetch.
		const graceServed = new Set<number>();
		const toFetch: ForecastPoint[] = [];
		for (const p of toRefresh) {
			const model = modelByPoi.get(p.id);
			const staleness = model != null ? (staleAtByModel.get(model) ?? null) : null;
			const newRunAvailable = staleness != null && !staleness.graceExtended;
			if (!newRunAvailable && cachedExpired.has(p.id)) {
				graceServed.add(p.id);
			} else {
				toFetch.push(p);
			}
		}

		const fetched =
			toFetch.length > 0 ? await this.upstream.hourlyBlocks(toFetch) : null;

		if (dbHealthy && fetched && fetched.size > 0) {
			const grace = new Date(now.getTime() + GRACE_MS);
			const writes = toFetch.flatMap<ForecastCacheWrite>((p) => {
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
			try {
				await this.cache.upsertMany(writes);
			} catch (err) {
				const failed =
					err instanceof ForecastCacheWriteError
						? err.failedCount
						: writes.length;
				console.warn(`forecast cache: ${failed} upsert(s) failed, serving uncached`);
			}
		}
		if (dbHealthy && graceServed.size > 0) {
			try {
				await this.cache.extendStaleAt(
					[...graceServed],
					new Date(now.getTime() + GRACE_MS),
				);
			} catch (err) {
				console.warn("forecast cache: grace extension failed:", err);
			}
		}

		// Best source first: fresh cache → fresh fetch → expired row.
		let expiredFallback = 0;
		for (const p of points) {
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
			out.set(p.id, hourly);
		}

		// One decision line per request cycle.
		const n = points.length;
		if (cachedFresh.size === n) {
			console.log(`forecast cache: all ${n} fresh`);
		} else {
			const parts = [`refreshed ${fetched?.size ?? 0} of ${n} POIs`];
			if (cachedFresh.size > 0) parts.push(`${cachedFresh.size} fresh`);
			if (graceServed.size > 0) {
				parts.push(`${graceServed.size} grace-served (no new run)`);
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

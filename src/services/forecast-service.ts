import {
	ForecastCacheWriteError,
	type ForecastCacheRepository,
	type ForecastCacheRow,
	type ForecastCacheWrite,
} from "@/repositories/forecast/forecast-cache-repository";
import type {
	ForecastPoint,
	ForecastRepository,
	HourlyBlock,
} from "@/repositories/forecast/forecast-repository";
import type { PoiId } from "@/repositories/poi/poi-repository";
import type { IconModel } from "@/repositories/model-meta/model-meta-repository";
import type { ModelRunClock, ModelStaleness } from "./model-clock";

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

export interface ForecastProvider {
	hourlyBlocks(points: ForecastPoint[]): Promise<Map<PoiId, HourlyBlock> | null>;
}

export class ForecastService implements ForecastProvider {
	#cache: ForecastCacheRepository;
	#upstream: ForecastRepository;
	#clock: ModelRunClock;

	constructor(
		cache: ForecastCacheRepository,
		upstream: ForecastRepository,
		clock: ModelRunClock,
	) {
		this.#cache = cache;
		this.#upstream = upstream;
		this.#clock = clock;
	}

	async hourlyBlocks(points: ForecastPoint[]): Promise<Map<PoiId, HourlyBlock> | null> {
		if (points.length === 0) return new Map();
		const now = new Date();

		const rows = await this.#readCache(points.map((p) => p.id));
		const modelByPoi = attributeModels(points, this.#clock);
		const staleAtByModel = await this.#clock.nextStaleAt(modelByPoi.values());
		const { fresh, expired, toRefresh } = partitionByFreshness(
			points,
			rows ?? [],
			modelByPoi,
			staleAtByModel,
			now,
		);
		const { graceServed, toFetch } = triageRefresh(toRefresh, modelByPoi, staleAtByModel, expired);

		const fetched = toFetch.length ? await this.#upstream.hourlyBlocks(toFetch) : null;
		if (rows && fetched?.size) {
			await this.#persistWrites(planCacheWrites(toFetch, fetched, modelByPoi, now));
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
}

function partitionByFreshness(
	points: ForecastPoint[],
	rows: ForecastCacheRow[],
	modelByPoi: Map<PoiId, IconModel>,
	staleAtByModel: StaleAtByModel,
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
		const model = modelByPoi.get(p.id);
		const staleness = model != null ? (staleAtByModel.get(model) ?? null) : null;
		(isFresh(row, staleness, now) ? fresh : expired).set(p.id, hourly);
	}
	return { fresh, expired, toRefresh: points.filter((p) => !fresh.has(p.id)) };
}

function attributeModels(
	points: ForecastPoint[],
	clock: ModelRunClock,
): Map<PoiId, IconModel> {
	const modelByPoi = new Map<PoiId, IconModel>();
	for (const point of points) modelByPoi.set(point.id, clock.modelFor(point));
	return modelByPoi;
}

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
	now: Date,
): ForecastCacheWrite[] {
	return toFetch.flatMap((p) => {
		const hourly = fetched.get(p.id);
		const model = modelByPoi.get(p.id);
		if (!hourly || !model) return [];
		return [{ poiId: p.id, model, hourly, fetchedAt: now }];
	});
}

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

function isFresh(
	row: ForecastCacheRow,
	staleness: ModelStaleness | null,
	now: Date,
): boolean {
	if (!staleness || staleness.graceExtended) return false;
	if (now.getTime() >= staleness.staleAt.getTime()) return false;
	const fetchedMs = row.fetchedAt.getTime();
	if (!Number.isFinite(fetchedMs)) return false;
	if (fetchedMs < staleness.availableAt.getTime()) return false;
	return (
		new Date(fetchedMs).toISOString().slice(0, 10) ===
		now.toISOString().slice(0, 10)
	);
}

function isNumberOrNullArray(v: unknown): v is Array<number | null> {
	return Array.isArray(v) && v.every((x) => x === null || typeof x === "number");
}

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

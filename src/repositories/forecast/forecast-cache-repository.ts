import { db } from "@/prisma/db";
import { poiId, type HourlyBlock, type PoiId } from "./forecast-repository";
import type { IconModel } from "../model-meta/model-meta-repository";

// PoiForecast row as the ORM returns it: timestamptz decodes to `Date`, not string.
export type ForecastCacheRow = {
	poiId: PoiId;
	model: IconModel;
	hourly: unknown;
	fetchedAt: Date;
};

export type ForecastCacheWrite = {
	poiId: PoiId;
	model: IconModel;
	hourly: HourlyBlock;
	fetchedAt: Date;
};

export class ForecastCacheWriteError extends Error {
	constructor(readonly failedCount: number) {
		super(`${failedCount} forecast cache upsert(s) failed`);
	}
}

export interface ForecastCacheRepository {
	findByPoiIds(ids: PoiId[]): Promise<ForecastCacheRow[]>;
	upsertMany(rows: ForecastCacheWrite[]): Promise<void>;
}

export class PrismaForecastCacheRepository implements ForecastCacheRepository {
	async findByPoiIds(ids: PoiId[]): Promise<ForecastCacheRow[]> {
		const rows = await db.orm.public.PoiForecast.where((f) =>
			f.poiId.in(ids),
		).all();
		return rows.map((r) => ({ ...r, poiId: poiId(r.poiId) }));
	}

	async upsertMany(rows: ForecastCacheWrite[]): Promise<void> {
		const results = await Promise.allSettled(
			rows.map(({ poiId, ...patch }) =>
				db.orm.public.PoiForecast.upsert({
					create: { poiId, ...patch },
					update: patch,
				}),
			),
		);
		const failed = results.filter((r) => r.status === "rejected").length;
		if (failed > 0) throw new ForecastCacheWriteError(failed);
	}
}

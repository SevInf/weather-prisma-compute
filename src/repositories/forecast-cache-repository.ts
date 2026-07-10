import { db } from "@/prisma/db";
import type { HourlyBlock } from "@/services/forecast-source";

// PoiForecast row as the ORM returns it: timestamptz decodes to `Date`, not string.
export type ForecastCacheRow = {
	poiId: number;
	model: string;
	hourly: unknown;
	fetchedAt: Date;
	staleAt: Date;
};

export type ForecastCacheWrite = {
	poiId: number;
	model: string;
	hourly: HourlyBlock;
	fetchedAt: Date;
	staleAt: Date;
};

export class ForecastCacheWriteError extends Error {
	constructor(readonly failedCount: number) {
		super(`${failedCount} forecast cache upsert(s) failed`);
	}
}

export interface ForecastCacheRepository {
	findByPoiIds(ids: number[]): Promise<ForecastCacheRow[]>;
	upsertMany(rows: ForecastCacheWrite[]): Promise<void>;
	extendStaleAt(poiIds: number[], until: Date): Promise<void>;
}

export class PrismaForecastCacheRepository implements ForecastCacheRepository {
	async findByPoiIds(ids: number[]): Promise<ForecastCacheRow[]> {
		return await db.orm.public.PoiForecast.where((f) => f.poiId.in(ids)).all();
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

	async extendStaleAt(poiIds: number[], until: Date): Promise<void> {
		await db.orm.public.PoiForecast.where((f) => f.poiId.in(poiIds)).update({
			staleAt: until,
		});
	}
}

export const forecastCacheRepository: ForecastCacheRepository =
	new PrismaForecastCacheRepository();

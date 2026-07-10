import { db } from "@/prisma/db";
import type { IconModel } from "@/services/model-clock";

export type ModelRunRow = {
	model: IconModel;
	availableAt: Date;
	updateIntervalSeconds: number;
	checkedAt: Date;
};

export interface ModelRunRepository {
	findByModels(models: IconModel[]): Promise<ModelRunRow[]>;
	upsertMany(rows: ModelRunRow[]): Promise<void>;
}

export class PrismaModelRunRepository implements ModelRunRepository {
	async findByModels(models: IconModel[]): Promise<ModelRunRow[]> {
		return await db.orm.public.ModelRun.where((r) => r.model.in(models)).all();
	}

	async upsertMany(rows: ModelRunRow[]): Promise<void> {
		await Promise.all(
			rows.map(({ model, ...patch }) =>
				db.orm.public.ModelRun.upsert({
					create: { model, ...patch },
					update: patch,
				}),
			),
		);
	}
}

export const modelRunRepository: ModelRunRepository =
	new PrismaModelRunRepository();

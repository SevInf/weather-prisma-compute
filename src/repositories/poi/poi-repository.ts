import { db } from "@/prisma/db";

export type Poi = {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
};

export type CreatePoi = {
	name: string;
	latitude: number;
	longitude: number;
};

export interface PoiRepository {
	listByOwner(userId: string): Promise<Poi[]>;
	createForOwner(userId: string, input: CreatePoi): Promise<Poi>;
	deleteByOwner(id: number, userId: string): Promise<boolean>;
}

export class PrismaPoiRepository implements PoiRepository {
	async listByOwner(userId: string): Promise<Poi[]> {
		return await db.orm.public.Poi.select(
			"id",
			"name",
			"latitude",
			"longitude",
		)
			.where({ userId })
			.orderBy((p) => p.id.desc())
			.all();
	}

	async createForOwner(userId: string, input: CreatePoi): Promise<Poi> {
		return await db.orm.public.Poi.select(
			"id",
			"name",
			"latitude",
			"longitude",
		).create({ ...input, userId });
	}

	async deleteByOwner(id: number, userId: string): Promise<boolean> {
		const deleted = await db.orm.public.Poi.where({ id, userId }).delete();
		return deleted !== null;
	}
}

import { db } from "@/prisma/db";
import type { UserId } from "@/repositories/auth/auth-identifiers";

declare const poiIdBrand: unique symbol;
export type PoiId = number & { readonly [poiIdBrand]: true };

export function poiId(id: number): PoiId {
	return id as PoiId;
}

export type Poi = {
	id: PoiId;
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
	listByOwner(userId: UserId): Promise<Poi[]>;
	createForOwner(userId: UserId, input: CreatePoi): Promise<Poi>;
	deleteByOwner(id: PoiId, userId: UserId): Promise<boolean>;
}

export class PrismaPoiRepository implements PoiRepository {
	async listByOwner(userId: UserId): Promise<Poi[]> {
		const rows = await db.orm.public.Poi.select(
			"id",
			"name",
			"latitude",
			"longitude",
		)
			.where({ userId })
			.orderBy((p) => p.id.desc())
			.all();
	return rows.map((row) => ({ ...row, id: poiId(row.id) }));
}

	async createForOwner(userId: UserId, input: CreatePoi): Promise<Poi> {
		const row = await db.orm.public.Poi.select(
			"id",
			"name",
			"latitude",
			"longitude",
		).create({ ...input, userId });
		return { ...row, id: poiId(row.id) };
	}

	async deleteByOwner(id: PoiId, userId: UserId): Promise<boolean> {
		const deleted = await db.orm.public.Poi.where({ id, userId }).delete();
		return deleted !== null;
	}
}

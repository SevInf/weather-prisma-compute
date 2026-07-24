import { db } from "@/prisma/db";

declare const userIdBrand: unique symbol;
export type UserId = string & { readonly [userIdBrand]: true };

export function userId(id: string): UserId {
	return id as UserId;
}

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
	listByOwner(userId: UserId): Promise<Poi[]>;
	createForOwner(userId: UserId, input: CreatePoi): Promise<Poi>;
	deleteByOwner(id: number, userId: UserId): Promise<boolean>;
}

export class PrismaPoiRepository implements PoiRepository {
	async listByOwner(userId: UserId): Promise<Poi[]> {
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

	async createForOwner(userId: UserId, input: CreatePoi): Promise<Poi> {
		return await db.orm.public.Poi.select(
			"id",
			"name",
			"latitude",
			"longitude",
		).create({ ...input, userId });
	}

	async deleteByOwner(id: number, userId: UserId): Promise<boolean> {
		const deleted = await db.orm.public.Poi.where({ id, userId }).delete();
		return deleted !== null;
	}
}

import type {
	CreatePoi,
	Poi,
	PoiRepository,
	UserId,
} from "@/repositories/poi/poi-repository";

export class PoiService {
	constructor(private readonly repository: PoiRepository) {}

	async list(userId: UserId): Promise<Poi[]> {
		return await this.repository.listByOwner(userId);
	}

	async create(userId: UserId, input: CreatePoi): Promise<Poi> {
		return await this.repository.createForOwner(userId, input);
	}

	async delete(id: number, userId: UserId): Promise<boolean> {
		return await this.repository.deleteByOwner(id, userId);
	}
}

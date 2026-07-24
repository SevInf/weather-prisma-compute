import type {
	CreatePoi,
	Poi,
	PoiId,
	PoiRepository,
} from "@/repositories/poi/poi-repository";
import type { UserId } from "@/repositories/auth/auth-identifiers";

export class PoiService {
	constructor(private readonly repository: PoiRepository) {}

	async list(userId: UserId): Promise<Poi[]> {
		return await this.repository.listByOwner(userId);
	}

	async create(userId: UserId, input: CreatePoi): Promise<Poi> {
		return await this.repository.createForOwner(userId, input);
	}

	async delete(id: PoiId, userId: UserId): Promise<boolean> {
		return await this.repository.deleteByOwner(id, userId);
	}
}

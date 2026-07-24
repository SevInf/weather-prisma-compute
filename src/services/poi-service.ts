import type {
	CreatePoi,
	Poi,
	PoiRepository,
} from "@/repositories/poi/poi-repository";

export class PoiService {
	constructor(private readonly repository: PoiRepository) {}

	async list(userId: string): Promise<Poi[]> {
		return await this.repository.listByOwner(userId);
	}

	async create(userId: string, input: CreatePoi): Promise<Poi> {
		return await this.repository.createForOwner(userId, input);
	}

	async delete(id: number, userId: string): Promise<boolean> {
		return await this.repository.deleteByOwner(id, userId);
	}
}

import type {
	ModelRunRepository,
	ModelRunRow,
} from "../model-run/model-run-repository";
import {
	GRACE_MS,
	type IconModel,
	type ModelMeta,
	type ModelMetaRepository,
} from "./model-meta-repository";

function isCurrent(row: ModelRunRow, now: Date): boolean {
	const runFreshUntil =
		row.availableAt.getTime() + row.updateIntervalSeconds * 1000;
	return (
		runFreshUntil > now.getTime() ||
		now.getTime() - row.checkedAt.getTime() < GRACE_MS
	);
}

function toMeta(row: ModelRunRow): ModelMeta {
	return {
		availableAt: row.availableAt,
		updateIntervalSeconds: row.updateIntervalSeconds,
	};
}

export class ModelMetaCacheRepository implements ModelMetaRepository {
	#runs: ModelRunRepository;
	#upstream: ModelMetaRepository;

	constructor(runs: ModelRunRepository, upstream: ModelMetaRepository) {
		this.#runs = runs;
		this.#upstream = upstream;
	}

	async fetchMeta(model: IconModel): Promise<ModelMeta | null> {
		const now = new Date();
		const row = await this.#readRow(model);
		if (row && isCurrent(row, now)) return toMeta(row);

		const fetched = await this.#upstream.fetchMeta(model);
		if (fetched) {
			await this.#persist({ model, ...fetched, checkedAt: now });
			return fetched;
		}
		if (row) {
			await this.#persist({ ...row, checkedAt: now });
			return toMeta(row);
		}
		return null;
	}

	async #readRow(model: IconModel): Promise<ModelRunRow | null> {
		try {
			return (await this.#runs.findByModels([model]))[0] ?? null;
		} catch (err) {
			console.warn("model run cache read failed, consulting upstream:", err);
			return null;
		}
	}

	async #persist(row: ModelRunRow): Promise<void> {
		try {
			await this.#runs.upsertMany([row]);
		} catch (err) {
			console.warn("model run cache write failed:", err);
		}
	}
}

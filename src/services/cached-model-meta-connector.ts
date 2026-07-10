// Read-through clock cache: ModelRun rows serve meta until the run window
// closes; upstream consults throttle to ~1 per grace window when a run is late.

import {
	modelRunRepository,
	type ModelRunRepository,
	type ModelRunRow,
} from "@/repositories/model-run-repository";
import { openMeteoModelMetaRepository } from "@/repositories/open-meteo-model-meta-repository";
import type { IconModel } from "./model-clock";
import {
	GRACE_MS,
	type ModelMeta,
	type ModelMetaConnector,
} from "./model-meta-connector";

// Current while the run window is open OR a consult happened within GRACE_MS.
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

export class CachedModelMetaConnector implements ModelMetaConnector {
	#runs: ModelRunRepository;
	#upstream: ModelMetaConnector;

	constructor(runs: ModelRunRepository, upstream: ModelMetaConnector) {
		this.#runs = runs;
		this.#upstream = upstream;
	}

	/** Upstream failure with a row present → stale row's meta; rowless → null. */
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
			// Bump checkedAt so outage consults also throttle to ~1 per GRACE_MS.
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

export const cachedModelMetaConnector: ModelMetaConnector =
	new CachedModelMetaConnector(modelRunRepository, openMeteoModelMetaRepository);

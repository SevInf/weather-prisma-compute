import type {
	IconModel,
	ModelMeta,
	ModelMetaRepository,
} from "./model-meta-repository";

const OPEN_METEO_DATA_URL = "https://api.open-meteo.com/data";

// Epoch seconds.
type WireMeta = {
	last_run_availability_time: number;
	update_interval_seconds: number;
};

export class OpenMeteoModelMetaRepository implements ModelMetaRepository {
	#baseUrl: string;

	constructor(baseUrl: string = OPEN_METEO_DATA_URL) {
		this.#baseUrl = baseUrl;
	}

	async fetchMeta(model: IconModel): Promise<ModelMeta | null> {
		let meta: WireMeta;
		try {
			const res = await fetch(`${this.#baseUrl}/${model}/static/meta.json`, {
				// A cached meta.json would hide newly published runs.
				cache: "no-store",
			});
			if (!res.ok) {
				console.warn(`Open-Meteo meta for ${model} returned ${res.status}`);
				return null;
			}
			meta = (await res.json()) as WireMeta;
		} catch (err) {
			console.warn(`Open-Meteo meta fetch for ${model} failed:`, err);
			return null;
		}

		const availability = meta.last_run_availability_time;
		const interval = meta.update_interval_seconds;
		if (!Number.isFinite(availability) || !Number.isFinite(interval)) {
			console.warn(`Open-Meteo meta for ${model} has unexpected shape`);
			return null;
		}
		return {
			availableAt: new Date(availability * 1000),
			updateIntervalSeconds: interval,
		};
	}
}

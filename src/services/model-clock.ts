// Covering-model attribution + next-run clock for DWD ICON. BBOX/cadence source:
// https://api.open-meteo.com/data/{dwd_icon_d2,dwd_icon_eu,dwd_icon}/static/meta.json

const OPEN_METEO_DATA_URL = "https://api.open-meteo.com/data";

export type IconModel = "dwd_icon_d2" | "dwd_icon_eu" | "dwd_icon";

type ModelBbox = {
	latMin: number;
	latMax: number;
	lonMin: number;
	lonMax: number;
};

// Domain BBOXes transcribed from each model's meta.json `crs_wkt`
// `BBOX[latMin, lonMin, latMax, lonMax]` (fetched 2026-07-10):
//   https://api.open-meteo.com/data/dwd_icon_d2/static/meta.json → BBOX[43.18, -3.94, 58.08, 20.34] (~2 km)
//   https://api.open-meteo.com/data/dwd_icon_eu/static/meta.json → BBOX[29.5, -23.5, 70.5, 62.5] (~7 km)
//   https://api.open-meteo.com/data/dwd_icon/static/meta.json → global (~11 km; fallback in coveringModel)
// Highest resolution first; first containing BBOX wins (icon_seamless order).
const MODEL_DOMAINS: ReadonlyArray<{ model: IconModel; bbox: ModelBbox }> = [
	{
		model: "dwd_icon_d2",
		bbox: { latMin: 43.18, latMax: 58.08, lonMin: -3.94, lonMax: 20.34 },
	},
	{
		model: "dwd_icon_eu",
		bbox: { latMin: 29.5, latMax: 70.5, lonMin: -23.5, lonMax: 62.5 },
	},
];

// Re-check window when a run is late or its meta is unknown.
export const GRACE_MS = 10 * 60 * 1000;

/** `graceExtended`: the run is late and `staleAt` is only a re-check window —
 * extend existing data rather than refetch; fetch only when rowless. */
export type ModelStaleness = {
	staleAt: Date;
	graceExtended: boolean;
};

// Epoch seconds.
type ModelMeta = {
	last_run_availability_time: number;
	update_interval_seconds: number;
};

/** Covering model, seamless preference order: D2 → EU → global. Pure geometry. */
export function coveringModel(latitude: number, longitude: number): IconModel {
	for (const { model, bbox } of MODEL_DOMAINS) {
		if (
			latitude >= bbox.latMin &&
			latitude <= bbox.latMax &&
			longitude >= bbox.lonMin &&
			longitude <= bbox.lonMax
		) {
			return model;
		}
	}
	return "dwd_icon";
}

export interface ModelRunClock {
	nextStaleAt(
		models: Iterable<IconModel>,
	): Promise<Map<IconModel, ModelStaleness | null>>;
}

/** Per-model run clock; one meta fetch per unique model (≤ 3 per cycle). */
export class ModelClock implements ModelRunClock {
	#baseUrl: string;

	constructor(baseUrl: string = OPEN_METEO_DATA_URL) {
		this.#baseUrl = baseUrl;
	}

	/** Late run → grace-marked `now + ~10 min`; meta failure → `null` ("unknown",
	 * treat as grace) — never a throw. */
	async nextStaleAt(
		models: Iterable<IconModel>,
	): Promise<Map<IconModel, ModelStaleness | null>> {
		const unique = [...new Set(models)];
		const out = new Map<IconModel, ModelStaleness | null>();
		const results = await Promise.all(
			unique.map(async (model) => ({
				model,
				staleness: await this.#fetchStaleAt(model),
			})),
		);
		for (const { model, staleness } of results) {
			out.set(model, staleness);
		}
		return out;
	}

	async #fetchStaleAt(model: IconModel): Promise<ModelStaleness | null> {
		let meta: ModelMeta;
		try {
			const res = await fetch(`${this.#baseUrl}/${model}/static/meta.json`, {
				// A cached meta.json would hide newly published runs.
				cache: "no-store",
			});
			if (!res.ok) {
				console.warn(`Open-Meteo meta for ${model} returned ${res.status}`);
				return null;
			}
			meta = (await res.json()) as ModelMeta;
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

		const staleAtMs = (availability + interval) * 1000;
		const now = Date.now();
		if (staleAtMs <= now) {
			return { staleAt: new Date(now + GRACE_MS), graceExtended: true };
		}
		return { staleAt: new Date(staleAtMs), graceExtended: false };
	}
}

export const modelClock: ModelRunClock = new ModelClock();

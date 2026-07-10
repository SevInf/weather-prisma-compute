// Covering-model attribution + next-run clock for DWD ICON. BBOX/cadence source:
// https://api.open-meteo.com/data/{dwd_icon_d2,dwd_icon_eu,dwd_icon}/static/meta.json

import { cachedModelMetaConnector } from "./cached-model-meta-connector";
import {
	GRACE_MS,
	type ModelMeta,
	type ModelMetaConnector,
} from "./model-meta-connector";

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

/** `graceExtended`: the run is late and `staleAt` is only a re-check window —
 * extend existing data rather than refetch; fetch only when rowless. */
export type ModelStaleness = {
	staleAt: Date;
	graceExtended: boolean;
	availableAt: Date;
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

/** Per-model run clock; one connector consult per unique model (≤ 3 per cycle). */
export class ModelClock implements ModelRunClock {
	#meta: ModelMetaConnector;

	constructor(meta: ModelMetaConnector) {
		this.#meta = meta;
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
				meta: await this.#meta.fetchMeta(model),
			})),
		);
		const nowMs = Date.now();
		for (const { model, meta } of results) {
			out.set(model, meta ? deriveStaleness(meta, nowMs) : null);
		}
		return out;
	}
}

function deriveStaleness(meta: ModelMeta, nowMs: number): ModelStaleness {
	const staleAtMs =
		meta.availableAt.getTime() + meta.updateIntervalSeconds * 1000;
	if (staleAtMs <= nowMs) {
		return {
			staleAt: new Date(nowMs + GRACE_MS),
			graceExtended: true,
			availableAt: meta.availableAt,
		};
	}
	return {
		staleAt: new Date(staleAtMs),
		graceExtended: false,
		availableAt: meta.availableAt,
	};
}

export const modelClock: ModelRunClock = new ModelClock(cachedModelMetaConnector);

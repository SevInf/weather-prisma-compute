import type { ForecastPoint } from "@/repositories/forecast/forecast-repository";
import {
	GRACE_MS,
	type IconModel,
	type ModelMeta,
	type ModelMetaRepository,
} from "@/repositories/model-meta/model-meta-repository";

export type { IconModel } from "@/repositories/model-meta/model-meta-repository";

type ModelBbox = {
	latMin: number;
	latMax: number;
	lonMin: number;
	lonMax: number;
};

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

export type ModelStaleness = {
	staleAt: Date;
	graceExtended: boolean;
	availableAt: Date;
};

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
	modelFor(point: ForecastPoint): IconModel;
	nextStaleAt(
		models: Iterable<IconModel>,
	): Promise<Map<IconModel, ModelStaleness | null>>;
}

export class ModelClock implements ModelRunClock {
	#meta: ModelMetaRepository;

	constructor(meta: ModelMetaRepository) {
		this.#meta = meta;
	}

	modelFor(point: ForecastPoint): IconModel {
		return coveringModel(point.latitude, point.longitude);
	}

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

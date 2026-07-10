// ModelClock — attributes each POI to the DWD ICON model that covers it
// (mirroring Open-Meteo's `icon_seamless` preference order) and computes
// when that model's forecast goes stale, i.e. when the next model run is
// expected to be published.
//
// References:
// - Open-Meteo DWD ICON API: https://open-meteo.com/en/docs/dwd-api
// - Per-model metadata endpoints (source of the BBOX constants below and
//   of the run-cadence fields used for staleness):
//     https://api.open-meteo.com/data/dwd_icon_d2/static/meta.json
//     https://api.open-meteo.com/data/dwd_icon_eu/static/meta.json
//     https://api.open-meteo.com/data/dwd_icon/static/meta.json

const OPEN_METEO_DATA_URL = "https://api.open-meteo.com/data";

export type IconModel = "dwd_icon_d2" | "dwd_icon_eu" | "dwd_icon";

type ModelBbox = {
	latMin: number;
	latMax: number;
	lonMin: number;
	lonMax: number;
};

// Domain bounding boxes as published in each model's meta.json `crs_wkt`
// BBOX (endpoints above; values shown as [latMin, lonMin, latMax, lonMax]):
//   dwd_icon_d2: BBOX[43.18, -3.94, 58.08, 20.34]  (~2 km, Central Europe)
//   dwd_icon_eu: BBOX[29.5, -23.5, 70.5, 62.5]     (~7 km, Europe)
//   dwd_icon:    global                            (~11 km)
// Ordered highest-resolution first; attribution picks the first box that
// contains the point, exactly like `icon_seamless` model selection.
const MODEL_DOMAINS: ReadonlyArray<{ model: IconModel; bbox: ModelBbox | null }> = [
	{
		model: "dwd_icon_d2",
		bbox: { latMin: 43.18, latMax: 58.08, lonMin: -3.94, lonMax: 20.34 },
	},
	{
		model: "dwd_icon_eu",
		bbox: { latMin: 29.5, latMax: 70.5, lonMin: -23.5, lonMax: 62.5 },
	},
	// Global model: covers everything, terminal fallback.
	{ model: "dwd_icon", bbox: null },
];

// When a model's next run is overdue (the computed availability instant is
// already in the past), re-check again shortly instead of on every request.
// Shared with consumers so "unknown" results get the same grace window.
export const GRACE_MS = 10 * 60 * 1000;

/**
 * A model's staleness verdict. `graceExtended: false` means `staleAt` is the
 * real next-run availability instant; `true` means the run is late and
 * `staleAt` is a short re-check window — consumers with data on hand should
 * extend its life rather than refetch (only rowless consumers need to fetch).
 */
export type ModelStaleness = {
	staleAt: Date;
	graceExtended: boolean;
};

// Fields consumed from `<model>/static/meta.json`; times are epoch seconds.
type ModelMeta = {
	last_run_availability_time: number;
	update_interval_seconds: number;
};

/**
 * The DWD ICON model covering a coordinate, in seamless preference order:
 * ICON-D2 (highest resolution) → ICON-EU → ICON global. Pure geometry — no network.
 */
export function coveringModel(latitude: number, longitude: number): IconModel {
	for (const { model, bbox } of MODEL_DOMAINS) {
		if (bbox == null) return model;
		if (
			latitude >= bbox.latMin &&
			latitude <= bbox.latMax &&
			longitude >= bbox.lonMin &&
			longitude <= bbox.lonMax
		) {
			return model;
		}
	}
	// Unreachable: the last domain is the global fallback.
	return "dwd_icon";
}

/**
 * Service encapsulating the per-model run clock. Consumers ask, per request
 * cycle and for all models they need at once, "when does each model's
 * current forecast go stale?" — one meta.json fetch per model (≤ 3 total).
 */
export class ModelClock {
	constructor(private readonly baseUrl: string = OPEN_METEO_DATA_URL) {}

	/**
	 * Per model, `staleAt = last_run_availability_time + update_interval_seconds`
	 * (the earliest instant the next run should be published), marked
	 * `graceExtended: false`. When that instant is already past (the run is
	 * late), returns `now + ~10 min` marked `graceExtended: true` so callers
	 * can extend existing data instead of refetching. A failed or malformed
	 * meta fetch yields `null` ("unknown") for that model — never a throw —
	 * which callers should treat the same as a grace extension.
	 */
	async nextStaleAt(
		models: Iterable<IconModel>,
	): Promise<Map<IconModel, ModelStaleness | null>> {
		const unique = [...new Set(models)];
		const out = new Map<IconModel, ModelStaleness | null>();
		const results = await Promise.all(
			unique.map(async (model) => ({
				model,
				staleness: await this.fetchStaleAt(model),
			})),
		);
		for (const { model, staleness } of results) {
			out.set(model, staleness);
		}
		return out;
	}

	private async fetchStaleAt(model: IconModel): Promise<ModelStaleness | null> {
		let meta: ModelMeta;
		try {
			const res = await fetch(`${this.baseUrl}/${model}/static/meta.json`, {
				// Always ask upstream: a cached meta.json would defeat the point
				// of checking whether a new run has been published.
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

/** Default shared instance; the app talks to one model clock. */
export const modelClock = new ModelClock();

import type {
	ForecastPoint,
	ForecastRepository,
	HourlyBlock,
	PoiId,
} from "./forecast-repository";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

type LocationResult = {
	hourly: HourlyBlock;
};

export class OpenMeteoForecastRepository implements ForecastRepository {
	#baseUrl: string;

	constructor(baseUrl: string = OPEN_METEO_URL) {
		this.#baseUrl = baseUrl;
	}

	/** One batched request; `null` on any failure incl. count mismatch — never
	 * cache or serve misaligned data. */
	async hourlyBlocks(
		points: ForecastPoint[],
	): Promise<Map<PoiId, HourlyBlock> | null> {
		const url = this.#buildRequestUrl(points);

		let payload: LocationResult | LocationResult[];
		try {
			const res = await fetch(url.toString(), {
				// No client-side caching: Next.js dynamic route already disables this
				// for /api/pois, but be explicit so the upstream cache layer doesn't
				// hand us a stale forecast.
				cache: "no-store",
			});
			if (!res.ok) {
				console.warn(`Open-Meteo returned ${res.status}`);
				return null;
			}
			payload = (await res.json()) as LocationResult | LocationResult[];
		} catch (err) {
			console.warn("Open-Meteo fetch failed:", err);
			return null;
		}

		// Multi-location responses are arrays; single-location is an object.
		const items = Array.isArray(payload) ? payload : [payload];
		if (items.length !== points.length) {
			console.warn(
				`Open-Meteo returned ${items.length} locations for ${points.length} POIs`,
			);
			return null;
		}

		const out = new Map<PoiId, HourlyBlock>();
		for (let i = 0; i < points.length; i++) {
			out.set(points[i].id, items[i].hourly);
		}
		return out;
	}

	#buildRequestUrl(points: ForecastPoint[]): URL {
		const url = new URL(this.#baseUrl);
		url.searchParams.set(
			"latitude",
			points.map((p) => p.latitude.toFixed(5)).join(","),
		);
		url.searchParams.set(
			"longitude",
			points.map((p) => p.longitude.toFixed(5)).join(","),
		);
		url.searchParams.set(
			"hourly",
			[
				"temperature_2m",
				"dew_point_2m",
				"cloud_cover_low",
				"cloud_cover_mid",
				"cloud_cover_high",
			].join(","),
		);
		// DWD ICON seamless: per-location best of (D2 → EU → global) so we keep
		// 2 km resolution over Central Europe while still covering POIs elsewhere
		// (a single icon_d2 request fails with HTTP 400 if any location is outside
		// the D2 area).
		url.searchParams.set("models", "icon_seamless");
		// Two days is enough to reach tomorrow's sunrise even when the user opens
		// the page late in the evening.
		url.searchParams.set("forecast_days", "2");
		url.searchParams.set("timezone", "UTC");
		return url;
	}
}

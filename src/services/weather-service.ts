// WeatherService — per-request meteorology (fog probability, sunrise/sunset
// beauty) over hourly blocks from an injected ForecastSource.
//
// References:
// - Open-Meteo DWD ICON API: https://open-meteo.com/en/docs/dwd-api
// - Fog from dewpoint depression: when the spread (T − Td) is small the
//   air is near saturation. Operational meteorology uses ~2.5°C as the
//   high-fog-potential threshold (Tardif & Rasmussen 2007, "Event-Based
//   Climatology and Typology of Fog in the New York City Region", J. Appl.
//   Meteorol. Climatol., 46(8): 1141–1168). We model probability as a
//   quadratic falloff cutting off at 4°C.

import { cachedForecastSource } from "./cached-forecast-source";
import { poiId, type ForecastSource, type HourlyBlock } from "./forecast-source";

export type ForecastInput = {
	id: number;
	latitude: number;
	longitude: number;
	// One fog probability is computed per target timestamp. Pass as many as
	// you'd like to inspect across the morning (e.g. sunrise, +1 h, +2 h).
	fogTargets: string[];
	sunriseAt: string | null;
	sunsetAt: string | null;
};

export type FogForecast = {
	probability: number; // 0–100
	at: string; // ISO timestamp of the hour we evaluated
	temperature: number; // °C
	dewPoint: number; // °C
	spread: number; // T − Td, °C
};

export type BeautyForecast = {
	beautiful: boolean;
	at: string;
	cloudCoverLow: number; // %
	cloudCoverMid: number;
	cloudCoverHigh: number;
};

export type PoiForecast = {
	// One reading per requested `fogTargets` entry. Targets that fall outside
	// the forecast window or whose hour has missing data are skipped.
	fog: FogForecast[];
	sunrise: BeautyForecast | null;
	sunset: BeautyForecast | null;
};

// Beauty criteria (per the user spec): low+mid clouds ≤ 10 % (mostly clear at
// horizon for the sun to peek through) AND high clouds ≥ 80 % (a high deck to
// catch the warm light and turn pink).
const BEAUTY_LOW_MID_MAX = 10;
const BEAUTY_HIGH_MIN = 80;

/**
 * Service encapsulating all weather-forecast concerns. Consumers depend on
 * this interface instead of the Open-Meteo wire format, so the provider can
 * be swapped (or mocked in tests) without touching call sites.
 */
export class WeatherService {
	#source: ForecastSource;

	constructor(source: ForecastSource) {
		this.#source = source;
	}

	/** Missing entry = forecast unavailable; callers degrade, not fail. */
	async getForecasts(pois: ForecastInput[]): Promise<Map<number, PoiForecast>> {
		const out = new Map<number, PoiForecast>();
		if (pois.length === 0) return out;

		const blocks = await this.#source.hourlyBlocks(
			pois.map((p) => ({
				id: poiId(p.id),
				latitude: p.latitude,
				longitude: p.longitude,
			})),
		);
		if (!blocks) return out;

		for (const p of pois) {
			const hourly = blocks.get(poiId(p.id));
			if (!hourly) continue;
			out.set(p.id, summarize(hourly, p));
		}
		return out;
	}
}

/** Default shared instance; the app talks to one weather provider. */
export const weatherService = new WeatherService(cachedForecastSource);

function summarize(h: HourlyBlock, input: ForecastInput): PoiForecast {
	const fog: FogForecast[] = [];
	for (const target of input.fogTargets) {
		const idx = nearestHourIndex(h.time, target);
		if (idx == null) continue;
		const t = h.temperature_2m[idx];
		const td = h.dew_point_2m[idx];
		if (typeof t !== "number" || typeof td !== "number") continue;
		fog.push({
			probability: fogProbability(t, td),
			at: `${h.time[idx]}Z`,
			temperature: t,
			dewPoint: td,
			spread: Number((t - td).toFixed(2)),
		});
	}

	return {
		fog,
		sunrise: beautyAt(h, input.sunriseAt),
		sunset: beautyAt(h, input.sunsetAt),
	};
}

// Quadratic falloff: spread=0 → 100 %, spread=4 → 0 %.
// Tuned against the rule of thumb that spread < ~2.5 °C is a high fog risk.
function fogProbability(temperature: number, dewPoint: number): number {
	const spread = Math.max(0, temperature - dewPoint);
	const x = Math.max(0, 1 - spread / 4);
	return Math.round(100 * x * x);
}

function isBeautifulSunsetOrSunrise(
	low: number,
	mid: number,
	high: number,
): boolean {
	return (
		low <= BEAUTY_LOW_MID_MAX &&
		mid <= BEAUTY_LOW_MID_MAX &&
		high >= BEAUTY_HIGH_MIN
	);
}

function beautyAt(
	h: HourlyBlock,
	targetIso: string | null,
): BeautyForecast | null {
	if (!targetIso) return null;
	const idx = nearestHourIndex(h.time, targetIso);
	if (idx == null) return null;
	const low = h.cloud_cover_low[idx];
	const mid = h.cloud_cover_mid[idx];
	const high = h.cloud_cover_high[idx];
	if (
		typeof low !== "number" ||
		typeof mid !== "number" ||
		typeof high !== "number"
	) {
		return null;
	}
	return {
		beautiful: isBeautifulSunsetOrSunrise(low, mid, high),
		at: `${h.time[idx]}Z`,
		cloudCoverLow: low,
		cloudCoverMid: mid,
		cloudCoverHigh: high,
	};
}

// Open-Meteo emits naive ISO timestamps (no `Z`) but they are UTC when we
// ask for `timezone=UTC`. Append the suffix so `Date.parse` reads them as
// UTC instead of as local time.
function parseHourly(t: string): number {
	return Date.parse(`${t}Z`);
}

function nearestHourIndex(times: string[], targetIso: string): number | null {
	const target = Date.parse(targetIso);
	if (Number.isNaN(target)) return null;
	let bestIdx = -1;
	let bestDiff = Infinity;
	for (let i = 0; i < times.length; i++) {
		const diff = Math.abs(parseHourly(times[i]) - target);
		if (diff < bestDiff) {
			bestDiff = diff;
			bestIdx = i;
		}
	}
	// Only accept matches within an hour: anything further means the target
	// falls outside the returned forecast window.
	if (bestIdx === -1 || bestDiff > 60 * 60 * 1000) return null;
	return bestIdx;
}

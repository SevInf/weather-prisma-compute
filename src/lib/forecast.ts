// Open-Meteo ICON-D2 forecast adapter. Batches every POI into a single
// HTTP request via the multi-location `latitude=lat1,lat2&longitude=lng1,lng2`
// syntax, then derives a fog probability and a "beautiful sunrise/sunset"
// flag for each POI.
//
// References:
// - Open-Meteo DWD ICON API: https://open-meteo.com/en/docs/dwd-api
// - Fog from dewpoint depression: when the spread (T − Td) is small the
//   air is near saturation. Operational meteorology uses ~2.5°C as the
//   high-fog-potential threshold (Tardif & Rasmussen 2007, "Event-Based
//   Climatology and Typology of Fog in the New York City Region", J. Appl.
//   Meteorol. Climatol., 46(8): 1141–1168). We model probability as a
//   quadratic falloff cutting off at 4°C.

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export type ForecastInput = {
  id: number;
  latitude: number;
  longitude: number;
  sunrise: string | null;
  sunset: string | null;
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
  fog: FogForecast | null;
  sunrise: BeautyForecast | null;
  sunset: BeautyForecast | null;
};

// Beauty criteria (per the user spec): low+mid clouds ≤ 10 % (mostly clear at
// horizon for the sun to peek through) AND high clouds ≥ 80 % (a high deck to
// catch the warm light and turn pink).
const BEAUTY_LOW_MID_MAX = 10;
const BEAUTY_HIGH_MIN = 80;

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

type HourlyBlock = {
  time: string[];
  temperature_2m: Array<number | null>;
  dew_point_2m: Array<number | null>;
  cloud_cover_low: Array<number | null>;
  cloud_cover_mid: Array<number | null>;
  cloud_cover_high: Array<number | null>;
};

type LocationResult = {
  hourly: HourlyBlock;
};

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

function summarize(loc: LocationResult, input: ForecastInput): PoiForecast {
  const h = loc.hourly;

  let fog: FogForecast | null = null;
  if (input.sunrise) {
    // "Fog around sunrise + 2 h".
    const target = new Date(
      Date.parse(input.sunrise) + 2 * 60 * 60 * 1000,
    ).toISOString();
    const idx = nearestHourIndex(h.time, target);
    if (idx != null) {
      const t = h.temperature_2m[idx];
      const td = h.dew_point_2m[idx];
      if (typeof t === "number" && typeof td === "number") {
        fog = {
          probability: fogProbability(t, td),
          at: `${h.time[idx]}Z`,
          temperature: t,
          dewPoint: td,
          spread: Number((t - td).toFixed(2)),
        };
      }
    }
  }

  function beautyAt(targetIso: string | null): BeautyForecast | null {
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

  return {
    fog,
    sunrise: beautyAt(input.sunrise),
    sunset: beautyAt(input.sunset),
  };
}

/**
 * Fetch a forecast for every POI in a single Open-Meteo request and return a
 * `Map<poiId, PoiForecast>`. If the network call fails, the returned map is
 * empty — callers should treat missing entries as "forecast unavailable"
 * rather than failing the request.
 */
export async function fetchForecasts(
  pois: ForecastInput[],
): Promise<Map<number, PoiForecast>> {
  const out = new Map<number, PoiForecast>();
  if (pois.length === 0) return out;

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set(
    "latitude",
    pois.map((p) => p.latitude.toFixed(5)).join(","),
  );
  url.searchParams.set(
    "longitude",
    pois.map((p) => p.longitude.toFixed(5)).join(","),
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
  url.searchParams.set("models", "icon_d2");
  // ICON-D2 covers 48 hours, which is plenty to reach tomorrow's sunrise
  // even when the user opens the page late in the evening.
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "UTC");

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
      return out;
    }
    payload = (await res.json()) as LocationResult | LocationResult[];
  } catch (err) {
    console.warn("Open-Meteo fetch failed:", err);
    return out;
  }

  // Multi-location responses are arrays; single-location is an object.
  const items = Array.isArray(payload) ? payload : [payload];
  if (items.length !== pois.length) {
    console.warn(
      `Open-Meteo returned ${items.length} locations for ${pois.length} POIs`,
    );
    return out;
  }

  for (let i = 0; i < pois.length; i++) {
    out.set(pois[i].id, summarize(items[i], pois[i]));
  }
  return out;
}

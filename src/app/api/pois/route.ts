import { NextResponse } from "next/server";
import SunCalc from "suncalc";
import { db } from "@/prisma/db";
import { fetchForecasts } from "@/lib/forecast";

function iso(date: Date): string | null {
  // SunCalc returns `Invalid Date` for extreme latitudes during polar
  // day/night. Surface that as `null` so the client can render a dash.
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Compute the **next** upcoming sunrise/sunset (today if still ahead,
// otherwise tomorrow's). Today's sunrise is already in the past for most of
// the day, which makes "fog at sunrise + 2 h" useless.
function sunTimesFor(latitude: number, longitude: number, now: Date) {
  const today = SunCalc.getTimes(now, latitude, longitude);
  const tomorrow = SunCalc.getTimes(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    latitude,
    longitude,
  );
  const sunriseDay = today.sunrise > now ? today : tomorrow;
  const sunsetDay = today.sunset > now ? today : tomorrow;
  return {
    sunrise: iso(sunriseDay.sunrise),
    sunset: iso(sunsetDay.sunset),
    morningGoldenHour: {
      start: iso(sunriseDay.sunrise),
      end: iso(sunriseDay.goldenHourEnd),
    },
    eveningGoldenHour: {
      start: iso(sunsetDay.goldenHour),
      end: iso(sunsetDay.sunset),
    },
  };
}

// Pois are mutable per-request; never prerender or cache this endpoint.
export const dynamic = "force-dynamic";

export async function GET() {
  const pois = await db.orm.Poi
    .select("id", "name", "latitude", "longitude")
    .orderBy((p) => p.id.desc())
    .all();

  const now = new Date();
  const withSun = pois.map((p) => ({
    ...p,
    sun: sunTimesFor(p.latitude, p.longitude, now),
  }));

  // One Open-Meteo request, all POIs.
  const forecasts = await fetchForecasts(
    withSun.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      sunrise: p.sun.sunrise,
      sunset: p.sun.sunset,
    })),
  );

  return NextResponse.json(
    withSun.map((p) => ({
      ...p,
      forecast: forecasts.get(p.id) ?? null,
    })),
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Expected an object" },
      { status: 400 },
    );
  }
  const { name, latitude, longitude } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "`name` must be a non-empty string" },
      { status: 400 },
    );
  }
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return NextResponse.json(
      { error: "`latitude` must be a number in [-90, 90]" },
      { status: 400 },
    );
  }
  if (
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      { error: "`longitude` must be a number in [-180, 180]" },
      { status: 400 },
    );
  }

  const poi = await db.orm.Poi
    .select("id", "name", "latitude", "longitude")
    .create({ name: name.trim(), latitude, longitude });
  return NextResponse.json(poi, { status: 201 });
}

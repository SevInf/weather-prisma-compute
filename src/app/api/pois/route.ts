import { NextResponse } from "next/server";
import SunCalc from "suncalc";
import { db } from "@/prisma/db";

function iso(date: Date): string | null {
  // SunCalc returns `Invalid Date` for extreme latitudes during polar
  // day/night. Surface that as `null` so the client can render a dash.
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sunTimesFor(latitude: number, longitude: number, now: Date) {
  const t = SunCalc.getTimes(now, latitude, longitude);
  return {
    sunrise: iso(t.sunrise),
    sunset: iso(t.sunset),
    // Morning: sun rises and climbs to ~6° above the horizon.
    morningGoldenHour: {
      start: iso(t.sunrise),
      end: iso(t.goldenHourEnd),
    },
    // Evening: sun drops from ~6° down to the horizon.
    eveningGoldenHour: {
      start: iso(t.goldenHour),
      end: iso(t.sunset),
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
  return NextResponse.json(
    pois.map((p) => ({
      ...p,
      sun: sunTimesFor(p.latitude, p.longitude, now),
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

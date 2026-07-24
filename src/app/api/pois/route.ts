import { NextResponse } from "next/server";
import SunCalc from "suncalc";
import { auth } from "@/composition/auth";
import { poiService } from "@/composition/poi";
import { weatherService } from "@/composition/weather";

function iso(date: Date): string | null {
	// SunCalc returns `Invalid Date` for extreme latitudes during polar
	// day/night. Surface that as `null` so the client can render a dash.
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Compute, for one POI, the **next future occurrence** of each interesting
 * sun event. Each event is picked independently so we never display anything
 * that has already happened:
 *
 * - Sunrise / sunset: today's if still upcoming, otherwise tomorrow's.
 * - Morning golden hour: tied to whichever sunrise we chose (start = sunrise,
 *   end = goldenHourEnd of that day).
 * - Evening golden hour: anchored on its **start** (`goldenHour` ~ +6° as the
 *   sun is dropping), so we may end up displaying tomorrow's GH when today's
 *   has already started even if today's sunset is still ahead.
 * - Fog target times: three hourly samples (sunrise, +1 h, +2 h) of the
 *   **next** sunrise we're displaying. They share a single morning so the
 *   three readings are coherent in time.
 */
function sunTimesFor(latitude: number, longitude: number, now: Date) {
	const today = SunCalc.getTimes(now, latitude, longitude);
	const tomorrow = SunCalc.getTimes(
		new Date(now.getTime() + 24 * 60 * 60 * 1000),
		latitude,
		longitude,
	);

	const sunriseDay = today.sunrise > now ? today : tomorrow;
	const sunsetDay = today.sunset > now ? today : tomorrow;
	// Evening GH key moment is its start; if today's has begun, take tomorrow's.
	const eveningGHDay = today.goldenHour > now ? today : tomorrow;

	const sunrise = sunriseDay.sunrise;
	const sunset = sunsetDay.sunset;

	// Fog readings: sunrise, sunrise + 1 h, sunrise + 2 h on the next sunrise's
	// morning. All three share a coherent morning context.
	const HOUR = 60 * 60 * 1000;
	const fogTargets = [0, 1, 2].map(
		(h) => new Date(sunrise.getTime() + h * HOUR),
	);

	return {
		sunrise: iso(sunrise),
		sunset: iso(sunset),
		morningGoldenHour: {
			start: iso(sunriseDay.sunrise),
			end: iso(sunriseDay.goldenHourEnd),
		},
		eveningGoldenHour: {
			start: iso(eveningGHDay.goldenHour),
			end: iso(eveningGHDay.sunset),
		},
		fogTargets: fogTargets.map(iso).filter((s): s is string => s !== null),
	};
}

// Pois are mutable per-request; never prerender or cache this endpoint.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const pois = await poiService.list(session.user.id);

	const now = new Date();
	const withSun = pois.map((p) => {
		const sun = sunTimesFor(p.latitude, p.longitude, now);
		return { ...p, sun };
	});

	// One Open-Meteo request, all POIs. Each POI passes the timestamps it
	// wants evaluated; the service finds the nearest forecast hour for each.
	const forecasts = await weatherService.getForecasts(
		withSun.map((p) => ({
			id: p.id,
			latitude: p.latitude,
			longitude: p.longitude,
			fogTargets: p.sun.fogTargets,
			sunriseAt: p.sun.sunrise,
			sunsetAt: p.sun.sunset,
		})),
	);

	return NextResponse.json(
		withSun.map((p) => {
			// `fogTargets` is purely an internal pivot used to drive the forecast
			// call; strip it from the response so the client schema stays narrow.
			const { fogTargets: _fogTargets, ...sun } = p.sun;
			return {
				...p,
				sun,
				forecast: forecasts.get(p.id) ?? null,
			};
		}),
	);
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (!body || typeof body !== "object") {
		return NextResponse.json({ error: "Expected an object" }, { status: 400 });
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

	const poi = await poiService.create(session.user.id, {
		name: name.trim(),
		latitude,
		longitude,
	});
	return NextResponse.json(poi, { status: 201 });
}

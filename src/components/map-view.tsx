"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MapGL, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// OpenFreeMap (https://openfreemap.org) hosts a public MapLibre style backed
// by OpenMapTiles data from OpenStreetMap. No API key, no usage limits, and
// attribution is auto-rendered by MapLibre. Other ready-made styles: positron,
// bright, dark, fiord, 3d.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type Poi = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  sun: {
    sunrise: string | null;
    sunset: string | null;
    morningGoldenHour: { start: string | null; end: string | null };
    eveningGoldenHour: { start: string | null; end: string | null };
  };
  forecast: {
    fog: Array<{
      probability: number;
      at: string;
      temperature: number;
      dewPoint: number;
      spread: number;
    }>;
    sunrise: {
      beautiful: boolean;
      at: string;
      cloudCoverLow: number;
      cloudCoverMid: number;
      cloudCoverHigh: number;
    } | null;
    sunset: {
      beautiful: boolean;
      at: string;
      cloudCoverLow: number;
      cloudCoverMid: number;
      cloudCoverHigh: number;
    } | null;
  } | null;
};

type BeautyForecast = NonNullable<Poi["forecast"]>["sunrise"];

type Draft = {
  name: string;
  latitude: number;
  longitude: number;
};

// Format an ISO timestamp as `HH:MM` in the browser's local timezone.
// Returns an em-dash on null/Invalid Date. The day each event falls on is
// shown once in the column header (via `dayLabel`), so cells stay narrow.
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtRange(
  start: string | null,
  end: string | null,
): string {
  if (!start && !end) return "—";
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

// "today" / "tomorrow" / weekday-short ("Wed"). Used in column headers so the
// table can show what day every column refers to without repeating it in
// every cell.
function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOfDay = (x: Date) => {
    const y = new Date(x);
    y.setHours(0, 0, 0, 0);
    return y.getTime();
  };
  const diffDays = Math.round(
    (startOfDay(d) - startOfDay(new Date())) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  return d.toLocaleDateString([], { weekday: "short" });
}

function beautyTooltip(b: BeautyForecast): string {
  if (!b) return "";
  return (
    `Cloud cover — low ${b.cloudCoverLow}%, mid ${b.cloudCoverMid}%, ` +
    `high ${b.cloudCoverHigh}%. ` +
    (b.beautiful
      ? "Beautiful conditions: clear horizon under a high cloud deck."
      : "Not the photogenic combo (need low/mid ≤ 10% and high ≥ 80%).")
  );
}

// Header decoration: shows the day each column's values refer to. Computed
// once per column from the first POI's timestamp — all our POIs are in the
// same timezone bucket so the day will be the same across rows.
function ColumnDay({ iso }: { iso: string | null | undefined }) {
  const label = dayLabel(iso);
  if (!label) return null;
  return <span className="header-day"> ({label})</span>;
}

function BeautyBadge({ forecast }: { forecast: BeautyForecast }) {
  if (!forecast) return null;
  return (
    <span
      className={`beauty-badge ${
        forecast.beautiful ? "beauty-yes" : "beauty-no"
      }`}
      title={beautyTooltip(forecast)}
      aria-label={
        forecast.beautiful ? "Beautiful conditions" : "Mediocre conditions"
      }
    >
      {forecast.beautiful ? "😊" : "😞"}
    </span>
  );
}

type SunColumn = {
  id: string;
  icon: string;
  label: string;
  width: number;
  title?: string;
  // The reference timestamp for this column at a given POI. Drives both the
  // chronological column sort and the per-column day label in the header.
  sortIso: (p: Poi) => string | null | undefined;
  // The class applied to the <td>. `sun-sub-cell` styles golden-hour ranges
  // in amber; the plain `sun-cell` is the default.
  cellClass?: string;
  renderCell: (p: Poi) => React.ReactNode;
};

const SUN_COLUMNS: SunColumn[] = [
  {
    id: "sunrise",
    icon: "🌅",
    label: "Sunrise",
    width: 110,
    sortIso: (p) => p.sun.sunrise,
    renderCell: (p) => (
      <div className="sun-time">
        {fmtTime(p.sun.sunrise)}
        <BeautyBadge forecast={p.forecast?.sunrise ?? null} />
      </div>
    ),
  },
  {
    id: "morningGH",
    icon: "✨",
    label: "Morning golden hour",
    width: 150,
    cellClass: "sun-sub-cell",
    sortIso: (p) => p.sun.morningGoldenHour.start,
    renderCell: (p) =>
      fmtRange(p.sun.morningGoldenHour.start, p.sun.morningGoldenHour.end),
  },
  {
    id: "sunset",
    icon: "🌇",
    label: "Sunset",
    width: 110,
    sortIso: (p) => p.sun.sunset,
    renderCell: (p) => (
      <div className="sun-time">
        {fmtTime(p.sun.sunset)}
        <BeautyBadge forecast={p.forecast?.sunset ?? null} />
      </div>
    ),
  },
  {
    id: "eveningGH",
    icon: "✨",
    label: "Evening golden hour",
    width: 150,
    cellClass: "sun-sub-cell",
    sortIso: (p) => p.sun.eveningGoldenHour.start,
    renderCell: (p) =>
      fmtRange(p.sun.eveningGoldenHour.start, p.sun.eveningGoldenHour.end),
  },
  {
    id: "fog",
    icon: "🌫️",
    label: "Fog",
    width: 130,
    title:
      "Probability of fog at sunrise, +1 h and +2 h. Derived from the ICON-D2 forecast of dew-point depression (T − Td) — small spread means the air is near saturation.",
    // Sort by the first reading (sunrise itself).
    sortIso: (p) => p.forecast?.fog?.[0]?.at,
    renderCell: (p) => {
      const readings = p.forecast?.fog ?? [];
      if (readings.length === 0) {
        return <span style={{ color: "#999" }}>—</span>;
      }
      return (
        <div className="fog-list">
          {readings.map((r) => {
            const bucket =
              r.probability >= 60
                ? "high"
                : r.probability >= 30
                  ? "med"
                  : "low";
            return (
              <div
                key={r.at}
                className={`fog-reading fog-${bucket}`}
                title={`${r.temperature.toFixed(
                  1,
                )}°C, dew point ${r.dewPoint.toFixed(
                  1,
                )}°C, spread ${r.spread.toFixed(1)}°C`}
              >
                <span className="fog-at">{fmtTime(r.at)}</span>
                <span className="fog-pct">{r.probability}%</span>
              </div>
            );
          })}
        </div>
      );
    },
  },
];

export function MapView() {
  const [pois, setPois] = useState<Poi[]>([]);
  // The first POI drives the per-column day label; all POIs in the same
  // region share a day for each event.
  const firstPoi = pois[0];

  // Sort the sun columns chronologically by each column's reference time on
  // the first POI. Columns whose timestamp is missing/null sink to the end so
  // they don't disrupt the chronological reading of the rest.
  const sortedSunColumns = useMemo(() => {
    if (!firstPoi) return SUN_COLUMNS;
    const keys = new Map<string, number>();
    for (const c of SUN_COLUMNS) {
      const iso = c.sortIso(firstPoi);
      keys.set(c.id, iso ? Date.parse(iso) : Number.POSITIVE_INFINITY);
    }
    return [...SUN_COLUMNS].sort((a, b) => keys.get(a.id)! - keys.get(b.id)!);
  }, [firstPoi]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs into the table so we can scroll the selected row into view.
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    if (selectedId == null) return;
    const row = rowRefs.current.get(selectedId);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const refreshPois = useCallback(async () => {
    try {
      const res = await fetch("/api/pois");
      if (!res.ok) throw new Error(`GET /api/pois -> ${res.status}`);
      setPois((await res.json()) as Poi[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refreshPois();
  }, [refreshPois]);

  // Map click: create a new draft, or move the existing one. Only ever one
  // draft at a time.
  const onMapClick = useCallback((event: MapLayerMouseEvent) => {
    const { lat, lng } = event.lngLat;
    setDraft((current) =>
      current
        ? { ...current, latitude: lat, longitude: lng }
        : { name: "", latitude: lat, longitude: lng },
    );
  }, []);

  const deletePoi = useCallback(
    async (id: number) => {
      const target = pois.find((p) => p.id === id);
      if (!target) return;
      if (
        !window.confirm(`Delete "${target.name}"? This cannot be undone.`)
      ) {
        return;
      }
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(`/api/pois/${id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) {
          const payload = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            payload.error ?? `DELETE /api/pois/${id} -> ${res.status}`,
          );
        }
        if (selectedId === id) setSelectedId(null);
        await refreshPois();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setDeletingId(null);
      }
    },
    [pois, refreshPois, selectedId],
  );

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          latitude: draft.latitude,
          longitude: draft.longitude,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? `POST /api/pois -> ${res.status}`);
      }
      setDraft(null);
      await refreshPois();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [draft, refreshPois]);

  return (
    <div className="layout">
      <div className="map-pane">
        <MapGL
          initialViewState={{
            longitude: 13.405,
            latitude: 52.52,
            zoom: 10,
          }}
          minZoom={0}
          maxZoom={18}
          mapStyle={MAP_STYLE_URL}
          onClick={onMapClick}
          onError={(e) => setError(e.error?.message ?? "Unknown map error")}
        >
          <NavigationControl position="top-right" />
          {pois.map((p) => (
            <Marker
              key={p.id}
              longitude={p.longitude}
              latitude={p.latitude}
              anchor="bottom"
              onClick={(e) => {
                // Stop the underlying map click so we don't drop a draft
                // pin under the selected POI.
                e.originalEvent.stopPropagation();
                setSelectedId(p.id);
              }}
            >
              <div
                className={`pin pin--saved${
                  selectedId === p.id ? " pin--selected" : ""
                }`}
                title={p.name}
              />
            </Marker>
          ))}
          {draft && (
            <Marker
              longitude={draft.longitude}
              latitude={draft.latitude}
              anchor="bottom"
            >
              <div
                className="pin pin--draft"
                title={draft.name || "(unnamed draft)"}
              />
            </Marker>
          )}
        </MapGL>
        {error && (
          <div className="error-toast" onClick={() => setError(null)}>
            {error} <span style={{ opacity: 0.7 }}>(click to dismiss)</span>
          </div>
        )}
      </div>

      <div className="table-pane">
        <div className="table-header">
          <h2>POIs</h2>
          <small>
            {pois.length} saved
            {draft ? " + 1 draft" : ""} · click the map to add one
          </small>
        </div>
        <table className="poi-table">
          <thead>
            <tr>
              <th>Name</th>
              {sortedSunColumns.map((c) => (
                <th
                  key={c.id}
                  style={{ width: c.width }}
                  title={c.title}
                >
                  <span className="sun-icon" aria-hidden>
                    {c.icon}
                  </span>{" "}
                  {c.label}
                  <ColumnDay iso={firstPoi ? c.sortIso(firstPoi) ?? null : null} />
                </th>
              ))}
              <th style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {draft && (
              <tr className="draft-row">
                <td>
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    placeholder="Name"
                    disabled={saving}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveDraft();
                      if (e.key === "Escape") setDraft(null);
                    }}
                  />
                </td>
                {sortedSunColumns.map((c) => (
                  <td key={c.id} className="sun-cell">
                    —
                  </td>
                ))}
                <td>
                  <button onClick={saveDraft} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>{" "}
                  <button
                    onClick={() => setDraft(null)}
                    disabled={saving}
                    className="secondary"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
            {pois.map((p) => (
              <tr
                key={p.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(p.id, el);
                  else rowRefs.current.delete(p.id);
                }}
                className={selectedId === p.id ? "selected" : undefined}
                onClick={() =>
                  setSelectedId((cur) => (cur === p.id ? null : p.id))
                }
              >
                <td>{p.name}</td>
                {sortedSunColumns.map((c) => (
                  <td
                    key={c.id}
                    className={`sun-cell${
                      c.cellClass ? " " + c.cellClass : ""
                    }`}
                  >
                    {c.renderCell(p)}
                  </td>
                ))}
                <td>
                  <button
                    className="danger"
                    onClick={(e) => {
                      // Don't toggle row selection when clicking the button.
                      e.stopPropagation();
                      deletePoi(p.id);
                    }}
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {pois.length === 0 && !draft && (
              <tr>
                <td
                  colSpan={2 + sortedSunColumns.length}
                  style={{ textAlign: "center", color: "#888", padding: 20 }}
                >
                  No POIs yet. Click the map to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

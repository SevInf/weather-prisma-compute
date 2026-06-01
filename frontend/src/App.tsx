import { useCallback, useEffect, useMemo, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Poi = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

type Draft = {
  name: string;
  latitude: number;
  longitude: number;
};

// Register the `pmtiles://` protocol with MapLibre so it can read tiles from
// our Range-supporting Hono endpoint on demand.
function usePmtilesProtocol() {
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);
}

const TILES_URL = `${window.location.origin}/tiles/germany.pmtiles`;

function useGermanyStyle(): StyleSpecification {
  return useMemo(
    () => ({
      version: 8,
      glyphs:
        "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
      sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
      sources: {
        protomaps: {
          type: "vector",
          url: `pmtiles://${TILES_URL}`,
          attribution:
            '<a href="https://protomaps.com">Protomaps</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        },
      },
      layers: layers("protomaps", namedFlavor("light"), { lang: "en" }),
    }),
    [],
  );
}

export function App() {
  usePmtilesProtocol();
  const style = useGermanyStyle();

  const [pois, setPois] = useState<Poi[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Map
          initialViewState={{
            longitude: 13.405,
            latitude: 52.52,
            zoom: 10,
          }}
          minZoom={0}
          maxZoom={18}
          mapStyle={style}
          onClick={onMapClick}
          onError={(e) => setError(e.error?.message ?? "Unknown map error")}
        >
          <NavigationControl position="top-right" />
          {/* Saved POIs */}
          {pois.map((p) => (
            <Marker
              key={p.id}
              longitude={p.longitude}
              latitude={p.latitude}
              anchor="bottom"
            >
              <div className="pin pin--saved" title={p.name} />
            </Marker>
          ))}
          {/* Draft POI */}
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
        </Map>
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
              <th style={{ width: 70 }}>ID</th>
              <th>Name</th>
              <th style={{ width: 110 }}>Latitude</th>
              <th style={{ width: 110 }}>Longitude</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {draft && (
              <tr className="draft-row">
                <td>—</td>
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
                <td>{draft.latitude.toFixed(5)}</td>
                <td>{draft.longitude.toFixed(5)}</td>
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
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.latitude.toFixed(5)}</td>
                <td>{p.longitude.toFixed(5)}</td>
                <td />
              </tr>
            ))}
            {pois.length === 0 && !draft && (
              <tr>
                <td
                  colSpan={5}
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

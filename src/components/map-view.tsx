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
// our Range-supporting Next.js route handler on demand.
function usePmtilesProtocol() {
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);
}

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
          // Relative URL: works for SSR (window-less) and CSR alike.
          url: `pmtiles:///tiles/germany.pmtiles`,
          attribution:
            '<a href="https://protomaps.com">Protomaps</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        },
      },
      layers: layers("protomaps", namedFlavor("light"), { lang: "en" }),
    }),
    [],
  );
}

export function MapView() {
  usePmtilesProtocol();
  const style = useGermanyStyle();

  const [pois, setPois] = useState<Poi[]>([]);
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
          mapStyle={style}
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
              <th style={{ width: 70 }}>ID</th>
              <th>Name</th>
              <th style={{ width: 110 }}>Latitude</th>
              <th style={{ width: 110 }}>Longitude</th>
              <th style={{ width: 220 }}>Actions</th>
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
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.latitude.toFixed(5)}</td>
                <td>{p.longitude.toFixed(5)}</td>
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

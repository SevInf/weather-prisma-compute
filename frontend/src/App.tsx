import { useEffect, useMemo, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
      sprite:
        "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
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
  const [error, setError] = useState<string | null>(null);

  return (
    // Archive holds zoom 0–11; MapLibre over-zooms (rescales z11 tiles)
    // beyond that, so we leave the view's maxZoom higher than the source.
    <div className="map-container">
      <Map
        initialViewState={{
          longitude: 13.405,
          latitude: 52.52,
          zoom: 10,
        }}
        minZoom={0}
        maxZoom={18}
        mapStyle={style}
        onError={(e) => setError(e.error?.message ?? "Unknown map error")}
      >
        <NavigationControl position="top-right" />
      </Map>
      {error && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            padding: "6px 10px",
            background: "rgba(255,80,80,0.9)",
            color: "white",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

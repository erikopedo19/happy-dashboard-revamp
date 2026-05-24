"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl, { Map as MLMap, MapOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapRef = MLMap;

export interface MapProps {
  initialViewState?: {
    longitude?: number;
    latitude?: number;
    zoom?: number;
    pitch?: number;
    bearing?: number;
  };
  mapStyle?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (map: MLMap) => void;
  children?: React.ReactNode;
}

const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/positron";

export const Map = forwardRef<MapRef, MapProps>(function Map(
  { initialViewState, mapStyle, className, style, onLoad, children },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  useImperativeHandle(ref, () => mapRef.current as MLMap, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const opts: MapOptions = {
      container: containerRef.current,
      style: mapStyle || DEFAULT_STYLE,
      center: [
        initialViewState?.longitude ?? 0,
        initialViewState?.latitude ?? 0,
      ],
      zoom: initialViewState?.zoom ?? 2,
      pitch: initialViewState?.pitch ?? 0,
      bearing: initialViewState?.bearing ?? 0,
      attributionControl: false,
    };
    const map = new maplibregl.Map(opts);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    map.on("load", () => onLoad?.(map));
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style switch
  useEffect(() => {
    if (mapRef.current && mapStyle) {
      mapRef.current.setStyle(mapStyle);
    }
  }, [mapStyle]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
});

export { maplibregl };

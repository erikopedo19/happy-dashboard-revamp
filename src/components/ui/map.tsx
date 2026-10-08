"use client";

import { forwardRef, useEffect, useRef } from "react";
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
  /** Fires after every style (re)load — use it to tweak layer paint. */
  onStyleLoad?: (map: MLMap) => void;
  navigationControl?: boolean;
  children?: React.ReactNode;
}

const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/positron";

export const Map = forwardRef<MapRef, MapProps>(function Map(
  { initialViewState, mapStyle, className, style, onLoad, onStyleLoad, navigationControl = true, children },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const appliedStyleRef = useRef<string | undefined>(mapStyle);
  const onStyleLoadRef = useRef(onStyleLoad);
  onStyleLoadRef.current = onStyleLoad;

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
      // Snappier rendering on phones: no pitch/rotate, single world copy,
      // capped pixel ratio and quicker label fades.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
      renderWorldCopies: false,
      fadeDuration: 120,
      pixelRatio: Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2),
    };
    const map = new maplibregl.Map(opts);
    map.touchZoomRotate.disableRotation();
    if (navigationControl) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    }
    mapRef.current = map;
    // The map only exists from here on, so the forwarded ref must be assigned
    // inside this effect — a useImperativeHandle snapshot would hand back null.
    if (ref) {
      if (typeof ref === "function") ref(map);
      else (ref as React.MutableRefObject<MLMap | null>).current = map;
    }
    map.on("style.load", () => onStyleLoadRef.current?.(map));
    map.on("load", () => onLoad?.(map));
    // Styles reference sprite images we don't ship; give MapLibre a 1px blank
    // so it stops logging and keeps rendering.
    map.on("styleimagemissing", (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    // WebViews (Expo/Capacitor) can mount the container before it has its
    // final size, leaving a 0px canvas — track the box and resize the map.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => map.resize()) : null;
    ro?.observe(containerRef.current);
    const kick = window.setTimeout(() => map.resize(), 300);
    return () => {
      ro?.disconnect();
      window.clearTimeout(kick);
      map.remove();
      mapRef.current = null;
      if (ref) {
        if (typeof ref === "function") ref(null);
        else (ref as React.MutableRefObject<MLMap | null>).current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style switch (skip the style the map was constructed with).
  useEffect(() => {
    if (!mapRef.current || !mapStyle || appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;
    mapRef.current.setStyle(mapStyle);
  }, [mapStyle]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
});

export { maplibregl };

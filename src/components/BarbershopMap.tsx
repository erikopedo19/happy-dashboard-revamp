import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Search, MapPin, MoveHorizontal, Sparkles } from "lucide-react";
import { Map, type MapRef, maplibregl } from "@/components/ui/map";
import { normalizeHex, readableTextOn } from "@/lib/barberTheme";

interface Barbershop {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  /** Pin fill color (barber theme color). */
  color?: string;
  avatarUrl?: string | null;
  initial?: string;
  vip?: boolean;
}

interface BarbershopMapProps {
  barbershops: Barbershop[];
  userLocation?: { lat: number; lng: number };
  initialCenter?: { lat: number; lng: number };
  height?: string;
  onBarbershopClick?: (barbershop: Barbershop) => void;
  showControls?: boolean;
  pickMode?: boolean;
  onLocationPick?: (coords: { lat: number; lng: number }) => void;
  accentColor?: string;
  hideSearch?: boolean;
  /** Highlights this pin and eases the camera to it. */
  selectedId?: string | null;
  /** Zoom out to fit every pin whenever the set of pins changes. */
  fitToMarkers?: boolean;
  /** Increment to fly the camera back to the user's location. */
  recenterSignal?: number;
  /** Show the +/- zoom buttons. */
  showZoomControls?: boolean;
}

type PinEntry = { marker: maplibregl.Marker; inner: HTMLDivElement; shop: Barbershop; sig: string };

const PIN_STYLE_ID = "barbershop-map-pin-styles-v2";
const CLUSTER_RADIUS_PX = 48;
const SPREAD_ZOOM = 16;

// The marker root is positioned by maplibre via `transform`, so all visual
// animation lives on the inner element to keep pins glued to the map.
function ensurePinStyles() {
  if (typeof document === "undefined" || document.getElementById(PIN_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PIN_STYLE_ID;
  style.textContent = `
@keyframes bsm-pop { from { transform: scale(.4); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes bsm-pulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(3.2); opacity: 0 } }
@keyframes bsm-ring { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
.bsm-pin { position: relative; width: 40px; height: 48px; cursor: pointer; transform-origin: 50% 100%; animation: bsm-pop .32s cubic-bezier(.2,.9,.3,1.25) both; transition: transform .25s cubic-bezier(.2,.9,.3,1.2), filter .25s ease; -webkit-tap-highlight-color: transparent; }
.bsm-pin[data-selected="true"] { transform: scale(1.18); filter: drop-shadow(0 10px 18px var(--bsm-glow)); }
.bsm-pin-drop { position: absolute; left: 2px; top: 0; width: 36px; height: 36px; border-radius: 50% 50% 50% 6px; transform: rotate(-45deg); background: var(--bsm-color); border: 2.5px solid #fff; box-shadow: 0 6px 16px var(--bsm-glow), 0 2px 4px rgba(0,0,0,.25); }
.bsm-pin-face { position: absolute; left: 6px; top: 4px; width: 28px; height: 28px; border-radius: 9999px; overflow: hidden; display: flex; align-items: center; justify-content: center; font: 600 13px/1 system-ui, -apple-system, sans-serif; }
.bsm-pin-face img { width: 100%; height: 100%; object-fit: cover; }
.bsm-pin-ring { position: absolute; left: 6px; top: 4px; width: 28px; height: 28px; border-radius: 9999px; border: 2px solid var(--bsm-color); opacity: 0; pointer-events: none; }
.bsm-pin[data-selected="true"] .bsm-pin-ring { animation: bsm-ring 1.6s ease-out infinite; }
.bsm-pin-dot { position: absolute; left: 50%; bottom: 0; width: 8px; height: 4px; margin-left: -4px; border-radius: 50%; background: rgba(0,0,0,.35); filter: blur(1px); }
.bsm-pin-badge { position: absolute; top: -7px; right: -6px; font-size: 13px; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
.bsm-cluster { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 9999px; padding: 3px; cursor: pointer; background: var(--bsm-ring-bg); box-shadow: 0 8px 22px rgba(0,0,0,.4); animation: bsm-pop .3s cubic-bezier(.2,.9,.3,1.25) both; transition: transform .2s ease; -webkit-tap-highlight-color: transparent; }
.bsm-cluster:active { transform: scale(.92); }
.bsm-cluster span { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 9999px; background: #1C1C1E; color: #fff; font: 700 14px/1 system-ui, -apple-system, sans-serif; }
.bsm-user { position: relative; width: 16px; height: 16px; }
.bsm-user::before { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: #0A84FF; animation: bsm-pulse 2s ease-out infinite; }
.bsm-user::after { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: #0A84FF; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); }
`;
  document.head.appendChild(style);
}

const pinSignature = (s: Barbershop) => [s.color, s.avatarUrl, s.initial, s.vip, s.name].join("|");

function buildPin(shop: Barbershop) {
  const color = normalizeHex(shop.color) || "#48484a";
  const fallback = shop.initial || shop.name.trim().charAt(0).toUpperCase() || "B";
  const root = document.createElement("div");
  const inner = document.createElement("div");
  inner.className = "bsm-pin";
  inner.style.setProperty("--bsm-color", color);
  inner.style.setProperty("--bsm-glow", `${color}66`);

  const dot = document.createElement("div");
  dot.className = "bsm-pin-dot";
  const drop = document.createElement("div");
  drop.className = "bsm-pin-drop";
  const face = document.createElement("div");
  face.className = "bsm-pin-face";
  face.style.color = readableTextOn(color);
  if (shop.avatarUrl) {
    const img = document.createElement("img");
    img.src = shop.avatarUrl;
    img.alt = "";
    img.decoding = "async";
    img.onerror = () => {
      img.remove();
      face.textContent = fallback;
    };
    face.appendChild(img);
  } else {
    face.textContent = fallback;
  }
  const ring = document.createElement("div");
  ring.className = "bsm-pin-ring";
  inner.append(dot, drop, face, ring);

  if (shop.vip) {
    const badge = document.createElement("span");
    badge.className = "bsm-pin-badge";
    badge.textContent = "👑";
    inner.appendChild(badge);
  }
  root.appendChild(inner);
  return { root, inner };
}

function buildPopupContent(shop: Barbershop) {
  const el = document.createElement("div");
  el.style.padding = "4px";
  const title = document.createElement("strong");
  title.textContent = shop.name;
  el.appendChild(title);
  for (const line of [shop.location, shop.contact_phone]) {
    if (!line) continue;
    el.appendChild(document.createElement("br"));
    const span = document.createElement("span");
    span.style.cssText = "opacity:0.7;font-size:12px;";
    span.textContent = line;
    el.appendChild(span);
  }
  return el;
}

function buildCluster(members: Barbershop[]) {
  const colors = Array.from(new Set(members.map((m) => normalizeHex(m.color) || "#48484a"))).slice(0, 4);
  const step = 360 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(", ");
  const root = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.className = "bsm-cluster";
  bubble.style.setProperty("--bsm-ring-bg", colors.length > 1 ? `conic-gradient(${stops})` : colors[0]);
  const label = document.createElement("span");
  label.textContent = String(members.length);
  bubble.appendChild(label);
  root.appendChild(bubble);
  return root;
}

// Gives the flat openfreemap dark style some depth: navy water, green parks,
// rose-tinted major roads and brighter labels.
const DARK_PALETTE: Array<[string, string, string]> = [
  ["background", "background-color", "#111216"],
  ["water", "fill-color", "#0c2236"],
  ["waterway", "line-color", "#0c2236"],
  ["landuse_residential", "fill-color", "#16161b"],
  ["landcover_wood", "fill-color", "#11241a"],
  ["landuse_park", "fill-color", "#132a1d"],
  ["building", "fill-color", "#1b1b22"],
  ["building", "fill-outline-color", "#262630"],
  ["highway_minor", "line-color", "#212128"],
  ["highway_major_subtle", "line-color", "#2d2a33"],
  ["highway_motorway_subtle", "line-color", "#3a2730"],
  ["highway_major_casing", "line-color", "rgba(251,113,133,0.22)"],
  ["highway_motorway_casing", "line-color", "rgba(251,113,133,0.32)"],
  ["boundary_country_z0-4", "line-color", "#3f3f46"],
  ["boundary_country_z5-", "line-color", "#3f3f46"],
  ["water_name", "text-color", "#4a7ba7"],
  ["water_name", "text-halo-color", "rgba(0,0,0,0.6)"],
  ...["place_other", "place_suburb", "place_village", "place_town", "place_city", "place_city_large", "place_state", "place_country_other", "place_country_minor", "place_country_major"].map(
    (id) => [id, "text-color", "#a1a1aa"] as [string, string, string],
  ),
];

function applyDarkPalette(map: maplibregl.Map) {
  for (const [layer, prop, value] of DARK_PALETTE) {
    if (!map.getLayer(layer)) continue;
    try {
      map.setPaintProperty(layer, prop, value);
    } catch {
      // Layer schema changed upstream; skip.
    }
  }
}

const STORAGE_KEY = "barbershop-map-location";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const buildGoogleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export function BarbershopMap({
  barbershops,
  userLocation,
  initialCenter,
  height = "400px",
  onBarbershopClick,
  showControls = true,
  pickMode = false,
  onLocationPick,
  accentColor,
  hideSearch = false,
  selectedId = null,
  fitToMarkers = false,
  recenterSignal = 0,
  showZoomControls = true,
}: BarbershopMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const mapRef = useRef<MapRef | null>(null);
  const pinsRef = useRef<globalThis.Map<string, PinEntry>>(new globalThis.Map());
  const clustersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pickMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clickRef = useRef(onBarbershopClick);
  clickRef.current = onBarbershopClick;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(() => {
    if (initialCenter) return [initialCenter.lat, initialCenter.lng];
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return [parsed.lat, parsed.lng];
      }
    } catch {
      // Ignore storage issues.
    }
    return null;
  });
  const [zoom, setZoom] = useState(pickMode ? 15 : 13);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(
    initialCenter ?? null,
  );
  const searchAbort = useRef<AbortController | null>(null);

  function persist(c: [number, number]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: c[0], lng: c[1] }));
    } catch {
      // Ignore storage issues.
    }
  }

  const validBarbershops = useMemo(
    () => barbershops.filter((barbershop) => typeof barbershop.latitude === "number" && typeof barbershop.longitude === "number"),
    [barbershops],
  );
  const autoFit = fitToMarkers && !pickMode && validBarbershops.length > 0;

  useEffect(() => {
    if (initialCenter) {
      const next: [number, number] = [initialCenter.lat, initialCenter.lng];
      setCenter(next);
      setPickedLocation(initialCenter);
      persist(next);
      return;
    }

    if (userLocation) {
      const next: [number, number] = [userLocation.lat, userLocation.lng];
      setCenter(next);
      persist(next);
      return;
    }

    if (center) return;

    // When the camera is going to fit the pins anyway, mount on the pins
    // straight away — waiting on a geolocation round-trip (which can hang
    // silently inside WebViews) left the map stuck on "Loading map…".
    if (autoFit) {
      const lat = validBarbershops.reduce((s, b) => s + b.latitude!, 0) / validBarbershops.length;
      const lng = validBarbershops.reduce((s, b) => s + b.longitude!, 0) / validBarbershops.length;
      setCenter([lat, lng]);
      return;
    }

    const fallback = () => setCenter([40.7128, -74.006]);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCenter(next);
          persist(next);
        },
        fallback,
        { timeout: 8000, maximumAge: 300000 },
      );
    } else {
      fallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter?.lat, initialCenter?.lng, userLocation?.lat, userLocation?.lng, autoFit]);

  useEffect(() => {
    // When auto-fitting to pins, the fit effect owns the camera.
    if (autoFit) return;
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center: [center[1], center[0]], zoom, essential: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom]);

  // Screen-space clustering: pins closer than CLUSTER_RADIUS_PX merge into a
  // colored count bubble; at street level identical spots fan out instead.
  const recluster = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    clustersRef.current.forEach((m) => m.remove());
    clustersRef.current = [];
    const entries = Array.from(pinsRef.current.values());
    entries.forEach((e) => {
      e.marker.getElement().style.display = "";
      e.marker.setOffset([0, 0]);
    });
    if (pickMode || entries.length < 2) return;

    const z = map.getZoom();
    const pts = entries.map((e) => ({ e, p: map.project(e.marker.getLngLat()) }));
    const used = new Set<number>();
    pts.forEach((a, i) => {
      if (used.has(i) || a.e.shop.id === selectedRef.current) return;
      const group = [i];
      used.add(i);
      pts.forEach((b, j) => {
        if (used.has(j) || b.e.shop.id === selectedRef.current) return;
        if (Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) < CLUSTER_RADIUS_PX) {
          group.push(j);
          used.add(j);
        }
      });
      if (group.length < 2) return;
      const members = group.map((k) => pts[k].e);

      if (z >= SPREAD_ZOOM) {
        members.forEach((m, k) => {
          const angle = (2 * Math.PI * k) / members.length - Math.PI / 2;
          m.marker.setOffset([Math.cos(angle) * 30, Math.sin(angle) * 30]);
        });
        return;
      }

      members.forEach((m) => (m.marker.getElement().style.display = "none"));
      const lng = members.reduce((s, m) => s + m.marker.getLngLat().lng, 0) / members.length;
      const lat = members.reduce((s, m) => s + m.marker.getLngLat().lat, 0) / members.length;
      const el = buildCluster(members.map((m) => m.shop));
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        const bounds = new maplibregl.LngLatBounds();
        members.forEach((m) => bounds.extend(m.marker.getLngLat()));
        const tiny = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 30;
        if (tiny) map.easeTo({ center: [lng, lat], zoom: SPREAD_ZOOM + 0.5, duration: 600 });
        else map.fitBounds(bounds, { padding: 90, maxZoom: SPREAD_ZOOM + 0.5, duration: 700 });
      });
      clustersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map));
    });
  }, [pickMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    // moveend covers pans as well as zooms — a zoomend-only listener left
    // stale clusters and hidden pins behind after dragging the map.
    map.on("moveend", recluster);
    return () => {
      map.off("moveend", recluster);
    };
  }, [mapReady, recluster]);

  // User location dot — only when a real position was supplied; a stored map
  // center is not the user, so never label it "You are here".
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || pickMode || !userLocation) return;
    const pos = userLocation;
    ensurePinStyles();
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "bsm-user";
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("You are here"))
        .setLngLat([pos.lng, pos.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([pos.lng, pos.lat]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, pickMode, userLocation?.lat, userLocation?.lng]);

  // Barber pins — diffed by id so taps and re-renders don't rebuild the DOM.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    ensurePinStyles();
    const pins = pinsRef.current;
    const nextIds = new Set(validBarbershops.map((b) => b.id));
    pins.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        pins.delete(id);
      }
    });
    validBarbershops.forEach((shop) => {
      const sig = pinSignature(shop);
      const existing = pins.get(shop.id);
      if (existing && existing.sig === sig) {
        existing.marker.setLngLat([shop.longitude!, shop.latitude!]);
        existing.shop = shop;
        return;
      }
      existing?.marker.remove();
      const { root, inner } = buildPin(shop);
      inner.dataset.selected = String(shop.id === selectedRef.current);
      const marker = new maplibregl.Marker({ element: root, anchor: "bottom" }).setLngLat([shop.longitude!, shop.latitude!]);
      const entry: PinEntry = { marker, inner, shop, sig };
      root.addEventListener("click", (event) => {
        if (!clickRef.current) return;
        event.stopPropagation();
        clickRef.current(entry.shop);
      });
      if (!onBarbershopClick) {
        marker.setPopup(new maplibregl.Popup({ offset: 44 }).setDOMContent(buildPopupContent(shop)));
      }
      marker.addTo(map);
      pins.set(shop.id, entry);
    });
    recluster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validBarbershops, mapReady, recluster]);

  useEffect(() => {
    const pins = pinsRef.current;
    return () => {
      pins.forEach((e) => e.marker.remove());
      pins.clear();
      clustersRef.current.forEach((m) => m.remove());
      userMarkerRef.current?.remove();
      pickMarkerRef.current?.remove();
    };
  }, []);

  // Pick mode: draggable-feel pin + tap handler.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !pickMode) return;
    pickMarkerRef.current?.remove();
    pickMarkerRef.current = null;
    if (pickedLocation) {
      const markerEl = document.createElement("div");
      markerEl.style.cssText =
        "width:26px;height:26px;border-radius:9999px;background:#fff;box-shadow:0 0 0 8px rgba(255,45,85,0.16),0 14px 30px rgba(255,45,85,0.28);border:3px solid #ff2d55;";
      pickMarkerRef.current = new maplibregl.Marker({ element: markerEl })
        .setLngLat([pickedLocation.lng, pickedLocation.lat])
        .addTo(map);
    }
    const onClick = (event: maplibregl.MapMouseEvent) => {
      const next = { lat: event.lngLat.lat, lng: event.lngLat.lng };
      setPickedLocation(next);
      onLocationPick?.(next);
      setCenter([next.lat, next.lng]);
      setZoom(16);
      persist([next.lat, next.lng]);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [mapReady, pickMode, pickedLocation, onLocationPick]);

  const pinsKey = useMemo(() => validBarbershops.map((b) => b.id).join("|"), [validBarbershops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!autoFit || !map || !mapReady) return;
    const bounds = new maplibregl.LngLatBounds();
    validBarbershops.forEach((b) => bounds.extend([b.longitude!, b.latitude!]));
    // Only include the user when they're actually near a barber, otherwise the
    // camera zooms out to show half the planet.
    if (userLocation) {
      const nearest = Math.min(...validBarbershops.map((b) => distanceKm(userLocation, { lat: b.latitude!, lng: b.longitude! })));
      if (nearest <= 50) bounds.extend([userLocation.lng, userLocation.lat]);
    }
    map.fitBounds(bounds, { padding: { top: 130, bottom: 320, left: 50, right: 50 }, maxZoom: 15, duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey, autoFit, mapReady, userLocation?.lat, userLocation?.lng]);

  // Selection: toggle a data attribute instead of rebuilding pins.
  useEffect(() => {
    pinsRef.current.forEach((e) => {
      e.inner.dataset.selected = String(e.shop.id === selectedId);
    });
    const map = mapRef.current;
    if (!map || !mapReady) return;
    recluster();
    const entry = selectedId ? pinsRef.current.get(selectedId) : undefined;
    if (!entry) return;
    map.easeTo({
      center: entry.marker.getLngLat(),
      zoom: Math.max(map.getZoom(), 14),
      offset: [0, -90],
      duration: 650,
    });
  }, [selectedId, mapReady, recluster]);

  useEffect(() => {
    if (!recenterSignal) return;
    const map = mapRef.current;
    const target = userLocation ?? (center ? { lat: center[0], lng: center[1] } : null);
    if (!map || !target) return;
    map.flyTo({ center: [target.lng, target.lat], zoom: 14, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  const handleStyleLoad = useCallback((map: maplibregl.Map) => {
    if (isDarkRef.current) applyDarkPalette(map);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;

    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );
      const data = await response.json();
      if (Array.isArray(data) && data[0]) {
        const next: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(next);
        setZoom(pickMode ? 15 : 14);
        persist(next);
        if (pickMode) {
          const current = { lat: next[0], lng: next[1] };
          setPickedLocation(current);
          onLocationPick?.(current);
        }
      }
    } catch {
      // Ignore failed searches.
    } finally {
      setSearching(false);
    }
  }

  function locateMe() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const next: [number, number] = [position.coords.latitude, position.coords.longitude];
      setCenter(next);
      setZoom(pickMode ? 15 : 14);
      persist(next);
    });
  }

  const currentGoogleMapsUrl = pickedLocation ? buildGoogleMapsUrl(pickedLocation.lat, pickedLocation.lng) : "";

  if (!center) {
    return (
      <div
        className="flex items-center justify-center rounded-[28px] bg-muted text-muted-foreground"
        style={{ height }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={hideSearch ? { height: "100%" } : { minHeight: height }}>
      {showControls && !hideSearch && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-3 rounded-[28px] border border-white/40 bg-white/75 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1C1C1E]/75"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={pickMode ? "Search your business address..." : "Search a city or address..."}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-12 rounded-2xl border-white/60 bg-white/90 pl-11 shadow-none placeholder:text-muted-foreground/70 dark:border-white/10 dark:bg-[#1C1C1E]/90"
                  />
                </div>
                <Button type="submit" disabled={searching} className="sm:min-w-28 rounded-2xl">
                  {searching ? "Searching..." : "Search"}
                </Button>
                <Button type="button" variant="outline" onClick={locateMe} title="Use my location" className="rounded-2xl">
                  <LocateFixed className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
          {pickMode && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#3C3C43] dark:text-[#EBEBF5]/75">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF2D55]/10 px-3 py-1 font-medium text-[#FF2D55]">
                <Sparkles className="h-3.5 w-3.5" />
                Tap the map to drop the pin
              </span>
              {pickedLocation && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#007AFF]/10 px-3 py-1 font-medium text-[#007AFF]">
                  <MapPin className="h-3.5 w-3.5" />
                  {pickedLocation.lat.toFixed(4)}, {pickedLocation.lng.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </motion.div>
      )}

      <div
        className={`relative w-full overflow-hidden ${hideSearch ? "rounded-none border-0 shadow-none ring-0 flex-1" : "rounded-[34px] border border-white/50 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10"} [&_.maplibregl-ctrl-attrib]:hidden [&_.maplibregl-ctrl-logo]:hidden`}
        style={hideSearch ? { height: "100%" } : { height }}
      >
        <Map
          ref={mapRef}
          mapStyle={isDark ? STYLES.dark : STYLES.light}
          initialViewState={{
            longitude: center[1],
            latitude: center[0],
            zoom,
          }}
          onLoad={(m) => { mapRef.current = m; setMapReady(true); }}
          onStyleLoad={handleStyleLoad}
          navigationControl={showZoomControls}
          style={{ height: "100%", width: "100%" }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.04] via-transparent to-transparent dark:from-black/10" />

        {pickMode && currentGoogleMapsUrl && (
          <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-2 rounded-[22px] border border-white/40 bg-white/75 px-3 py-3 text-xs shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1C1C1E]/80">
            <div className="min-w-0">
              <p className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Business pin ready</p>
              <p className="truncate text-[#8E8E93]">Saved via Google Maps link on submit.</p>
            </div>
            <a
              href={currentGoogleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1C1C1E] px-3 py-2 font-medium text-white"
            >
              <MoveHorizontal className="h-3.5 w-3.5" />
              Open map
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

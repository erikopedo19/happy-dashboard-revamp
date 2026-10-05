import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  /** Zoom out to fit every pin (plus the user) whenever the set of pins changes. */
  fitToMarkers?: boolean;
  /** Increment to fly the camera back to the user's location. */
  recenterSignal?: number;
}

const PIN_STYLE_ID = "barbershop-map-pin-styles";

function ensurePinStyles() {
  if (typeof document === "undefined" || document.getElementById(PIN_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PIN_STYLE_ID;
  style.textContent = `
@keyframes bsm-pulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(3.2); opacity: 0 } }
.bsm-pin { position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform-origin: 50% 100%; transition: transform .2s cubic-bezier(.2,.9,.3,1.3); }
.bsm-pin:hover { transform: scale(1.08); }
.bsm-pin[data-selected="true"] { transform: scale(1.22); z-index: 2; }
.bsm-pin-head { width: 40px; height: 40px; border-radius: 9999px; border: 3px solid #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; font: 600 16px/1 system-ui, -apple-system, sans-serif; box-shadow: 0 10px 24px rgba(0,0,0,.28); }
.bsm-pin[data-selected="true"] .bsm-pin-head { box-shadow: 0 0 0 4px var(--bsm-ring), 0 14px 30px rgba(0,0,0,.35); }
.bsm-pin-head img { width: 100%; height: 100%; object-fit: cover; }
.bsm-pin-tail { width: 0; height: 0; margin-top: -2px; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #fff; }
.bsm-pin-badge { position: absolute; top: -6px; right: -8px; font-size: 13px; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
.bsm-user { position: relative; width: 16px; height: 16px; }
.bsm-user::before { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: #0A84FF; animation: bsm-pulse 2s ease-out infinite; }
.bsm-user::after { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: #0A84FF; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); }
`;
  document.head.appendChild(style);
}

function buildPinElement(shop: Barbershop, selected: boolean) {
  const color = shop.color || "#48484A";
  const root = document.createElement("div");
  root.className = "bsm-pin";
  root.dataset.selected = String(selected);
  root.style.setProperty("--bsm-ring", `${color}66`);

  const head = document.createElement("div");
  head.className = "bsm-pin-head";
  head.style.background = color;
  const hex = normalizeHex(color);
  head.style.color = hex ? readableTextOn(hex) : "#fff";
  if (shop.avatarUrl) {
    const img = document.createElement("img");
    img.src = shop.avatarUrl;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => {
      img.remove();
      head.textContent = shop.initial || shop.name.trim().charAt(0).toUpperCase() || "B";
    };
    head.appendChild(img);
  } else {
    head.textContent = shop.initial || shop.name.trim().charAt(0).toUpperCase() || "B";
  }
  root.appendChild(head);

  const tail = document.createElement("div");
  tail.className = "bsm-pin-tail";
  root.appendChild(tail);

  if (shop.vip) {
    const badge = document.createElement("span");
    badge.className = "bsm-pin-badge";
    badge.textContent = "👑";
    root.appendChild(badge);
  }
  return root;
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

const STORAGE_KEY = "barbershop-map-location";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const buildGoogleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

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
}: BarbershopMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const mapRef = useRef<MapRef | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clickHandlerRef = useRef<((event: maplibregl.MapMouseEvent) => void) | null>(null);

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

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCenter(next);
          persist(next);
        },
        () => setCenter([40.7128, -74.006]),
      );
    } else {
      setCenter([40.7128, -74.006]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter, userLocation]);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center: [center[1], center[0]], zoom, essential: true });
    }
  }, [center, zoom]);

  const validBarbershops = useMemo(
    () => barbershops.filter((barbershop) => typeof barbershop.latitude === "number" && typeof barbershop.longitude === "number"),
    [barbershops],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !center) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    ensurePinStyles();

    if (!pickMode) {
      const userEl = document.createElement("div");
      userEl.className = "bsm-user";
      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([center[1], center[0]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("You are here"))
        .addTo(map);
      markersRef.current.push(userMarker);
    }

    validBarbershops.forEach((barbershop) => {
      const el = buildPinElement(barbershop, barbershop.id === selectedId);
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([
        barbershop.longitude!,
        barbershop.latitude!,
      ]);
      if (onBarbershopClick) {
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onBarbershopClick(barbershop);
        });
      } else {
        marker.setPopup(new maplibregl.Popup({ offset: 36 }).setDOMContent(buildPopupContent(barbershop)));
      }
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    if (pickMode && pickedLocation) {
      const markerEl = document.createElement("div");
      markerEl.style.cssText =
        "width:26px;height:26px;border-radius:9999px;background:#fff;box-shadow:0 0 0 8px rgba(255,45,85,0.16),0 14px 30px rgba(255,45,85,0.28);border:3px solid #ff2d55;";
      selectedMarkerRef.current = new maplibregl.Marker({ element: markerEl })
        .setLngLat([pickedLocation.lng, pickedLocation.lat])
        .addTo(map);
      markersRef.current.push(selectedMarkerRef.current);
    }

    if (pickMode) {
      clickHandlerRef.current = (event) => {
        const next = { lat: event.lngLat.lat, lng: event.lngLat.lng };
        setPickedLocation(next);
        onLocationPick?.(next);
        setCenter([next.lat, next.lng]);
        setZoom(16);
        persist([next.lat, next.lng]);
      };
      map.on("click", clickHandlerRef.current);
    }

    return () => {
      if (clickHandlerRef.current) {
        map.off("click", clickHandlerRef.current);
      }
    };
  }, [validBarbershops, center, onBarbershopClick, pickMode, pickedLocation, mapReady, onLocationPick, selectedId]);

  const pinsKey = useMemo(() => validBarbershops.map((b) => b.id).join("|"), [validBarbershops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!fitToMarkers || pickMode || !map || !mapReady || validBarbershops.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    validBarbershops.forEach((b) => bounds.extend([b.longitude!, b.latitude!]));
    if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
    map.fitBounds(bounds, { padding: { top: 130, bottom: 300, left: 50, right: 50 }, maxZoom: 15, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey, fitToMarkers, mapReady, pickMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;
    const shop = validBarbershops.find((b) => b.id === selectedId);
    if (!shop) return;
    map.easeTo({
      center: [shop.longitude!, shop.latitude!],
      zoom: Math.max(map.getZoom(), 14),
      offset: [0, -90],
      duration: 650,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mapReady]);

  useEffect(() => {
    if (!recenterSignal) return;
    const map = mapRef.current;
    const target = userLocation ?? (center ? { lat: center[0], lng: center[1] } : null);
    if (!map || !target) return;
    map.flyTo({ center: [target.lng, target.lat], zoom: 14, essential: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

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
          onLoad={(m: any) => { mapRef.current = m; setMapReady(true); }}
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

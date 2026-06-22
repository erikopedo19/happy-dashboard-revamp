import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Search, MapPin, MoveHorizontal, Sparkles } from "lucide-react";
import { Map, type MapRef, maplibregl } from "@/components/ui/map";

interface Barbershop {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
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

    if (!pickMode) {
      const userEl = document.createElement("div");
      userEl.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([center[1], center[0]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("You are here"))
        .addTo(map);
      markersRef.current.push(userMarker);
    }

    validBarbershops.forEach((barbershop) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:34px;height:34px;border-radius:9999px;background:linear-gradient(135deg,hsl(var(--primary)),rgba(255,255,255,0.7));border:3px solid white;box-shadow:0 10px 24px rgba(0,0,0,0.24);cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;";
      el.textContent = "•";
      el.addEventListener("click", () => onBarbershopClick?.(barbershop));
      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
        `<div style="padding:4px;"><strong>${barbershop.name}</strong><br/><span style="opacity:0.7;font-size:12px;">${barbershop.location}</span>${
          barbershop.contact_phone
            ? `<br/><span style="opacity:0.7;font-size:12px;">${barbershop.contact_phone}</span>`
            : ""
        }</div>`,
      );
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([barbershop.longitude!, barbershop.latitude!])
        .setPopup(popup)
        .addTo(map);
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
  }, [validBarbershops, center, onBarbershopClick, pickMode, pickedLocation, mapReady, onLocationPick]);

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
    <div className="w-full h-full flex flex-col" style={{ minHeight: height }}>
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
        className="relative w-full overflow-hidden rounded-[34px] border border-white/50 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10 [&_.maplibregl-ctrl-attrib]:hidden [&_.maplibregl-ctrl-logo]:hidden"
        style={{ height }}
      >
        <Map
          ref={mapRef}
          mapStyle={isDark ? STYLES.dark : STYLES.light}
          initialViewState={{
            longitude: center[1],
            latitude: center[0],
            zoom,
          }}
          onLoad={() => setMapReady(true)}
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

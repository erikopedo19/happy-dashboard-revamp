import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Search } from "lucide-react";
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
  height?: string;
  onBarbershopClick?: (barbershop: Barbershop) => void;
  showControls?: boolean;
}

const STORAGE_KEY = "barbershop-map-location";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export function BarbershopMap({
  barbershops,
  userLocation,
  height = "400px",
  onBarbershopClick,
  showControls = true,
}: BarbershopMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const mapRef = useRef<MapRef | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [center, setCenter] = useState<[number, number] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.lat === "number" && typeof p.lng === "number") return [p.lat, p.lng];
      }
    } catch {
      // Ignore storage issues.
    }
    return null;
  });
  const [zoom, setZoom] = useState(13);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  function persist(c: [number, number]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: c[0], lng: c[1] }));
    } catch {
      // Ignore storage issues.
    }
  }

  useEffect(() => {
    if (userLocation) {
      const next: [number, number] = [userLocation.lat, userLocation.lng];
      setCenter(next);
      persist(next);
      return;
    }

    if (center) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(next);
          persist(next);
        },
        () => setCenter([40.7128, -74.006]),
      );
    } else {
      setCenter([40.7128, -74.006]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center: [center[1], center[0]], zoom });
    }
  }, [center, zoom]);

  const validBarbershops = useMemo(
    () => barbershops.filter((b) => typeof b.latitude === "number" && typeof b.longitude === "number"),
    [barbershops],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const userEl = document.createElement("div");
    userEl.style.cssText =
      "width:14px;height:14px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
    const userMarker = new maplibregl.Marker({ element: userEl })
      .setLngLat([center[1], center[0]])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setText("You are here"))
      .addTo(map);
    markersRef.current.push(userMarker);

    validBarbershops.forEach((barbershop) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:30px;height:30px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;";
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
  }, [validBarbershops, center, onBarbershopClick]);

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
        setZoom(14);
        persist(next);
      }
    } catch {
      // Ignore failed searches.
    } finally {
      setSearching(false);
    }
  }

  function locateMe() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setCenter(next);
      setZoom(14);
      persist(next);
    });
  }

  if (!center) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-muted text-muted-foreground"
        style={{ height }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {showControls && (
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search a city or address..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={searching} className="sm:min-w-28">
            {searching ? "Searching..." : "Search"}
          </Button>
          <Button type="button" variant="outline" onClick={locateMe} title="Use my location">
            <LocateFixed className="h-4 w-4" />
          </Button>
        </form>
      )}

      <div className="relative w-full overflow-hidden rounded-2xl border border-border shadow-sm [&_.maplibregl-ctrl-attrib]:hidden [&_.maplibregl-ctrl-logo]:hidden">
        <Map
          ref={mapRef}
          mapStyle={isDark ? STYLES.dark : STYLES.light}
          initialViewState={{
            longitude: center[1],
            latitude: center[0],
            zoom,
          }}
          style={{ height, width: "100%" }}
        />
      </div>
    </div>
  );
}

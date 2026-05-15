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
    } catch {}
    return null;
  });
  const [zoom, setZoom] = useState(13);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  function persist(c: [number, number]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: c[0], lng: c[1] }));
    } catch {}
  }

  // Initial center
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

  // Fly to center/zoom changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center: [center[1], center[0]], zoom });
    }
  }, [center, zoom]);

  const validBarbershops = useMemo(
    () => barbershops.filter((b) => b.latitude && b.longitude),
    [barbershops],
  );

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // user marker
    const userEl = document.createElement("div");
    userEl.style.cssText =
      "width:14px;height:14px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
    const userMarker = new maplibregl.Marker({ element: userEl })
      .setLngLat([center[1], center[0]])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setText("You are here"))
      .addTo(map);
    markersRef.current.push(userMarker);

    validBarbershops.forEach((b) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:30px;height:30px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;";
      el.textContent = "✂";
      el.addEventListener("click", () => onBarbershopClick?.(b));
      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
        `<div style="padding:4px;"><strong>${b.name}</strong><br/><span style="opacity:0.7;font-size:12px;">${b.location}</span>${
          b.contact_phone
            ? `<br/><span style="opacity:0.7;font-size:12px;">${b.contact_phone}</span>`
            : ""
        }</div>`,
      );
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([b.longitude!, b.latitude!])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [validBarbershops, center, onBarbershopClick]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    searchAbort.current?.abort();
    const ctrl = new AbortController();
    searchAbort.current = ctrl;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { signal: ctrl.signal, headers: { Accept: "application/json" } },
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const next: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(next);
        setZoom(14);
        persist(next);
      }
    } catch {
      /* ignore */
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
        className="w-full bg-muted rounded-2xl flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search a city or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? "…" : "Search"}
        </Button>
        <Button type="button" variant="outline" onClick={locateMe} title="Use my location">
          <LocateFixed className="h-4 w-4" />
        </Button>
      </form>

      <div className="w-full rounded-2xl overflow-hidden border border-border">
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

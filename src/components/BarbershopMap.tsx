import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Search } from "lucide-react";

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

type LeafletMods = {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
  useMap: any;
  L: any;
};

function MapController({
  center,
  zoom,
  useMap,
}: {
  center: [number, number];
  zoom: number;
  useMap: any;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function BarbershopMap({
  barbershops,
  userLocation,
  height = "400px",
  onBarbershopClick,
}: BarbershopMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [mods, setMods] = useState<LeafletMods | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          return [parsed.lat, parsed.lng];
        }
      }
    } catch {}
    return null;
  });
  const [zoom, setZoom] = useState(13);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  // Dynamic ESM import (no require())
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rl, leaflet] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      await import("leaflet/dist/leaflet.css");
      const L = (leaflet as any).default ?? leaflet;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      if (cancelled) return;
      setMods({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
        useMap: rl.useMap,
        L,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize center: prop > saved > geolocation > fallback
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
        () => setCenter([40.7128, -74.006])
      );
    } else {
      setCenter([40.7128, -74.006]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  function persist(c: [number, number]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: c[0], lng: c[1] }));
    } catch {}
  }

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
        { signal: ctrl.signal, headers: { Accept: "application/json" } }
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

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const validBarbershops = useMemo(
    () => barbershops.filter((b) => b.latitude && b.longitude),
    [barbershops]
  );

  if (!mods || !center) {
    return (
      <div
        className="w-full bg-muted rounded-2xl flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = mods;

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
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height, width: "100%" }}
          className="z-0"
          attributionControl={false}
        >
          <TileLayer url={tileUrl} />
          <MapController center={center} zoom={zoom} useMap={useMap} />

          <Marker position={center}>
            <Popup>You are here</Popup>
          </Marker>

          {validBarbershops.map((b) => (
            <Marker
              key={b.id}
              position={[b.latitude!, b.longitude!]}
              eventHandlers={{ click: () => onBarbershopClick?.(b) }}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-semibold">{b.name}</h3>
                  <p className="text-sm opacity-70">{b.location}</p>
                  {b.contact_phone && <p className="text-sm opacity-70">{b.contact_phone}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Search, MapPin, Loader2 } from "lucide-react";

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
  onLocationPick?: (location: { lat: number; lng: number }) => void;
  pickMode?: boolean;
  /** Hex color for barbershop pins. Defaults to rose `#e11d48`. */
  accentColor?: string;
  /** Hide the built-in search bar (e.g. when the parent provides its own). */
  hideSearch?: boolean;
}

const STORAGE_KEY = "barbershop-map-location";
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

// Smooth, minimal Google Maps styles
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfdbfe" }] },
];

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e3a8a" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1e3d" }] },
];

// Singleton loader for the Google Maps JS API
let mapsPromise: Promise<typeof google> | null = null;
let authFailed = false;
const authFailureListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  (window as any).gm_authFailure = () => {
    authFailed = true;
    authFailureListeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  };
}
function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsPromise) return mapsPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps key missing"));

  mapsPromise = new Promise((resolve, reject) => {
    const cbName = "__lovable_initGoogleMaps__";
    (window as any)[cbName] = () => resolve((window as any).google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      callback: cbName,
      libraries: "places,marker",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

function pinSvg(color: string) {
  return `data:image/svg+xml;utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <defs>
        <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${color}" flood-opacity="0.45"/>
        </filter>
      </defs>
      <path filter="url(#s)" d="M22 2c-9.94 0-18 8.06-18 18 0 13 18 34 18 34s18-21 18-34c0-9.94-8.06-18-18-18z" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="22" cy="20" r="8.5" fill="white"/>
      <text x="22" y="25" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-size="14" font-weight="700" fill="${color}">✂</text>
    </svg>`,
  )}`;
}

export function BarbershopMap({
  barbershops,
  userLocation,
  height = "400px",
  onBarbershopClick,
  onLocationPick,
  pickMode = false,
  accentColor = "#e11d48",
  hideSearch = false,
}: BarbershopMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickedMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [radarActive, setRadarActive] = useState(true);

  function persist(c: [number, number]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: c[0], lng: c[1] }));
    } catch {}
  }

  // Resolve an initial center
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
        { timeout: 6000 },
      );
    } else {
      setCenter([40.7128, -74.006]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || !center || mapRef.current) return;
    let cancelled = false;
    const onAuthFail = () =>
      setError(
        "Google Maps couldn't authorize this domain. The map key is restricted — open this app on its lovable.app preview URL or add a custom Google Maps key for your custom domain.",
      );
    if (authFailed) onAuthFail();
    authFailureListeners.add(onAuthFail);
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        if (authFailed) return; // gm_authFailure already fired
        const map = new g.maps.Map(containerRef.current, {
          center: { lat: center[0], lng: center[1] },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: isDark ? DARK_STYLE : LIGHT_STYLE,
          backgroundColor: isDark ? "#0b1220" : "#f8fafc",
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();
        setReady(true);
      })
      .catch((e) => setError(e.message || "Map failed to load"));
    return () => {
      cancelled = true;
      authFailureListeners.delete(onAuthFail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center !== null]);

  // Theme switch
  useEffect(() => {
    if (mapRef.current) mapRef.current.setOptions({ styles: isDark ? DARK_STYLE : LIGHT_STYLE });
  }, [isDark]);

  // Pan to center + retrigger radar ping
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo({ lat: center[0], lng: center[1] });
      setRadarActive(true);
      const t = setTimeout(() => setRadarActive(false), 3200);
      return () => clearTimeout(t);
    }
  }, [center]);

  const validBarbershops = useMemo(
    () => barbershops.filter((b) => b.latitude && b.longitude),
    [barbershops],
  );

  // User marker
  useEffect(() => {
    if (!ready || !mapRef.current || !center) return;
    const g = (window as any).google as typeof google;
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = new g.maps.Marker({
      map: mapRef.current,
      position: { lat: center[0], lng: center[1] },
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#0A84FF",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      zIndex: 1,
      title: "You are here",
    });
  }, [ready, center]);

  // Barbershop markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google as typeof google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    validBarbershops.forEach((b) => {
      const marker = new g.maps.Marker({
        map: mapRef.current!,
        position: { lat: b.latitude!, lng: b.longitude! },
        icon: {
          url: pinSvg(accentColor),
          scaledSize: new g.maps.Size(36, 46),
          anchor: new g.maps.Point(18, 46),
        },
        title: b.name,
        animation: g.maps.Animation.DROP,
      });
      marker.addListener("click", () => {
        if (infoRef.current && mapRef.current) {
          infoRef.current.setContent(
            `<div style="padding:6px 4px;font-family:-apple-system,system-ui,sans-serif;min-width:180px;">
              <div style="font-weight:600;font-size:14px;color:#0f172a;">${b.name}</div>
              ${b.location ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${b.location}</div>` : ""}
              ${b.contact_phone ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${b.contact_phone}</div>` : ""}
            </div>`,
          );
          infoRef.current.open({ map: mapRef.current, anchor: marker });
        }
        onBarbershopClick?.(b);
      });
      markersRef.current.push(marker);
    });
  }, [ready, validBarbershops, onBarbershopClick]);

  // Pick mode click handler
  useEffect(() => {
    if (!ready || !mapRef.current || !pickMode) return;
    const g = (window as any).google as typeof google;
    const map = mapRef.current;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCenter([lat, lng]);
      persist([lat, lng]);
      onLocationPick?.({ lat, lng });
      pickedMarkerRef.current?.setMap(null);
      pickedMarkerRef.current = new g.maps.Marker({
        map,
        position: { lat, lng },
        icon: {
          url: pinSvg("#e11d48"),
          scaledSize: new g.maps.Size(40, 52),
          anchor: new g.maps.Point(20, 52),
        },
        animation: g.maps.Animation.DROP,
      });
    });
    map.getDiv().style.cursor = "crosshair";
    return () => {
      g.maps.event.removeListener(listener);
      if (mapRef.current) mapRef.current.getDiv().style.cursor = "";
    };
  }, [ready, pickMode, onLocationPick]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q || !ready) return;
    setSearching(true);
    try {
      const g = (window as any).google as typeof google;
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        (await g.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const sessionToken = new AutocompleteSessionToken();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken,
      });
      const first = suggestions[0]?.placePrediction;
      if (!first) return;
      const place = first.toPlace();
      await place.fetchFields({ fields: ["location"] });
      const loc = place.location;
      if (!loc) return;
      const next: [number, number] = [loc.lat(), loc.lng()];
      setCenter(next);
      persist(next);
      mapRef.current?.setZoom(15);
      if (pickMode) {
        onLocationPick?.({ lat: next[0], lng: next[1] });
        pickedMarkerRef.current?.setMap(null);
        pickedMarkerRef.current = new g.maps.Marker({
          map: mapRef.current!,
          position: { lat: next[0], lng: next[1] },
          icon: {
            url: pinSvg("#e11d48"),
            scaledSize: new g.maps.Size(40, 52),
            anchor: new g.maps.Point(20, 52),
          },
          animation: g.maps.Animation.DROP,
        });
      }
    } catch (err) {
      console.error("place search failed", err);
    } finally {
      setSearching(false);
    }
  }

  function locateMe() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setCenter(next);
      persist(next);
      mapRef.current?.setZoom(15);
    });
  }

  return (
    <div
      className="w-full rounded-[28px] overflow-hidden relative isolate shadow-[0_24px_60px_-30px_rgba(225,29,72,0.45)] ring-1 ring-black/5 dark:ring-white/10 bg-gradient-to-br from-sky-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      style={{ height }}
    >
      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Error / loading overlays */}
      {error ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center p-6 gap-3 bg-gradient-to-br from-white/95 to-rose-50/95 dark:from-slate-900/95 dark:to-slate-950/95 backdrop-blur-md">
          <div className="h-14 w-14 rounded-full bg-rose-500/15 flex items-center justify-center ring-4 ring-rose-500/10">
            <MapPin className="h-7 w-7 text-rose-500" />
          </div>
          <p className="text-sm font-medium text-foreground max-w-sm leading-relaxed">{error}</p>
        </div>
      ) : !center ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3">
          <div className="relative h-16 w-16">
            <span className="radar-ring" />
            <span className="radar-ring delay-1" />
            <span className="radar-dot" />
          </div>
          <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Locating you…</p>
        </div>
      ) : null}

      {/* Radar overlay at the center of the map (where the user marker sits when centered) */}
      {ready && !error && (
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
            radarActive || searching ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative h-[180px] w-[180px]">
            <span className="radar-ring" />
            <span className="radar-ring delay-1" />
            <span className="radar-ring delay-2" />
            {searching && <span className="radar-sweep" />}
          </div>
        </div>
      )}

      {/* Floating glass search bar (iOS) */}
      {!hideSearch && (
        <form
          onSubmit={handleSearch}
          className="absolute left-3 right-3 top-3 z-20 flex items-center gap-2 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] px-2 py-1.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500/80" />
            <Input
              placeholder="Search a city or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-0 bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/70"
            />
          </div>
          <Button
            type="submit"
            disabled={searching || !ready}
            className="h-10 rounded-xl px-4 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white shadow-md shadow-rose-500/30 border-0"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
          </Button>
        </form>
      )}

      {/* Floating locate-me button (iOS) */}
      <button
        type="button"
        onClick={locateMe}
        title="Use my location"
        className="absolute bottom-4 right-4 z-20 h-12 w-12 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_8px_20px_-8px_rgba(225,29,72,0.5)] flex items-center justify-center text-rose-500 hover:scale-95 active:scale-90 transition-transform"
      >
        <LocateFixed className="h-5 w-5" />
      </button>

      {/* Pick-mode hint pill */}
      {pickMode && (
        <div className="absolute left-3 right-3 bottom-4 z-20 mr-16 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl ring-1 ring-rose-500/30 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300 flex items-center gap-2 shadow-md">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          Tap the map to drop your barbershop pin.
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";

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

// Dynamically import leaflet only on client side
let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let useMap: any;
let L: any;

if (typeof window !== "undefined") {
  // Dynamic import for SSR compatibility
  const reactLeaflet = require("react-leaflet");
  MapContainer = reactLeaflet.MapContainer;
  TileLayer = reactLeaflet.TileLayer;
  Marker = reactLeaflet.Marker;
  Popup = reactLeaflet.Popup;
  useMap = reactLeaflet.useMap;
  
  L = require("leaflet");
  require("leaflet/dist/leaflet.css");
  
  // Fix for default marker icon
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export function BarbershopMap({
  barbershops,
  userLocation,
  height = "400px",
  onBarbershopClick,
}: BarbershopMapProps) {
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (userLocation) {
      setUserCoords([userLocation.lat, userLocation.lng]);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error);
          setUserCoords([40.7128, -74.0060]); // New York City
        }
      );
    } else {
      setUserCoords([40.7128, -74.0060]); // New York City
    }
  }, [userLocation]);

  if (!isClient || !userCoords || !MapContainer) {
    return (
      <div
        className="w-full bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-[#8E8E93] dark:text-gray-500">Loading map...</div>
      </div>
    );
  }

  const validBarbershops = barbershops.filter(
    (b) => b.latitude && b.longitude
  );

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#C6C6C8] dark:border-[#2C2C2E]">
      <MapContainer
        center={userCoords}
        zoom={13}
        style={{ height, width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={userCoords} />
        
        {/* User location marker */}
        <Marker position={userCoords}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Barbershop markers */}
        {validBarbershops.map((barbershop) => (
          <Marker
            key={barbershop.id}
            position={[barbershop.latitude!, barbershop.longitude!]}
            eventHandlers={{
              click: () => onBarbershopClick?.(barbershop),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                  {barbershop.name}
                </h3>
                <p className="text-sm text-[#8E8E93] dark:text-gray-500">
                  {barbershop.location}
                </p>
                {barbershop.contact_phone && (
                  <p className="text-sm text-[#8E8E93] dark:text-gray-500">
                    {barbershop.contact_phone}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

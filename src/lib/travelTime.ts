import { isNative } from "@/lib/native";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceKm = (from: Coordinates, to: Coordinates) => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    if (isNative()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== "granted") return null;
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }

    if (!navigator.geolocation) return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
      );
    });
  } catch {
    return null;
  }
}

export async function estimateDrivingMinutes(
  from: Coordinates,
  to: Coordinates
): Promise<number> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (response.ok) {
      const data = await response.json();
      const seconds = Number(data?.routes?.[0]?.duration);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.max(1, Math.ceil(seconds / 60));
      }
    }
  } catch {
    /* fall back below */
  }

  // Conservative city-driving fallback for offline/slow-network use.
  return Math.max(5, Math.ceil((distanceKm(from, to) / 28) * 60) + 4);
}

export const destinationUrl = (
  coordinates: Coordinates | null,
  address?: string | null
) => {
  if (coordinates) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return null;
};

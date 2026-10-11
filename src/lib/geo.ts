// Extract lat/lng from a Google Maps share URL (supports @lat,lng, q=lat,lng
// and the !3d!4d places format).
export const extractLatLngFromGoogleUrl = (url: string): { lat: number; lng: number } | null => {
  if (!url) return null;
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const q = url.match(/[?&](?:q|destination|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  const place = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: parseFloat(place[1]), lng: parseFloat(place[2]) };
  return null;
};

export const buildGoogleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number; // ms epoch
}

// Haversine formula — great-circle distance between two points, in km.
export function haversineDistanceKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371; // Earth radius, km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Discards GPS noise: a jump implausibly fast for the time elapsed is
// almost certainly a bad fix (urban canyon, cold start), not real movement.
const MAX_PLAUSIBLE_SPEED_MPS = 12; // ~2:20/km pace — generous for sprinting

export function isPlausibleMovement(a: RoutePoint, b: RoutePoint): boolean {
  const dtSec = (b.timestamp - a.timestamp) / 1000;
  if (dtSec <= 0) return false;
  const distM = haversineDistanceKm(a, b) * 1000;
  return distM / dtSec <= MAX_PLAUSIBLE_SPEED_MPS;
}

// Normalizes a route's lat/lng points into a 0-1 unit square (preserving
// aspect ratio) for the decorative SVG trace fallback used when a full map
// isn't wanted/available — flips Y since screen coordinates grow downward
// while latitude grows upward.
export function normalizeRouteToUnitSquare(points: RoutePoint[]): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latRange = Math.max(1e-6, maxLat - minLat);
  const lonRange = Math.max(1e-6, maxLon - minLon);
  const range = Math.max(latRange, lonRange);
  return points.map((p) => ({
    x: (p.longitude - minLon) / range,
    y: 1 - (p.latitude - minLat) / range,
  }));
}

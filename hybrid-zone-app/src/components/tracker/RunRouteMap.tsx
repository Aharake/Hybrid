import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '@/theme/trackerTokens';
import type { RoutePoint } from '@/engine/gps';

interface Props {
  route: RoutePoint[];
  live?: boolean; // street-level follow camera instead of fitting the whole route
  style?: object;
}

// Street-level "navigation" camera for a live run: close in, tilted so roads
// and 3D buildings read like a street view, rotated to face the direction of
// travel. iOS sizes the camera by altitude (metres), Android by zoom level.
const LIVE_PITCH = 60;
const LIVE_ALTITUDE = 320;
const LIVE_ZOOM = 18.5;
// Heading is only recomputed once we've moved this far from an earlier point,
// so GPS jitter while standing still doesn't spin the map.
const MIN_HEADING_METERS = 8;

function metersBetween(a: RoutePoint, b: RoutePoint): number {
  const dLat = (b.latitude - a.latitude) * 111320;
  const dLon = (b.longitude - a.longitude) * 111320 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function bearingDeg(a: RoutePoint, b: RoutePoint): number {
  const rad = Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * rad;
  const y = Math.sin(dLon) * Math.cos(b.latitude * rad);
  const x =
    Math.cos(a.latitude * rad) * Math.sin(b.latitude * rad) -
    Math.sin(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Wraps react-native-maps with the app's dark styling. Android uses Google
// Maps (needs the API key in app.json); iOS uses Apple's own Maps, no key
// required.
export function RunRouteMap({ route, live, style }: Props) {
  const mapRef = useRef<MapView>(null);
  const headingRef = useRef(0);

  useEffect(() => {
    if (route.length < 2 || !mapRef.current) return;
    if (live) {
      const last = route[route.length - 1];
      for (let i = route.length - 2; i >= Math.max(0, route.length - 15); i--) {
        if (metersBetween(route[i], last) >= MIN_HEADING_METERS) {
          headingRef.current = bearingDeg(route[i], last);
          break;
        }
      }
      mapRef.current.animateCamera(
        { center: last, pitch: LIVE_PITCH, heading: headingRef.current, altitude: LIVE_ALTITUDE, zoom: LIVE_ZOOM },
        { duration: 600 },
      );
    } else {
      mapRef.current.fitToCoordinates(route, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true });
    }
  }, [route, live]);

  if (route.length === 0) return <View style={[styles.empty, style]} />;

  return (
    <MapView
      ref={mapRef}
      style={style ?? styles.fill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      mapType="standard"
      userInterfaceStyle="dark"
      showsUserLocation={live}
      // The camera is driven manually above (so it can tilt + rotate); the
      // built-in follow mode would fight it and flatten the pitch.
      followsUserLocation={false}
      showsBuildings
      showsCompass={false}
      pitchEnabled
      rotateEnabled
      {...(live
        ? {
            initialCamera: {
              center: route[route.length - 1],
              pitch: LIVE_PITCH,
              heading: headingRef.current,
              altitude: LIVE_ALTITUDE,
              zoom: LIVE_ZOOM,
            },
          }
        : {
            initialRegion: {
              latitude: route[0].latitude,
              longitude: route[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
          })}
    >
      {route.length > 1 && <Polyline coordinates={route} strokeColor={colors.running} strokeWidth={5} lineCap="round" lineJoin="round" />}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { backgroundColor: colors.surface },
});

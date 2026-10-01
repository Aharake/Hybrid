import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '@/theme/trackerTokens';
import type { RoutePoint } from '@/engine/gps';
import { RoutePolylineSvg } from './RoutePolylineSvg';

const ROUTE_BLUE = '#2f8cff';

// Google Maps on Android needs an API key at build time; see app.config.js.
const ANDROID_MAPS_AVAILABLE = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY);

interface Props {
  route: RoutePoint[];
  live?: boolean; // street-level follow camera instead of fitting the whole route
  style?: object;
  // Shown (as a plain live-location map, no route yet) before recording starts.
  previewCenter?: { latitude: number; longitude: number } | null;
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
// Maps (needs EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY); iOS uses Apple's own Maps,
// no key required. Without the Android key it shows the route as a drawing.
export function RunRouteMap({ route, live, style, previewCenter }: Props) {
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

  if (route.length === 0) {
    // No recorded route yet — if we know roughly where the person is, show a
    // real live map centered there (their position as a blue dot) rather than
    // an empty box, so the map feels live from the moment the screen opens.
    if (!previewCenter || (Platform.OS === 'android' && !ANDROID_MAPS_AVAILABLE)) return <View style={[styles.empty, style]} />;
    return (
      <MapView
        style={style ?? styles.fill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType="standard"
        userInterfaceStyle="dark"
        showsUserLocation
        followsUserLocation={false}
        showsCompass={false}
        initialRegion={{ latitude: previewCenter.latitude, longitude: previewCenter.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      />
    );
  }

  if (Platform.OS === 'android' && !ANDROID_MAPS_AVAILABLE) {
    return (
      <View style={[styles.empty, styles.fallback, style]}>
        <RoutePolylineSvg route={route} size={200} color={colors.accent200} />
      </View>
    );
  }

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
      {route.length > 1 && <Polyline coordinates={route} strokeColor="rgba(0,0,0,0.55)" strokeWidth={11} lineCap="round" lineJoin="round" />}
      {route.length > 1 && <Polyline coordinates={route} strokeColor={ROUTE_BLUE} strokeWidth={7} lineCap="round" lineJoin="round" />}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { backgroundColor: colors.surface },
  fallback: { alignItems: 'center', justifyContent: 'center', flex: 1 },
});

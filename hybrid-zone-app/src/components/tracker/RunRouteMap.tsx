import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '@/theme/trackerTokens';
import type { RoutePoint } from '@/engine/gps';

interface Props {
  route: RoutePoint[];
  live?: boolean; // follow the latest point instead of fitting the whole route
  style?: object;
}

// Wraps react-native-maps with the app's dark styling and auto-fits the
// camera to the route. Android uses Google Maps (needs the API key in
// app.json); iOS uses Apple's own Maps, no key required.
export function RunRouteMap({ route, live, style }: Props) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (route.length < 2 || !mapRef.current) return;
    if (live) {
      mapRef.current.animateCamera({ center: route[route.length - 1] }, { duration: 300 });
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
      userInterfaceStyle="dark"
      showsUserLocation={live}
      followsUserLocation={live}
      initialRegion={{
        latitude: route[0].latitude,
        longitude: route[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      {route.length > 1 && <Polyline coordinates={route} strokeColor={colors.running} strokeWidth={4} lineCap="round" lineJoin="round" />}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { backgroundColor: colors.surface },
});

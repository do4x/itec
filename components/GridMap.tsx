import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import * as Location from "expo-location";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { POSTER_LOCATIONS } from "@/constants/poster-locations";
import { TerritoryInfo } from "@/lib/territory";
import { TEAMS, TeamId } from "@/lib/game-state";
import { Colors, Spacing, Radii, Typography } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_SIZE = SCREEN_WIDTH - 32;
const MAP_PADDING = 30;

interface GridMapProps {
  territories: Record<string, TerritoryInfo>;
  onPosterPress: (posterId: string) => void;
}

export default function GridMap({ territories, onPosterPress }: GridMapProps) {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // GPS
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  // Bounding box
  const lats = POSTER_LOCATIONS.map((p) => p.lat);
  const lngs = POSTER_LOCATIONS.map((p) => p.lng);
  const minLat = Math.min(...lats) - 0.0005;
  const maxLat = Math.max(...lats) + 0.0005;
  const minLng = Math.min(...lngs) - 0.0005;
  const maxLng = Math.max(...lngs) + 0.0005;

  const toXY = (lat: number, lng: number) => ({
    x: MAP_PADDING + ((lng - minLng) / (maxLng - minLng)) * (MAP_SIZE - MAP_PADDING * 2),
    y: MAP_PADDING + ((maxLat - lat) / (maxLat - minLat)) * (MAP_SIZE - MAP_PADDING * 2),
  });

  // Pulse for user pin
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  // Grid lines
  const gridLines = [];
  const GRID_COUNT = 8;
  for (let i = 0; i <= GRID_COUNT; i++) {
    const pos = (i / GRID_COUNT) * MAP_SIZE;
    gridLines.push(
      <View key={`h${i}`} style={[styles.gridLine, { top: pos, left: 0, right: 0, height: 1 }]} />,
      <View key={`v${i}`} style={[styles.gridLine, { left: pos, top: 0, bottom: 0, width: 1 }]} />,
    );
  }

  return (
    <View style={styles.container}>
      {/* LIVE badge */}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>

      {/* Grid */}
      <View style={[styles.map, { width: MAP_SIZE, height: MAP_SIZE }]}>
        {gridLines}

        {/* Poster pins */}
        {POSTER_LOCATIONS.map((poster) => {
          const { x, y } = toXY(poster.lat, poster.lng);
          const territory = territories[poster.id];
          const pinColor = territory?.dominantTeam
            ? TEAMS[territory.dominantTeam].color
            : Colors.navyLight;
          const isActive = (territory?.totalPixels ?? 0) > 0;

          return (
            <TouchableOpacity
              key={poster.id}
              style={[styles.pin, { left: x - 12, top: y - 12, borderColor: pinColor }]}
              onPress={() => onPosterPress(poster.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.pinInner, { backgroundColor: pinColor + (isActive ? "CC" : "44") }]}>
                <Text style={styles.pinEmoji}>{poster.emoji}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* User pin */}
        {userLoc && (() => {
          const { x, y } = toXY(userLoc.lat, userLoc.lng);
          if (x < 0 || x > MAP_SIZE || y < 0 || y > MAP_SIZE) return null;
          return (
            <View style={[styles.userPin, { left: x - 8, top: y - 8 }]}>
              <Animated.View style={[styles.userPulse, pulseStyle]} />
              <View style={styles.userDot} />
            </View>
          );
        })()}
      </View>

      {/* Coordinates */}
      <View style={styles.coordRow}>
        <Text style={styles.coordText}>
          {userLoc
            ? `${userLoc.lat.toFixed(4)}° N, ${userLoc.lng.toFixed(4)}° E`
            : "Locating..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.navyMid, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.navyLight, overflow: "hidden" },
  liveBadge: { position: "absolute", top: Spacing.md, right: Spacing.md, zIndex: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.navyDeep + "CC", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radii.full },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  liveText: { color: Colors.success, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  map: { position: "relative" },
  gridLine: { position: "absolute", backgroundColor: Colors.navyLight, opacity: 0.3 },
  pin: { position: "absolute", width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  pinInner: { width: 20, height: 20, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  pinEmoji: { fontSize: 10 },
  userPin: { position: "absolute", width: 16, height: 16, justifyContent: "center", alignItems: "center" },
  userPulse: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.success + "44" },
  userDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, borderWidth: 1, borderColor: Colors.white },
  coordRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  coordText: { fontFamily: "monospace", fontSize: 11, color: Colors.muted, letterSpacing: 1 },
});

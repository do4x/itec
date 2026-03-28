import { POSTER_LOCATIONS } from "@/constants/poster-locations";
import { Colors, Radii, Spacing } from "@/constants/theme";
import { TEAMS, TeamId } from "@/lib/game-state";
import { TerritoryInfo } from "@/lib/territory";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_WIDTH = SCREEN_WIDTH - 32;
const MAP_HEIGHT = MAP_WIDTH * 1.25;
const MAP_PADDING = 36;

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface PosterLoc {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
}

interface GridMapProps {
  territories: Record<string, TerritoryInfo>;
  onPosterPress: (posterId: string) => void;
  posterLocations?: PosterLoc[];
}

const PIN_OUTER =
  "M0,-13 C-5.5,-13 -10,-8.5 -10,-4 C-10,3.5 0,13 0,13 C0,13 10,3.5 10,-4 C10,-8.5 5.5,-13 0,-13 Z";
const PIN_CIRCLE_R = 5.5;

// ─── Animated Grid Line ───
function AnimGridLine({
  x1,
  y1,
  x2,
  y2,
  strokeW,
  opac,
  delay,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeW: number;
  opac: number;
  delay: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(opac, { duration: 500 }));
  }, []);

  const animProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedLine
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={Colors.navyLight}
      strokeWidth={strokeW}
      animatedProps={animProps}
    />
  );
}

// ─── Animated Building ───
function AnimBuilding({
  x,
  y,
  w,
  h,
  delay,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  delay: number;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 200 })
    );
    opacity.value = withDelay(delay, withTiming(0.18, { duration: 400 }));
  }, []);

  const animProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    // react-native-svg Rect doesn't support transform via animatedProps easily,
    // so we animate opacity + width/height from center
    x: x - (w * scale.value) / 2,
    y: y - (h * scale.value) / 2,
    width: w * scale.value,
    height: h * scale.value,
  }));

  return (
    <AnimatedRect
      rx={3}
      fill={Colors.navyLight}
      stroke={Colors.navyLight}
      strokeWidth={0.5}
      strokeOpacity={0.25}
      animatedProps={animProps}
    />
  );
}

// ─── Animated Pin ───
function AnimPin({
  x,
  y,
  isActive,
  dominant,
  delay,
}: {
  x: number;
  y: number;
  isActive: boolean;
  dominant: TeamId | null;
  delay: number;
}) {
  const pinFill = isActive && dominant ? TEAMS[dominant].color : "#FFFFFF";
  const pinOpacity = isActive ? 1 : 0.5;
  const pinStroke = isActive ? "transparent" : Colors.navyLight;
  const circleCY = y - 5;

  // Drop-in animation: pin starts above and falls into place
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 12, stiffness: 180 })
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, []);

  const animProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    // Translate the whole group
    y: translateY.value,
  }));

  return (
    <AnimatedG animatedProps={animProps}>
      {/* Glow for active pins */}
      {isActive && dominant && (
        <Circle
          cx={x}
          cy={y - 1}
          r={16}
          fill={TEAMS[dominant].color}
          opacity={0.12}
        />
      )}
      {/* Teardrop */}
      <Path
        d={PIN_OUTER}
        x={x}
        y={y}
        fill={pinFill}
        opacity={pinOpacity}
        stroke={pinStroke}
        strokeWidth={isActive ? 0 : 0.8}
      />
      {/* Inner circle */}
      <Circle
        cx={x}
        cy={circleCY}
        r={PIN_CIRCLE_R}
        fill="transparent"
        stroke={isActive ? Colors.navyDeep : Colors.navyMid}
        strokeWidth={1.5}
        opacity={isActive ? 0.8 : 0.6}
      />
      {isActive ? (
        <Circle cx={x} cy={circleCY} r={2} fill={Colors.navyDeep} opacity={0.8} />
      ) : (
        <Line
          x1={x - 3}
          y1={circleCY}
          x2={x + 3}
          y2={circleCY}
          stroke={Colors.navyMid}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.6}
        />
      )}
    </AnimatedG>
  );
}

// ─── Main Component ───
export default function GridMap({
  territories,
  onPosterPress,
  posterLocations,
}: GridMapProps) {
  const posters = posterLocations || POSTER_LOCATIONS;
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const userX = useSharedValue(MAP_WIDTH / 2);
  const userY = useSharedValue(MAP_HEIGHT / 2);

  // GPS
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 0,
        },
        (loc) =>
          setUserLoc({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          })
      );
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  // Bounding box
  const bounds = useMemo(() => {
    if (posters.length === 0)
      return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    const lats = posters.map((p) => p.lat);
    const lngs = posters.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.0003,
      maxLat: Math.max(...lats) + 0.0003,
      minLng: Math.min(...lngs) - 0.0003,
      maxLng: Math.max(...lngs) + 0.0003,
    };
  }, [posters]);

  const toXY = (lat: number, lng: number) => ({
    x:
      MAP_PADDING +
      ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) *
        (MAP_WIDTH - MAP_PADDING * 2),
    y:
      MAP_PADDING +
      ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) *
        (MAP_HEIGHT - MAP_PADDING * 2),
  });

  // User dot pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (!userLoc) return;
    const { x, y } = toXY(userLoc.lat, userLoc.lng);
    userX.value = withSpring(x, { damping: 20, stiffness: 150 });
    userY.value = withSpring(y, { damping: 20, stiffness: 150 });
  }, [userLoc]);

  const userDotStyle = useAnimatedStyle(() => ({
    left: userX.value - 8,
    top: userY.value - 8,
    opacity: userLoc ? 1 : 0,
  }));

  const userPulseStyle = useAnimatedStyle(() => ({
    left: userX.value - 14,
    top: userY.value - 14,
    transform: [{ scale: pulse.value }],
    opacity: (2.2 - pulse.value) * 0.5,
  }));

  // Buildings
  const buildings = useMemo(
    () =>
      [
        { rx: 0.08, ry: 0.12, w: 28, h: 22 },
        { rx: 0.85, ry: 0.08, w: 20, h: 32 },
        { rx: 0.15, ry: 0.78, w: 24, h: 18 },
        { rx: 0.82, ry: 0.85, w: 30, h: 20 },
        { rx: 0.48, ry: 0.04, w: 18, h: 14 },
        { rx: 0.93, ry: 0.48, w: 16, h: 26 },
        { rx: 0.04, ry: 0.48, w: 22, h: 16 },
        { rx: 0.55, ry: 0.92, w: 26, h: 14 },
      ].map((p) => ({
        x: MAP_PADDING + p.rx * (MAP_WIDTH - MAP_PADDING * 2),
        y: MAP_PADDING + p.ry * (MAP_HEIGHT - MAP_PADDING * 2),
        w: p.w,
        h: p.h,
      })),
    []
  );

  const GRID_H = 10;
  const GRID_V = 8;

  return (
    <View style={styles.container}>
      {/* LIVE badge — fades in */}
      <Animated.View
        entering={FadeIn.duration(600).delay(800)}
        style={styles.liveBadge}
      >
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </Animated.View>

      {/* Map */}
      <View style={[styles.mapArea, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
        <Svg
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={StyleSheet.absoluteFill}
        >
          {/* Grid lines — staggered fade-in */}
          {Array.from({ length: GRID_H + 1 }, (_, i) => {
            const y = (i / GRID_H) * MAP_HEIGHT;
            const isMain = i === 3 || i === 7;
            return (
              <AnimGridLine
                key={`h${i}`}
                x1={0}
                y1={y}
                x2={MAP_WIDTH}
                y2={y}
                strokeW={isMain ? 1.5 : 1}
                opac={isMain ? 0.6 : 0.3}
                delay={80 + i * 40}
              />
            );
          })}
          {Array.from({ length: GRID_V + 1 }, (_, i) => {
            const x = (i / GRID_V) * MAP_WIDTH;
            const isMain = i === 2 || i === 6;
            return (
              <AnimGridLine
                key={`v${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={MAP_HEIGHT}
                strokeW={isMain ? 1.5 : 1}
                opac={isMain ? 0.55 : 0.25}
                delay={120 + i * 50}
              />
            );
          })}

          {/* Buildings — scale-pop stagger */}
          {buildings.map((b, i) => (
            <AnimBuilding
              key={`bld${i}`}
              x={b.x}
              y={b.y}
              w={b.w}
              h={b.h}
              delay={400 + i * 60}
            />
          ))}

          {/* Pins — drop-in stagger */}
          {posters.map((poster, i) => {
            const { x, y } = toXY(poster.lat, poster.lng);
            const territory = territories[poster.id];
            const isActive = (territory?.totalPixels ?? 0) > 0;
            const dominant = territory?.dominantTeam ?? null;

            return (
              <AnimPin
                key={poster.id}
                x={x}
                y={y}
                isActive={isActive}
                dominant={dominant}
                delay={600 + i * 50}
              />
            );
          })}
        </Svg>

        {/* Touch targets */}
        {posters.map((poster) => {
          const { x, y } = toXY(poster.lat, poster.lng);
          return (
            <TouchableOpacity
              key={`t_${poster.id}`}
              style={[styles.pinTouch, { left: x - 18, top: y - 22 }]}
              onPress={() => onPosterPress(poster.id)}
              activeOpacity={0.7}
            />
          );
        })}

        {/* User dot — only visible when location is available */}
        {userLoc && (
          <>
            <Animated.View style={[styles.userGlow, userPulseStyle]} />
            <Animated.View style={[styles.userDot, userDotStyle]}>
              <View style={styles.userDotCore} />
            </Animated.View>
          </>
        )}
      </View>

      {/* Bottom bar — slides in */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(900)}
        style={styles.bottomBar}
      >
        <Text style={styles.locationLabel}>
          {posters.length > 0
            ? `${posters.length} posters active`
            : "No posters calibrated"}
        </Text>
        <Text style={styles.coordText}>
          {userLoc
            ? `${userLoc.lat.toFixed(4)}° N, ${userLoc.lng.toFixed(4)}° E`
            : "Locating..."}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    overflow: "hidden",
  },
  liveBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.navyDeep + "DD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  mapArea: {
    position: "relative",
  },
  pinTouch: {
    position: "absolute",
    width: 36,
    height: 36,
    zIndex: 5,
  },
  userGlow: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success + "30",
    zIndex: 6,
  },
  userDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    zIndex: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  userDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.navyDeep,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.navyLight + "30",
    gap: 2,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
  coordText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
});
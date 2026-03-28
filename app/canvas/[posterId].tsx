import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGame, TEAMS } from "@/lib/game-state";
import { db, ref, push, onChildAdded, off } from "@/lib/firebase";
import { VALID_POSTER_IDS, POSTER_NAMES } from "@/lib/poster-matcher";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_SIZE = SCREEN_WIDTH - 32;

const BRUSH_COLORS = [
  Colors.teamRed,
  Colors.teamCyan,
  Colors.teamGreen,
  Colors.teamYellow,
  "#FF6B35",
  Colors.white,
];
const BRUSH_SIZES = [4, 8, 14, 22];

type Tool = "brush" | "eraser";

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  teamId: string;
  username: string;
}

export default function CanvasScreen() {
  const { posterId } = useLocalSearchParams<{ posterId: string }>();
  const isValidPoster = VALID_POSTER_IDS.includes(posterId as any);
  const { username, teamId } = useGame();
  const teamColor = TEAMS[teamId].color;
  const insets = useSafeAreaInsets();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [brushColor, setBrushColor] = useState<string>(teamColor);
  const [brushSize, setBrushSize] = useState(8);
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!posterId || !isValidPoster) return;

    const strokesRef = ref(db, `posters/${posterId}/strokes`);
    const unsubscribe = onChildAdded(strokesRef, (snapshot) => {
      const stroke = snapshot.val() as Stroke;
      if (stroke) {
        setStrokes((prev) => [...prev, stroke]);
      }
    });

    return () => off(strokesRef);
  }, [posterId]);

  const saveStroke = useCallback(
    (points: { x: number; y: number }[]) => {
      if (!posterId || !isValidPoster || points.length < 2) return;

      const effectiveColor = activeTool === "eraser" ? Colors.navyDeep : brushColor;

      const strokeData: Stroke = {
        points,
        color: effectiveColor,
        width: activeTool === "eraser" ? 24 : brushSize,
        teamId,
        username,
      };

      const strokesRef = ref(db, `posters/${posterId}/strokes`);
      push(strokesRef, strokeData);
    },
    [posterId, brushColor, brushSize, teamId, username, activeTool]
  );

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    setIsDrawing(true);
    setCurrentStroke([{ x: touch.locationX, y: touch.locationY }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTouchMove = (e: any) => {
    if (!isDrawing) return;
    const touch = e.nativeEvent;
    setCurrentStroke((prev) => [...prev, { x: touch.locationX, y: touch.locationY }]);
  };

  const handleTouchEnd = () => {
    if (currentStroke.length > 1) {
      saveStroke(currentStroke);
    }
    setCurrentStroke([]);
    setIsDrawing(false);
  };

  const teamStrokeCounts = strokes.reduce(
    (acc, s) => {
      acc[s.teamId] = (acc[s.teamId] || 0) + s.points.length;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalPoints = Object.values(teamStrokeCounts).reduce((a, b) => a + b, 0) || 1;

  const activeCount = new Set(strokes.slice(-20).map((s) => s.username)).size;

  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!isValidPoster) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Unknown poster: {posterId}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.softGray} />
          <Text style={styles.errorBackText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const effectiveBrushColor = activeTool === "eraser" ? Colors.navyDeep : brushColor;
  const effectiveBrushSize = activeTool === "eraser" ? 24 : brushSize;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.softGray} />
        </TouchableOpacity>
        <Text style={styles.posterLabel} numberOfLines={1}>
          {POSTER_NAMES[posterId] || posterId}
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.activeBadge}>
            <Animated.View style={[styles.pulseDot, pulseStyle]} />
            <Text style={styles.activeText}>{activeCount} active</Text>
          </View>
          <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
        </View>
      </Animated.View>

      <View style={styles.territoryBar}>
        {Object.entries(teamStrokeCounts).map(([team, count]) => (
          <View
            key={team}
            style={{
              flex: count / totalPoints,
              height: 6,
              backgroundColor: TEAMS[team as keyof typeof TEAMS]?.color ?? Colors.navyLight,
            }}
          />
        ))}
        {totalPoints <= 1 && (
          <View style={{ flex: 1, height: 6, backgroundColor: Colors.navyLight }} />
        )}
      </View>

      <View
        style={styles.canvas}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {strokes.map((stroke, i) =>
          stroke.points.map((point, j) => (
            <View
              key={`${i}-${j}`}
              style={{
                position: "absolute",
                left: point.x - stroke.width / 2,
                top: point.y - stroke.width / 2,
                width: stroke.width,
                height: stroke.width,
                borderRadius: stroke.width / 2,
                backgroundColor: stroke.color,
              }}
            />
          ))
        )}

        {currentStroke.map((point, j) => (
          <View
            key={`current-${j}`}
            style={{
              position: "absolute",
              left: point.x - effectiveBrushSize / 2,
              top: point.y - effectiveBrushSize / 2,
              width: effectiveBrushSize,
              height: effectiveBrushSize,
              borderRadius: effectiveBrushSize / 2,
              backgroundColor: effectiveBrushColor,
            }}
          />
        ))}

        {strokes.length === 0 && currentStroke.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyText}>Draw on this poster!</Text>
          </View>
        )}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.toolbar}>
        <View style={styles.toolRow}>
          <TouchableOpacity
            style={[styles.toolButton, activeTool === "brush" && styles.toolButtonActive]}
            onPress={() => {
              setActiveTool("brush");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons
              name="brush"
              size={22}
              color={activeTool === "brush" ? Colors.itecBright : Colors.softGray}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, activeTool === "eraser" && styles.toolButtonActive]}
            onPress={() => {
              setActiveTool("eraser");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons
              name="backspace-outline"
              size={22}
              color={activeTool === "eraser" ? Colors.itecBright : Colors.softGray}
            />
          </TouchableOpacity>
        </View>

        {activeTool === "brush" && (
          <>
            <View style={styles.colorRow}>
              {BRUSH_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    brushColor === color && styles.colorDotSelected,
                  ]}
                  onPress={() => {
                    setBrushColor(color);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
              ))}
            </View>

            <View style={styles.sizeRow}>
              {BRUSH_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    brushSize === size && { borderColor: brushColor },
                  ]}
                  onPress={() => {
                    setBrushSize(size);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View
                    style={{
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: brushSize === size ? brushColor : Colors.muted,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navyMid,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    justifyContent: "center",
    alignItems: "center",
  },
  posterLabel: {
    ...Typography.h3,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.navyMid,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  activeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.softGray,
  },
  teamDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  territoryBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    overflow: "hidden",
    position: "relative",
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 14,
    letterSpacing: 1,
  },
  toolbar: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  toolRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navyDeep,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    justifyContent: "center",
    alignItems: "center",
  },
  toolButtonActive: {
    backgroundColor: Colors.itecBlue + "26",
    borderColor: Colors.itecBlue,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: Colors.white,
    transform: [{ scale: 1.15 }],
  },
  sizeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  sizeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  errorBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  errorBackText: {
    ...Typography.label,
  },
});

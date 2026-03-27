// app/canvas/[posterId].tsx
// ============================================
// CANVAS — The core graffiti drawing experience
// ============================================
// This is where the magic happens. You draw on a poster,
// and everyone else on the same poster sees it in real-time.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useGame, TEAMS } from "@/lib/game-state";
import { db, ref, push, onChildAdded, off } from "@/lib/firebase";
import { VALID_POSTER_IDS } from "@/lib/poster-matcher";
import * as Haptics from "expo-haptics";

// -----------------------------------------------
// IMPORTANT NOTE FOR HACKATHON:
// -----------------------------------------------
// This file uses a simple View-based canvas for maximum compatibility 
// with Expo Go. At the hackathon, if you have time, swap this for
// @shopify/react-native-skia for smoother drawing. But this WORKS
// out of the box in Expo Go without a dev build.
// -----------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_SIZE = SCREEN_WIDTH - 32;

// Brush colors available to all teams
const BRUSH_COLORS = ["#FF2E63", "#08F7FE", "#39FF14", "#FFE400", "#FF6B35", "#FFFFFF"];
const BRUSH_SIZES = [4, 8, 14, 22];

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  teamId: string;
  username: string;
}

export default function CanvasScreen() {
  const { posterId } = useLocalSearchParams<{ posterId: string }>();

  // Validate posterId against known posters
  const isValidPoster = VALID_POSTER_IDS.includes(posterId as any);

  const { username, teamId } = useGame();
  const teamColor = TEAMS[teamId].color;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [brushColor, setBrushColor] = useState(teamColor);
  const [brushSize, setBrushSize] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);

  // Real-time sync: listen for new strokes from Firebase
  useEffect(() => {
    if (!posterId || !isValidPoster) return;

    const strokesRef = ref(db, `posters/${posterId}/strokes`);

    const unsubscribe = onChildAdded(strokesRef, (snapshot) => {
      const stroke = snapshot.val() as Stroke;
      if (stroke) {
        setStrokes((prev) => [...prev, stroke]);
      }
    });

    return () => {
      off(strokesRef);
    };
  }, [posterId]);

  // Push completed stroke to Firebase
  const saveStroke = useCallback(
    (points: { x: number; y: number }[]) => {
      if (!posterId || !isValidPoster || points.length < 2) return;

      const strokeData: Stroke = {
        points,
        color: brushColor,
        width: brushSize,
        teamId,
        username,
      };

      const strokesRef = ref(db, `posters/${posterId}/strokes`);
      push(strokesRef, strokeData);
    },
    [posterId, brushColor, brushSize, teamId, username]
  );

  // Touch handlers for drawing
  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    const x = touch.locationX;
    const y = touch.locationY;
    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTouchMove = (e: any) => {
    if (!isDrawing) return;
    const touch = e.nativeEvent;
    const x = touch.locationX;
    const y = touch.locationY;
    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const handleTouchEnd = () => {
    if (currentStroke.length > 1) {
      saveStroke(currentStroke);
    }
    setCurrentStroke([]);
    setIsDrawing(false);
  };

  // Calculate territory ownership
  const teamStrokeCounts = strokes.reduce(
    (acc, s) => {
      acc[s.teamId] = (acc[s.teamId] || 0) + s.points.length;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalPoints = Object.values(teamStrokeCounts).reduce((a, b) => a + b, 0) || 1;

  if (!isValidPoster) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#FF2E63", fontSize: 16, textAlign: "center" }}>
          Afiș necunoscut: {posterId}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.backText}>← ÎNAPOI</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← SCAN</Text>
        </TouchableOpacity>
        <Text style={styles.posterLabel}>
          {posterId?.replace("poster_", "AFIȘ #") || "UNKNOWN"}
        </Text>
        <Text style={[styles.teamBadge, { color: teamColor }]}>
          {TEAMS[teamId].name}
        </Text>
      </View>

      {/* Territory Bar */}
      <View style={styles.territoryBar}>
        {Object.entries(teamStrokeCounts).map(([team, count]) => (
          <View
            key={team}
            style={[
              styles.territorySegment,
              {
                flex: count / totalPoints,
                backgroundColor: TEAMS[team as keyof typeof TEAMS]?.color || "#333",
              },
            ]}
          />
        ))}
        {totalPoints <= 1 && (
          <View style={[styles.territorySegment, { flex: 1, backgroundColor: "#222" }]} />
        )}
      </View>

      {/* Canvas — the drawing surface */}
      <View
        style={[styles.canvas, { borderColor: teamColor + "33" }]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render saved strokes as SVG-like paths using Views */}
        {strokes.map((stroke, i) =>
          stroke.points.map((point, j) => (
            <View
              key={`${i}-${j}`}
              style={[
                styles.dot,
                {
                  left: point.x - stroke.width / 2,
                  top: point.y - stroke.width / 2,
                  width: stroke.width,
                  height: stroke.width,
                  borderRadius: stroke.width / 2,
                  backgroundColor: stroke.color,
                },
              ]}
            />
          ))
        )}

        {/* Render current stroke (not yet saved) */}
        {currentStroke.map((point, j) => (
          <View
            key={`current-${j}`}
            style={[
              styles.dot,
              {
                left: point.x - brushSize / 2,
                top: point.y - brushSize / 2,
                width: brushSize,
                height: brushSize,
                borderRadius: brushSize / 2,
                backgroundColor: brushColor,
              },
            ]}
          />
        ))}

        {/* Empty state */}
        {strokes.length === 0 && currentStroke.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyText}>Desenează pe acest afiș!</Text>
          </View>
        )}
      </View>

      {/* Toolbar — brush color + size */}
      <View style={styles.toolbar}>
        {/* Colors */}
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

        {/* Sizes */}
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
                style={[
                  styles.sizePreview,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor:
                      brushSize === size ? brushColor : "#555",
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  posterLabel: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },
  teamBadge: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  territoryBar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  territorySegment: {
    height: "100%",
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: "#111118",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  dot: {
    position: "absolute",
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: "#444",
    fontSize: 14,
    letterSpacing: 1,
  },
  toolbar: {
    marginTop: 16,
    gap: 12,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: "#FFF",
    transform: [{ scale: 1.15 }],
  },
  sizeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  sizePreview: {},
});

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import {
  db, ref, set, push, onChildAdded, onChildChanged, onValue, remove, update,
  serverTimestamp,
} from "@/lib/firebase";
import { VALID_POSTER_IDS, POSTER_NAMES } from "@/lib/poster-matcher";
import { useTokens } from "@/lib/tokens";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import GifStickerItem, { CanvasGif } from "@/components/GifStickerItem";
import GifPickerModal from "@/components/GifPickerModal";
import AnthemPickerModal from "@/components/AnthemPickerModal";
import { JamendoTrack } from "@/constants/anthem-tracks";
import PixelGrid, { PixelData } from "@/components/PixelGrid";
import GraffitiPicker from "@/components/GraffitiPicker";
import AiPosterModal from "@/components/AiPosterModal";
import { GraffitiPattern } from "@/constants/graffiti-patterns";
import { logActivity } from "@/lib/notifications";
import { POSTER_IMAGES } from "@/constants/poster-images";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_WIDTH = SCREEN_WIDTH - 32;
const GRID_COLS = 40;
const GRID_ROWS = 57;
const CANVAS_HEIGHT = CANVAS_WIDTH * (297 / 210);
const CELL_SIZE = CANVAS_WIDTH / GRID_COLS;

const PIXEL_COLORS = [
  Colors.teamRed,
  Colors.teamCyan,
  Colors.teamGreen,
  Colors.teamYellow,
  "#FF6B35",
  Colors.white,
];

type Tool = "pixel" | "eraser" | "sticker" | "graffiti";

export default function CanvasScreen() {
  const { posterId, photoUri } = useLocalSearchParams<{ posterId: string; photoUri?: string }>();
  const isValidPoster = VALID_POSTER_IDS.includes(posterId as any);
  const posterImage = POSTER_IMAGES[posterId as string] ?? (photoUri ? { uri: photoUri } : null);
  const { uid, username, teamId } = useGame();
  const teamColor = TEAMS[teamId]?.color ?? Colors.teamCyan;
  const insets = useSafeAreaInsets();
  const { tokens, spend, canAfford } = useTokens(uid);

  const [pixels, setPixels] = useState<Map<string, PixelData>>(new Map());
  const [brushColor, setBrushColor] = useState<string>(teamColor);
  const [activeTool, setActiveTool] = useState<Tool>("pixel");

  // GIF state
  const [gifs, setGifs] = useState<CanvasGif[]>([]);
  const [selectedGifId, setSelectedGifId] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Anthem state
  interface Anthem { url: string; teamId: string; name?: string; artist?: string }
  const [anthem, setAnthem] = useState<Anthem | null>(null);
  const [showAnthemPicker, setShowAnthemPicker] = useState(false);

  // Graffiti + AI state
  const [showGraffitiPicker, setShowGraffitiPicker] = useState(false);
  const [showAiPoster, setShowAiPoster] = useState(false);

  // Graffiti placement state
  interface PendingGraffiti { pattern: GraffitiPattern; startRow: number; startCol: number; }
  const [pendingGraffiti, setPendingGraffiti] = useState<PendingGraffiti | null>(null);

  // Glitch state
  const glitchX = useSharedValue(0);
  const glitchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchX.value }],
  }));

  // ── Firebase: pixels ──────────────────────────────────────────────────
  useEffect(() => {
    if (!posterId || !isValidPoster) return;
    const pixelsRef = ref(db, `posters/${posterId}/pixels`);

    // onChildAdded handles both initial load (fires once per existing child)
    // and real-time new pixels — no duplicate onValue needed.
    const addUnsub = onChildAdded(pixelsRef, (snap) => {
      if (snap.key && snap.val()) {
        setPixels((prev) => {
          const next = new Map(prev);
          next.set(snap.key!, snap.val() as PixelData);
          return next;
        });
      }
    });

    const changeUnsub = onChildChanged(pixelsRef, (snap) => {
      if (snap.key && snap.val()) {
        const newData = snap.val() as PixelData;
        setPixels((prev) => {
          const oldData = prev.get(snap.key!);
          // Glitch effect: someone overwrote YOUR pixel
          if (oldData && oldData.uid === uid && newData.uid !== uid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            glitchX.value = withSequence(
              withTiming(-3, { duration: 50 }),
              withTiming(3, { duration: 50 }),
              withTiming(-3, { duration: 50 }),
              withTiming(3, { duration: 50 }),
              withTiming(0, { duration: 50 }),
            );
          }
          const next = new Map(prev);
          next.set(snap.key!, newData);
          return next;
        });
      }
    });

    return () => { addUnsub(); changeUnsub(); };
  }, [posterId, uid]);

  // ── Firebase: GIFs ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!posterId || !isValidPoster) return;
    const gifsRef = ref(db, `posters/${posterId}/gifs`);
    const unsubscribe = onValue(gifsRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      const list: CanvasGif[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id, url: val.url, x: val.x, y: val.y, scale: val.scale, rotation: val.rotation ?? 0,
      }));
      setGifs(list);
    });
    return () => unsubscribe();
  }, [posterId]);

  // ── Firebase: Anthem ───────────────────────────────────────────────────
  useEffect(() => {
    if (!posterId || !isValidPoster) return;
    const anthemRef = ref(db, `posters/${posterId}/anthem`);
    const unsubscribe = onValue(anthemRef, (snapshot) => {
      setAnthem(snapshot.val() ?? null);
    });
    return () => unsubscribe();
  }, [posterId]);

  // ── Audio player ───────────────────────────────────────────────────────
  const enemyAnthemUrl = anthem && anthem.teamId !== teamId ? anthem.url : null;
  const anthemPlayer = useAudioPlayer(enemyAnthemUrl ? { uri: enemyAnthemUrl } : null);

  useEffect(() => {
    if (!enemyAnthemUrl) return;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    anthemPlayer.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [enemyAnthemUrl]);

  // ── Pixel drawing ─────────────────────────────────────────────────────
  const handlePixelPress = useCallback(async (row: number, col: number, silent = false) => {
    if (!posterId || !uid) return;
    const key = `${row}_${col}`;

    if (activeTool === "eraser") {
      const existing = pixels.get(key);
      if (!existing) return;
      const ok = await spend(10);
      if (!ok) { if (!silent) Alert.alert("Tokens insuficiente", "Ai nevoie de 10 tokens pt a sterge un pixel."); return; }
      remove(ref(db, `posters/${posterId}/pixels/${key}`));
      setPixels((prev) => { const n = new Map(prev); n.delete(key); return n; });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (activeTool === "pixel") {
      const existing = pixels.get(key);
      const isOverride = existing && existing.uid !== uid;
      const ok = await spend(10);
      if (!ok) { if (!silent) Alert.alert("Tokens insuficiente", "Ai nevoie de 10 tokens pt a colora un pixel."); return; }
      const pixelData: PixelData = { color: brushColor, teamId, username, uid };
      set(ref(db, `posters/${posterId}/pixels/${key}`), { ...pixelData, t: serverTimestamp() });
      setPixels((prev) => { const n = new Map(prev); n.set(key, pixelData); return n; });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      logActivity({
        type: isOverride ? "pixel_override" : "pixel",
        username, teamId, posterId,
        ...(isOverride ? { targetUsername: existing.username, targetTeamId: existing.teamId } : {}),
      });
    }
  }, [posterId, uid, activeTool, brushColor, teamId, username, spend, pixels]);

  const handlePixelDrag = useCallback(async (row: number, col: number) => {
    handlePixelPress(row, col, true);
  }, [handlePixelPress]);

  // ── GIF operations ─────────────────────────────────────────────────────
  const handleAddGif = useCallback(async (url: string) => {
    if (!posterId || !uid) return;
    const ok = await spend(100);
    if (!ok) { Alert.alert("Tokens insuficiente", "Ai nevoie de 100 tokens pt un GIF."); return; }
    const gifRef = push(ref(db, `posters/${posterId}/gifs`), {
      url, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 1, rotation: 0, teamId, username, uid, type: "gif",
    });
    if (gifRef.key) {
      setGifs((prev) => prev.find((g) => g.id === gifRef.key) ? prev : [...prev, {
        id: gifRef.key, url, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 1, rotation: 0,
      }]);
      setSelectedGifId(gifRef.key);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logActivity({ type: "gif", username, teamId, posterId });
  }, [posterId, uid, teamId, username, spend]);

  const handleUpdateGif = useCallback((id: string, x: number, y: number, scale: number, rotation: number) => {
    if (!posterId) return;
    update(ref(db, `posters/${posterId}/gifs/${id}`), { x, y, scale, rotation });
  }, [posterId]);

  const handleDeleteGif = useCallback(async (id: string) => {
    if (!posterId) return;
    const ok = await spend(150);
    if (!ok) { Alert.alert("Tokens insuficiente", "Ai nevoie de 150 tokens pt a sterge."); return; }
    setGifs((prev) => prev.filter((g) => g.id !== id));
    setSelectedGifId(null);
    remove(ref(db, `posters/${posterId}/gifs/${id}`));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [posterId, spend]);

  const handleSelectGif = useCallback((id: string | null) => setSelectedGifId(id), []);

  // ── Graffiti placement ────────────────────────────────────────────────
  // Step 1: picker selects pattern → show preview centered on grid
  const handleGraffitiPreview = useCallback((pattern: GraffitiPattern) => {
    const startRow = Math.max(0, Math.floor((GRID_ROWS - pattern.height) / 2));
    const startCol = Math.max(0, Math.floor((GRID_COLS - pattern.width) / 2));
    setPendingGraffiti({ pattern, startRow, startCol });
  }, []);

  // Move preview by one cell (clamped to grid bounds)
  const moveGraffiti = useCallback((dRow: number, dCol: number) => {
    setPendingGraffiti((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        startRow: Math.max(0, Math.min(GRID_ROWS - prev.pattern.height, prev.startRow + dRow)),
        startCol: Math.max(0, Math.min(GRID_COLS - prev.pattern.width, prev.startCol + dCol)),
      };
    });
  }, []);

  // Tap on canvas sets top-left corner of pattern (clamped)
  const handleGraffitiPositionPress = useCallback((row: number, col: number) => {
    setPendingGraffiti((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        startRow: Math.max(0, Math.min(GRID_ROWS - prev.pattern.height, row)),
        startCol: Math.max(0, Math.min(GRID_COLS - prev.pattern.width, col)),
      };
    });
  }, []);

  // Step 2: confirm → spend tokens + stamp
  const handleGraffitiConfirm = useCallback(async () => {
    if (!pendingGraffiti || !posterId || !uid) return;
    const { pattern, startRow, startCol } = pendingGraffiti;
    const ok = await spend(50);
    if (!ok) { Alert.alert("Tokens insuficiente", "Ai nevoie de 50 tokens pt graffiti."); return; }
    const updates: Record<string, any> = {};
    pattern.pixels.forEach((row, r) => {
      row.forEach((filled, c) => {
        if (filled) {
          const gr = startRow + r;
          const gc = startCol + c;
          if (gr < GRID_ROWS && gc < GRID_COLS) {
            updates[`${gr}_${gc}`] = { color: brushColor, teamId, username, uid, t: serverTimestamp() };
          }
        }
      });
    });
    update(ref(db, `posters/${posterId}/pixels`), updates);
    setPixels((prev) => {
      const next = new Map(prev);
      Object.entries(updates).forEach(([key, val]) => next.set(key, val as PixelData));
      return next;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logActivity({ type: "graffiti", username, teamId, posterId });
    setPendingGraffiti(null);
    setActiveTool("pixel");
  }, [pendingGraffiti, posterId, uid, brushColor, teamId, username, spend]);

  const handleGraffitiCancel = useCallback(() => {
    setPendingGraffiti(null);
    setActiveTool("pixel");
  }, []);

  // ── AI Poster ──────────────────────────────────────────────────────────
  const handleAiPosterConfirm = useCallback(async (url: string) => {
    if (!posterId || !uid) return;
    const ok = await spend(150);
    if (!ok) { Alert.alert("Tokens insuficiente", "Ai nevoie de 150 tokens pt AI poster."); return; }
    const aiRef = push(ref(db, `posters/${posterId}/gifs`), {
      url, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 1, rotation: 0, teamId, username, uid, type: "ai_poster",
    });
    if (aiRef.key) {
      setGifs((prev) => [...prev, { id: aiRef.key!, url, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 1, rotation: 0 }]);
      setSelectedGifId(aiRef.key);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logActivity({ type: "ai_poster", username, teamId, posterId });
    setActiveTool("sticker");
  }, [posterId, uid, teamId, username, spend]);

  // ── Anthem callbacks ───────────────────────────────────────────────────
  const handleAnthemSelect = useCallback(async (track: JamendoTrack) => {
    if (!posterId || !uid) return;
    const ok = await spend(100);
    if (!ok) { Alert.alert("Tokens insuficiente", "Ai nevoie de 100 tokens pt anthem."); return; }
    update(ref(db, `posters/${posterId}/anthem`), {
      url: track.audio,
      teamId,
      name: track.name,
      artist: track.artist_name,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logActivity({ type: "anthem", username, teamId, posterId });
    setShowAnthemPicker(false);
  }, [posterId, teamId, uid, username, spend]);

  const handleClearAnthem = useCallback(() => {
    if (!posterId) return;
    remove(ref(db, `posters/${posterId}/anthem`));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [posterId]);

  // ── Derived state ──────────────────────────────────────────────────────
  const teamPixelCounts: Record<string, number> = {};
  pixels.forEach((p) => { teamPixelCounts[p.teamId] = (teamPixelCounts[p.teamId] || 0) + 1; });
  const totalPixels = Object.values(teamPixelCounts).reduce((a, b) => a + b, 0) || 1;

  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

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

  const isSticker = activeTool === "sticker";

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.softGray} />
        </TouchableOpacity>
        <Text style={styles.posterLabel} numberOfLines={1}>
          {POSTER_NAMES[posterId] || posterId}
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.tokenBadge}>
            <Ionicons name="diamond-outline" size={12} color={Colors.teamYellow} />
            <Text style={styles.tokenText}>{tokens}</Text>
          </View>
          <Animated.View style={[styles.pulseDot, pulseStyle]} />
          <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
        </View>
      </Animated.View>

      {/* Territory bar */}
      <View style={styles.territoryBar}>
        {Object.entries(teamPixelCounts).map(([team, count]) => (
          <View key={team} style={{
            flex: count / totalPixels, height: 6,
            backgroundColor: TEAMS[team as TeamId]?.color ?? Colors.navyLight,
          }} />
        ))}
        {totalPixels <= 1 && <View style={{ flex: 1, height: 6, backgroundColor: Colors.navyLight }} />}
      </View>

      {/* Canvas */}
      <Animated.View style={[styles.canvas, glitchStyle]}>
        {/* Layer 1: Pixel grid */}
        <PixelGrid
          pixels={pixels}
          selectedColor={brushColor}
          cellSize={CELL_SIZE}
          gridCols={GRID_COLS}
          gridRows={GRID_ROWS}
          onPixelPress={
            pendingGraffiti ? handleGraffitiPositionPress :
            (activeTool === "pixel" || activeTool === "eraser" ? handlePixelPress : () => {})
          }
          onPixelDrag={
            pendingGraffiti ? handleGraffitiPositionPress :
            (activeTool === "pixel" || activeTool === "eraser" ? handlePixelDrag : undefined)
          }
          backgroundImage={posterImage}
        />

        {/* Layer 1.5: Graffiti placement preview */}
        {pendingGraffiti && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pendingGraffiti.pattern.pixels.flatMap((row, r) =>
              row.map((filled, c) => {
                if (!filled) return null;
                return (
                  <View
                    key={`preview_${r}_${c}`}
                    style={{
                      position: "absolute",
                      left: (pendingGraffiti.startCol + c) * CELL_SIZE,
                      top: (pendingGraffiti.startRow + r) * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: brushColor,
                      opacity: 0.65,
                    }}
                  />
                );
              })
            )}
          </View>
        )}

        {/* Layer 2: GIF stickers */}
        {gifs.map((gif) => (
          <GifStickerItem
            key={gif.id} gif={gif}
            isSelected={selectedGifId === gif.id}
            interactive={isSticker}
            onSelect={handleSelectGif}
            onUpdate={handleUpdateGif}
            onDelete={handleDeleteGif}
          />
        ))}

        {pixels.size === 0 && gifs.length === 0 && (
          <View style={styles.emptyState} pointerEvents="none">
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyText}>Tap pixels to draw!</Text>
          </View>
        )}

        {anthem && anthem.teamId !== teamId && (
          <Animated.View entering={FadeIn.duration(500)}
            style={[styles.enemyBanner, { borderColor: TEAMS[anthem.teamId as TeamId]?.color ?? Colors.error }]}
            pointerEvents="none"
          >
            <Ionicons name="warning" size={14} color={Colors.error} />
            <Text style={styles.enemyBannerText}>
              TERITORIU {(TEAMS[anthem.teamId as TeamId]?.name ?? "INAMIC").toUpperCase()}
            </Text>
            <Ionicons name="musical-notes" size={14} color={TEAMS[anthem.teamId as TeamId]?.color ?? Colors.error} />
          </Animated.View>
        )}
      </Animated.View>

      {/* Toolbar */}
      <ScrollView style={styles.toolbarScroll} contentContainerStyle={styles.toolbarContent}>
        <View style={styles.toolRow}>
          {([
            { tool: "pixel" as Tool, icon: "grid-outline" as const },
            { tool: "eraser" as Tool, icon: "backspace-outline" as const },
            { tool: "graffiti" as Tool, icon: "color-fill-outline" as const },
            { tool: "sticker" as Tool, icon: "happy-outline" as const },
          ]).map(({ tool, icon }) => (
            <TouchableOpacity
              key={tool}
              style={[styles.toolButton, activeTool === tool && styles.toolButtonActive]}
              onPress={() => {
                setActiveTool(tool);
                setSelectedGifId(null);
                if (tool !== "graffiti") setPendingGraffiti(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name={icon} size={22} color={activeTool === tool ? Colors.itecBright : Colors.softGray} />
            </TouchableOpacity>
          ))}
        </View>

        {activeTool === "pixel" && (
          <View style={styles.colorRow}>
            {PIXEL_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorDot, { backgroundColor: color }, brushColor === color && styles.colorDotSelected]}
                onPress={() => { setBrushColor(color); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              />
            ))}
          </View>
        )}

        {activeTool === "graffiti" && !pendingGraffiti && (
          <View style={styles.stickerActions}>
            <TouchableOpacity style={styles.addGifBtn} onPress={() => setShowGraffitiPicker(true)}>
              <Ionicons name="color-fill" size={20} color={Colors.itecBright} />
              <Text style={styles.addGifText}>PICK STAMP (50)</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTool === "graffiti" && pendingGraffiti && (
          <View style={styles.graffitiPlacement}>
            <Text style={styles.placementHint}>TAP CANVAS OR USE ARROWS TO POSITION</Text>
            <View style={styles.arrowPad}>
              <View style={styles.arrowRow}>
                <View style={styles.arrowSpacer} />
                <TouchableOpacity style={styles.arrowBtn} onPress={() => moveGraffiti(-1, 0)}>
                  <Ionicons name="arrow-up" size={18} color={Colors.white} />
                </TouchableOpacity>
                <View style={styles.arrowSpacer} />
              </View>
              <View style={styles.arrowRow}>
                <TouchableOpacity style={styles.arrowBtn} onPress={() => moveGraffiti(0, -1)}>
                  <Ionicons name="arrow-back" size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.arrowBtn} onPress={() => moveGraffiti(1, 0)}>
                  <Ionicons name="arrow-down" size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.arrowBtn} onPress={() => moveGraffiti(0, 1)}>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.graffitiConfirmRow}>
              <TouchableOpacity style={styles.stampConfirmBtn} onPress={handleGraffitiConfirm}>
                <Ionicons name="checkmark" size={16} color={Colors.navyDeep} />
                <Text style={styles.stampConfirmText}>STAMP (50)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stampCancelBtn} onPress={handleGraffitiCancel}>
                <Ionicons name="close" size={16} color={Colors.error} />
                <Text style={styles.stampCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTool === "sticker" && (
          <View style={styles.stickerActions}>
            <TouchableOpacity style={styles.addGifBtn} onPress={() => setShowGifPicker(true)}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.itecBright} />
              <Text style={styles.addGifText}>ADD GIF (100)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addGifBtn} onPress={() => setShowAiPoster(true)}>
              <Ionicons name="sparkles" size={20} color={Colors.itecBright} />
              <Text style={styles.addGifText}>AI ART (150)</Text>
            </TouchableOpacity>
            {selectedGifId && (
              <TouchableOpacity style={styles.deleteGifBtn} onPress={() => handleDeleteGif(selectedGifId)}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteGifText}>DELETE (150)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Anthem */}
        <View style={styles.anthemRow}>
          {anthem?.teamId === teamId ? (
            <View style={styles.anthemActiveRow}>
              <Ionicons name="musical-notes" size={15} color={teamColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.anthemActiveText, { color: teamColor }]}>ANTHEM ACTIV</Text>
                {anthem.name ? (
                  <Text style={styles.anthemTrackName} numberOfLines={1}>
                    {anthem.name}{anthem.artist ? ` — ${anthem.artist}` : ""}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={handleClearAnthem} style={styles.anthemClearBtn}>
                <Ionicons name="close-circle" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.setAnthemBtn} onPress={() => setShowAnthemPicker(true)}>
              <Ionicons name="musical-notes-outline" size={15} color={Colors.softGray} />
              <Text style={styles.setAnthemText}>SET ANTHEM (100)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <GifPickerModal visible={showGifPicker} onSelect={handleAddGif} onClose={() => setShowGifPicker(false)} />
      <GraffitiPicker visible={showGraffitiPicker} teamColor={brushColor} onSelect={handleGraffitiPreview} onClose={() => setShowGraffitiPicker(false)} />
      <AiPosterModal visible={showAiPoster} onConfirm={handleAiPosterConfirm} onClose={() => setShowAiPoster(false)} />
      <AnthemPickerModal visible={showAnthemPicker} onSelect={handleAnthemSelect} onClose={() => setShowAnthemPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navyDeep, paddingHorizontal: Spacing.lg },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md, gap: Spacing.md },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.navyMid, borderWidth: 1, borderColor: Colors.navyLight, justifyContent: "center", alignItems: "center" },
  posterLabel: { ...Typography.h3, flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  tokenBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.navyMid, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.teamYellow + "44" },
  tokenText: { fontSize: 12, fontWeight: "800", color: Colors.teamYellow },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  teamDot: { width: 12, height: 12, borderRadius: 6 },
  territoryBar: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: Spacing.md },
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: Colors.navyMid, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.navyLight, overflow: "hidden", position: "relative" },
  emptyState: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { color: Colors.muted, fontSize: 14, letterSpacing: 1 },
  toolbarScroll: { flex: 1, marginTop: Spacing.md },
  toolbarContent: { backgroundColor: Colors.navyMid, borderRadius: Radii.pill, borderWidth: 1, borderColor: Colors.navyLight, padding: Spacing.lg, gap: Spacing.md, ...Shadows.card },
  toolRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.sm },
  toolButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.navyDeep, borderWidth: 1, borderColor: Colors.navyLight, justifyContent: "center", alignItems: "center" },
  toolButtonActive: { backgroundColor: Colors.itecBlue + "26", borderColor: Colors.itecBlue },
  colorRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.md },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  colorDotSelected: { borderColor: Colors.white, transform: [{ scale: 1.15 }] },
  stickerActions: { flexDirection: "row", justifyContent: "center", gap: Spacing.md },
  addGifBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.itecBlue + "26", borderWidth: 1, borderColor: Colors.itecBright, borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  addGifText: { color: Colors.itecBright, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
  deleteGifBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.error + "18", borderWidth: 1, borderColor: Colors.error + "66", borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  deleteGifText: { color: Colors.error, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
  errorText: { color: Colors.error, fontSize: 16, textAlign: "center", marginTop: Spacing.lg },
  errorBack: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.navyLight },
  errorBackText: { ...Typography.label },
  enemyBanner: { position: "absolute", bottom: Spacing.md, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.navyDeep + "EE", borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  enemyBannerText: { color: Colors.error, fontWeight: "800", fontSize: 11, letterSpacing: 2 },
  anthemRow: { borderTopWidth: 1, borderTopColor: Colors.navyLight, paddingTop: Spacing.md, alignItems: "center" },
  setAnthemBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.navyLight },
  setAnthemText: { color: Colors.softGray, fontWeight: "700", fontSize: 11, letterSpacing: 2 },
  anthemActiveRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  anthemActiveText: { fontWeight: "800", fontSize: 11, letterSpacing: 2 },
  anthemClearBtn: { marginLeft: Spacing.sm },
  anthemTrackName: { color: Colors.muted, fontSize: 10, letterSpacing: 1, marginTop: 1 },
  // Graffiti placement
  graffitiPlacement: { gap: Spacing.sm },
  placementHint: { color: Colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1, textAlign: "center" },
  arrowPad: { alignItems: "center", gap: 4 },
  arrowRow: { flexDirection: "row", gap: 4 },
  arrowSpacer: { width: 38 },
  arrowBtn: { width: 38, height: 38, borderRadius: Radii.md, backgroundColor: Colors.navyDeep, borderWidth: 1, borderColor: Colors.navyLight, justifyContent: "center", alignItems: "center" },
  graffitiConfirmRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.md },
  stampConfirmBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.success, borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  stampConfirmText: { color: Colors.navyDeep, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
  stampCancelBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.error + "18", borderWidth: 1, borderColor: Colors.error + "66", borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  stampCancelText: { color: Colors.error, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
});

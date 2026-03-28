import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import { db, ref, push, onChildAdded, onValue, off, remove, update, storage, storageRef, uploadBytes, getDownloadURL } from "@/lib/firebase";
import { VALID_POSTER_IDS, POSTER_NAMES } from "@/lib/poster-matcher";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import GifStickerItem, { CanvasGif, GIF_BASE_SIZE } from "@/components/GifStickerItem";
import GifPickerModal from "@/components/GifPickerModal";

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

type Tool = "brush" | "eraser" | "sticker";

interface Point { x: number; y: number }

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  teamId: string;
  username: string;
}

function pointsToSvgPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += `Q${points[i].x},${points[i].y},${midX},${midY}`;
  }
  const last = points[points.length - 1];
  d += `L${last.x},${last.y}`;
  return d;
}

export default function CanvasScreen() {
  const { posterId } = useLocalSearchParams<{ posterId: string }>();
  const isValidPoster = VALID_POSTER_IDS.includes(posterId as any);
  const { username, teamId } = useGame();
  const teamColor = TEAMS[teamId].color;
  const insets = useSafeAreaInsets();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushColor, setBrushColor] = useState<string>(teamColor);
  const [brushSize, setBrushSize] = useState(8);
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [isDrawing, setIsDrawing] = useState(false);

  const currentPointsRef = useRef<Point[]>([]);
  const rafRef = useRef<number | null>(null);
  const [currentPathD, setCurrentPathD] = useState("");

  // GIF state
  const [gifs, setGifs] = useState<CanvasGif[]>([]);
  const [selectedGifId, setSelectedGifId] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Anthem state
  interface Anthem { url: string; teamId: string }
  const [anthem, setAnthem] = useState<Anthem | null>(null);
  const [uploadingAnthem, setUploadingAnthem] = useState(false);

  // ── Firebase: strokes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!posterId || !isValidPoster) return;
    const strokesRef = ref(db, `posters/${posterId}/strokes`);
    const unsubscribe = onChildAdded(strokesRef, (snapshot) => {
      const stroke = snapshot.val() as Stroke;
      if (stroke) setStrokes((prev) => [...prev, stroke]);
    });
    return () => off(strokesRef);
  }, [posterId]);

  // ── Firebase: GIFs ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!posterId || !isValidPoster) return;
    const gifsRef = ref(db, `posters/${posterId}/gifs`);
    const unsubscribe = onValue(gifsRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      console.log("[GIF onValue] fired, keys:", Object.keys(data));
      const list: CanvasGif[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        url: val.url,
        x: val.x,
        y: val.y,
        scale: val.scale,
        rotation: val.rotation ?? 0,
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

  // ── Audio player — expo-audio (replaces deprecated expo-av) ───────────
  // Source is set only when on enemy territory; hook auto-cleans up on unmount.
  const enemyAnthemUrl = anthem && anthem.teamId !== teamId ? anthem.url : null;
  const anthemPlayer = useAudioPlayer(enemyAnthemUrl ? { uri: enemyAnthemUrl } : null);

  useEffect(() => {
    if (!enemyAnthemUrl) return;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    anthemPlayer.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [enemyAnthemUrl]);

  // ── Drawing ────────────────────────────────────────────────────────────
  const saveStroke = useCallback(
    (points: Point[]) => {
      if (!posterId || !isValidPoster || points.length < 2) return;
      const strokeData: Stroke = {
        points,
        color: activeTool === "eraser" ? Colors.navyMid : brushColor,
        width: activeTool === "eraser" ? 24 : brushSize,
        teamId,
        username,
      };
      push(ref(db, `posters/${posterId}/strokes`), strokeData);
    },
    [posterId, brushColor, brushSize, teamId, username, activeTool]
  );

  const handleTouchStart = (e: any) => {
    if (activeTool === "sticker") return;
    const { locationX, locationY } = e.nativeEvent;
    currentPointsRef.current = [{ x: locationX, y: locationY }];
    setCurrentPathD("");
    setIsDrawing(true);
    setSelectedGifId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTouchMove = (e: any) => {
    if (!isDrawing) return;
    const { locationX, locationY } = e.nativeEvent;
    if (locationX < 0 || locationX > CANVAS_SIZE || locationY < 0 || locationY > CANVAS_SIZE) {
      handleTouchEnd();
      return;
    }
    currentPointsRef.current.push({ x: locationX, y: locationY });
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      setCurrentPathD(pointsToSvgPath(currentPointsRef.current));
      rafRef.current = null;
    });
  };

  const handleTouchEnd = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (currentPointsRef.current.length > 1) {
      saveStroke(currentPointsRef.current);
    }
    currentPointsRef.current = [];
    setCurrentPathD("");
    setIsDrawing(false);
  };

  // ── GIF operations ─────────────────────────────────────────────────────
  const handleAddGif = useCallback(
    (url: string) => {
      if (!posterId || !isValidPoster) {
        console.warn("[GIF] handleAddGif blocked: posterId=", posterId, "isValidPoster=", isValidPoster);
        return;
      }

      // Firebase push — key is generated client-side synchronously
      const gifRef = push(ref(db, `posters/${posterId}/gifs`), {
        url,
        x: CANVAS_SIZE / 2,
        y: CANVAS_SIZE / 2,
        scale: 1,
        rotation: 0,
      });
      console.log("[GIF] push called, key=", gifRef.key);

      // Optimistic update: add to local state immediately so the GIF appears
      // even before Firebase onValue echoes back the write.
      if (gifRef.key) {
        const optimistic: CanvasGif = {
          id: gifRef.key,
          url,
          x: CANVAS_SIZE / 2,
          y: CANVAS_SIZE / 2,
          scale: 1,
          rotation: 0,
        };
        setGifs((prev) =>
          prev.find((g) => g.id === optimistic.id) ? prev : [...prev, optimistic]
        );
        setSelectedGifId(gifRef.key);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [posterId]
  );

  const handleUpdateGif = useCallback(
    (id: string, x: number, y: number, scale: number, rotation: number) => {
      if (!posterId) return;
      update(ref(db, `posters/${posterId}/gifs/${id}`), { x, y, scale, rotation });
    },
    [posterId]
  );

  const handleDeleteGif = useCallback(
    (id: string) => {
      if (!posterId) return;
      // Optimistic: remove from local state immediately
      setGifs((prev) => prev.filter((g) => g.id !== id));
      setSelectedGifId(null);
      // Also remove from Firebase for real-time sync
      remove(ref(db, `posters/${posterId}/gifs/${id}`));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [posterId]
  );

  const handleSelectGif = useCallback((id: string | null) => {
    setSelectedGifId(id);
  }, []);

  // ── Anthem callbacks ────────────────────────────────────────────────────
  const handlePickAnthem = useCallback(async () => {
    if (!posterId) return;

    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
    } catch {
      Alert.alert("Eroare", "Nu s-a putut deschide selectorul de fișiere.");
      return;
    }

    if (result.canceled || !result.assets?.[0]) return;

    const file = result.assets[0];
    setUploadingAnthem(true);
    try {
      // XMLHttpRequest blob — mai fiabil decât fetch().blob() pe Android
      // cu URI-uri content:// returnate de DocumentPicker
      const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response as Blob);
        xhr.onerror = () => reject(new Error("XHR blob fetch failed"));
        xhr.responseType = "blob";
        xhr.open("GET", file.uri, true);
        xhr.send(null);
      });

      const fileRef = storageRef(storage, `anthems/${posterId}`);
      await uploadBytes(fileRef, blob, { contentType: file.mimeType ?? "audio/mpeg" });
      const downloadUrl = await getDownloadURL(fileRef);
      update(ref(db, `posters/${posterId}/anthem`), { url: downloadUrl, teamId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const serverResp = err?.serverResponse ? JSON.stringify(err.serverResponse) : "none";
      console.error("[Anthem] upload error | code:", err?.code, "| msg:", err?.message, "| server:", serverResp);
      const msg =
        err?.code === "storage/unauthorized"
          ? "Regulile blochează accesul.\nFirebase Console → Storage → Rules → allow read, write: if true;"
          : err?.code === "storage/unknown"
          ? "Firebase Storage nu este activat.\nFirebase Console → Storage → Get Started, apoi Rules → allow read, write: if true;"
          : `Eroare: ${err?.code ?? err?.message}`;
      Alert.alert("Eroare upload", msg);
    } finally {
      setUploadingAnthem(false);
    }
  }, [posterId, teamId]);

  const handleClearAnthem = useCallback(() => {
    if (!posterId) return;
    remove(ref(db, `posters/${posterId}/anthem`));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [posterId]);

  // ── Derived state ──────────────────────────────────────────────────────
  const effectiveBrushColor = activeTool === "eraser" ? Colors.navyMid : brushColor;
  const effectiveBrushSize = activeTool === "eraser" ? 24 : brushSize;

  const savedStrokesPaths = useMemo(
    () =>
      strokes.map((stroke, i) => (
        <Path
          key={i}
          d={pointsToSvgPath(stroke.points)}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )),
    [strokes]
  );

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

  const isSticker = activeTool === "sticker";

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

      {/* ── Canvas ── */}
      <View style={styles.canvas}>
        {/* Layer 1: SVG strokes */}
        <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={StyleSheet.absoluteFill}>
          {savedStrokesPaths}
          {currentPathD ? (
            <Path
              d={currentPathD}
              stroke={effectiveBrushColor}
              strokeWidth={effectiveBrushSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>

        {/* Layer 2: GIF stickers */}
        {gifs.map((gif) => (
          <GifStickerItem
            key={gif.id}
            gif={gif}
            isSelected={selectedGifId === gif.id}
            interactive={isSticker}
            onSelect={handleSelectGif}
            onUpdate={handleUpdateGif}
            onDelete={handleDeleteGif}
          />
        ))}

        {/* Layer 3: Touch blocker for drawing (disabled in sticker mode) */}
        {!isSticker && (
          <View
            style={StyleSheet.absoluteFill}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {strokes.length === 0 && gifs.length === 0 && currentPathD === "" && (
          <View style={styles.emptyState} pointerEvents="none">
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyText}>Draw on this poster!</Text>
          </View>
        )}

        {/* Enemy territory banner — shown when someone else's anthem is set */}
        {anthem && anthem.teamId !== teamId && (
          <Animated.View
            entering={FadeIn.duration(500)}
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
      </View>

      {/* ── Toolbar ── */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.toolbar}>
        {/* Tool buttons */}
        <View style={styles.toolRow}>
          <TouchableOpacity
            style={[styles.toolButton, activeTool === "brush" && styles.toolButtonActive]}
            onPress={() => { setActiveTool("brush"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Ionicons name="brush" size={22} color={activeTool === "brush" ? Colors.itecBright : Colors.softGray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, activeTool === "eraser" && styles.toolButtonActive]}
            onPress={() => { setActiveTool("eraser"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Ionicons name="backspace-outline" size={22} color={activeTool === "eraser" ? Colors.itecBright : Colors.softGray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, activeTool === "sticker" && styles.toolButtonActive]}
            onPress={() => {
              setActiveTool("sticker");
              setSelectedGifId(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="happy-outline" size={22} color={activeTool === "sticker" ? Colors.itecBright : Colors.softGray} />
          </TouchableOpacity>
        </View>

        {/* Brush options */}
        {activeTool === "brush" && (
          <>
            <View style={styles.colorRow}>
              {BRUSH_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color }, brushColor === color && styles.colorDotSelected]}
                  onPress={() => { setBrushColor(color); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                />
              ))}
            </View>
            <View style={styles.sizeRow}>
              {BRUSH_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeButton, brushSize === size && { borderColor: brushColor }]}
                  onPress={() => { setBrushSize(size); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brushSize === size ? brushColor : Colors.muted }} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Sticker options */}
        {activeTool === "sticker" && (
          <View style={styles.stickerActions}>
            <TouchableOpacity
              style={styles.addGifBtn}
              onPress={() => setShowGifPicker(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.itecBright} />
              <Text style={styles.addGifText}>ADD GIF</Text>
            </TouchableOpacity>
            {selectedGifId && (
              <TouchableOpacity
                style={styles.deleteGifBtn}
                onPress={() => handleDeleteGif(selectedGifId)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteGifText}>DELETE</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Anthem section — always visible ── */}
        <View style={styles.anthemRow}>
          {anthem?.teamId === teamId ? (
            // Own anthem is active — show with remove option
            <View style={styles.anthemActiveRow}>
              <Ionicons name="musical-notes" size={15} color={teamColor} />
              <Text style={[styles.anthemActiveText, { color: teamColor }]}>ANTHEM ACTIV</Text>
              <TouchableOpacity onPress={handleClearAnthem} style={styles.anthemClearBtn}>
                <Ionicons name="close-circle" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : uploadingAnthem ? (
            // Uploading state
            <View style={styles.anthemActiveRow}>
              <ActivityIndicator size="small" color={Colors.itecBright} />
              <Text style={styles.setAnthemText}>SE ÎNCARCĂ...</Text>
            </View>
          ) : (
            // Button to pick audio file
            <TouchableOpacity style={styles.setAnthemBtn} onPress={handlePickAnthem}>
              <Ionicons name="musical-notes-outline" size={15} color={Colors.softGray} />
              <Text style={styles.setAnthemText}>SET ANTHEM</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── GIF Picker Modal ── */}
      <GifPickerModal
        visible={showGifPicker}
        onSelect={handleAddGif}
        onClose={() => setShowGifPicker(false)}
      />
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
  stickerActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  addGifBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.itecBlue + "26",
    borderWidth: 1,
    borderColor: Colors.itecBright,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  addGifText: {
    color: Colors.itecBright,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 2,
  },
  deleteGifBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.error + "18",
    borderWidth: 1,
    borderColor: Colors.error + "66",
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  deleteGifText: {
    color: Colors.error,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 2,
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

  // ── Enemy territory banner ──────────────────────────────────────────────
  enemyBanner: {
    position: "absolute",
    bottom: Spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.navyDeep + "EE",
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  enemyBannerText: {
    color: Colors.error,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 2,
  },

  // ── Anthem toolbar section ──────────────────────────────────────────────
  anthemRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.navyLight,
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  setAnthemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  setAnthemText: {
    color: Colors.softGray,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2,
  },
  anthemActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  anthemActiveText: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 2,
  },
  anthemClearBtn: {
    marginLeft: Spacing.sm,
  },
});

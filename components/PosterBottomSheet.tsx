import { DesignId, POSTER_DESIGNS } from "@/constants/poster-designs";
import { Colors, Radii, Spacing } from "@/constants/theme";
import { db, onValue, ref } from "@/lib/firebase";
import { TEAMS, TeamId } from "@/lib/game-state";
import { calculateTerritory } from "@/lib/territory";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");
const PREVIEW_SIZE = SCREEN_W - 80;
const PREVIEW_CELL = PREVIEW_SIZE / 40;

interface PosterBottomSheetProps {
  visible: boolean;
  instanceId: string;
  displayName: string;
  designId: DesignId;
  onClose: () => void;
}

export default function PosterBottomSheet({
  visible,
  instanceId,
  displayName,
  designId,
  onClose,
}: PosterBottomSheetProps) {
  const [pixels, setPixels] = useState<Record<string, any>>({});
  const [anthem, setAnthem] = useState<{ url: string; teamId: string } | null>(null);

  const design = POSTER_DESIGNS[designId];

  // Listen to pixels
  useEffect(() => {
    if (!visible || !instanceId) return;
    const pixelsRef = ref(db, `posters/${instanceId}/pixels`);
    const unsub = onValue(pixelsRef, (snap) => {
      setPixels(snap.val() || {});
    });
    return () => unsub();
  }, [visible, instanceId]);

  // Listen to anthem
  useEffect(() => {
    if (!visible || !instanceId) return;
    const anthemRef = ref(db, `posters/${instanceId}/anthem`);
    const unsub = onValue(anthemRef, (snap) => {
      setAnthem(snap.val());
    });
    return () => unsub();
  }, [visible, instanceId]);

  const territory = calculateTerritory(Object.keys(pixels).length > 0 ? pixels : null);
  const totalPixels = territory.totalPixels;
  const totalPossible = 40 * 40;

  // Sort teams by score descending
  const teamRanking = (Object.entries(territory.scores) as [TeamId, number][])
    .sort(([, a], [, b]) => b - a);

  const handleOpenCanvas = () => {
    onClose();
    router.push({ pathname: "/canvas/[posterId]", params: { posterId: instanceId } });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
          <View style={styles.backdropBg} />
        </Animated.View>
      </Pressable>

      {/* Sheet */}
      <Animated.View entering={SlideInDown.duration(350).springify()} style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{design?.emoji ?? "📌"}</Text>
            <View>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.designName}>{design?.name ?? designId}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.openBtn} onPress={handleOpenCanvas}>
            <Text style={styles.openBtnText}>OPEN →</Text>
          </TouchableOpacity>
        </View>

        {/* Canvas Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.sectionLabel}>CANVAS PREVIEW</Text>
          <View style={styles.previewFrame}>
            <Svg width={PREVIEW_SIZE} height={PREVIEW_SIZE}>
              <Rect x={0} y={0} width={PREVIEW_SIZE} height={PREVIEW_SIZE} fill={Colors.navyDeep} />
              {Object.entries(pixels).map(([key, data]: [string, any]) => {
                const [r, c] = key.split("_").map(Number);
                if (isNaN(r) || isNaN(c) || !data?.color) return null;
                return (
                  <Rect
                    key={key}
                    x={c * PREVIEW_CELL}
                    y={r * PREVIEW_CELL}
                    width={PREVIEW_CELL}
                    height={PREVIEW_CELL}
                    fill={data.color}
                  />
                );
              })}
            </Svg>
            {totalPixels === 0 && (
              <View style={styles.emptyOverlay}>
                <Text style={styles.emptyText}>UNCLAIMED</Text>
                <Text style={styles.emptyHint}>Be the first to vandalize!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboard}>
          <Text style={styles.sectionLabel}>TERRITORY CONTROL</Text>
          {teamRanking.length > 0 ? (
            <>
              {/* Bar */}
              <View style={styles.territoryBar}>
                {teamRanking.map(([team, score]) => (
                  <View
                    key={team}
                    style={{
                      flex: score,
                      height: 8,
                      backgroundColor: TEAMS[team]?.color ?? Colors.navyLight,
                    }}
                  />
                ))}
              </View>

              {/* Team rows */}
              {teamRanking.map(([team, score], i) => {
                const pct = Math.round((score / totalPixels) * 100);
                const isAnthemOwner = anthem?.teamId === team;
                return (
                  <View key={team} style={styles.teamRow}>
                    <View style={styles.teamRowLeft}>
                      <Text style={styles.rankNum}>{i + 1}</Text>
                      <View style={[styles.teamDot, { backgroundColor: TEAMS[team].color }]} />
                      <Text style={[styles.teamRowName, { color: TEAMS[team].color }]}>
                        {TEAMS[team].name}
                      </Text>
                    </View>
                    <View style={styles.teamRowRight}>
                      {isAnthemOwner && (
                        <View style={styles.anthemBadge}>
                          <Text style={styles.anthemBadgeText}>♫ ANTHEM</Text>
                        </View>
                      )}
                      <Text style={styles.teamPct}>{pct}%</Text>
                      <Text style={styles.teamPx}>{score}px</Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.noTeams}>
              <Text style={styles.noTeamsText}>No territory claimed yet</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalPixels}</Text>
            <Text style={styles.statLabel}>PIXELS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {Math.round((totalPixels / totalPossible) * 100)}%
            </Text>
            <Text style={styles.statLabel}>COVERED</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{teamRanking.length}</Text>
            <Text style={styles.statLabel}>TEAMS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{anthem ? "♫" : "—"}</Text>
            <Text style={styles.statLabel}>ANTHEM</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.navyLight,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  handleRow: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.navyLight,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  emoji: { fontSize: 28 },
  displayName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  designName: {
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1,
    marginTop: 1,
  },
  openBtn: {
    backgroundColor: Colors.teamCyan,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  openBtnText: {
    color: Colors.navyDeep,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },

  // Preview
  previewContainer: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.softGray,
    marginBottom: Spacing.sm,
  },
  previewFrame: {
    borderRadius: Radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.navyLight,
    alignSelf: "center",
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.softGray,
  },
  emptyHint: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
  },

  // Leaderboard
  leaderboard: {
    marginBottom: Spacing.lg,
  },
  territoryBar: {
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.md,
    gap: 2,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight + "30",
  },
  teamRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rankNum: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.muted,
    width: 16,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamRowName: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  teamRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  anthemBadge: {
    backgroundColor: Colors.teamYellow + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.teamYellow + "40",
  },
  anthemBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: Colors.teamYellow,
    letterSpacing: 1,
  },
  teamPct: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.white,
    minWidth: 36,
    textAlign: "right",
  },
  teamPx: {
    fontSize: 10,
    color: Colors.muted,
    minWidth: 40,
    textAlign: "right",
  },
  noTeams: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  noTeamsText: {
    color: Colors.muted,
    fontSize: 12,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.navyDeep + "80",
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.navyLight + "40",
    padding: Spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.white,
  },
  statLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.muted,
  },
});
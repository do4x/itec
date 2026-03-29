import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { db, ref, get } from "@/lib/firebase";
import type { PixelData } from "@/components/PixelGrid";
import { TEAMS, TeamId } from "@/lib/game-state";
import { getAvatar } from "@/constants/avatars";
import { POSTER_DESIGNS, DesignId } from "@/constants/poster-designs";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";

type LoadState = "loading" | "not_found" | "ready";

interface PosterStat {
  posterId: string;
  displayName: string;
  emoji: string;
  pixelCount: number;
}

export default function PlayerProfileScreen() {
  const { username, revenge } = useLocalSearchParams<{ username: string; revenge?: string }>();
  const isRevenge = revenge === "true";
  const insets = useSafeAreaInsets();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<{
    username: string;
    teamId: TeamId;
    avatar: string;
  } | null>(null);
  const [posterStats, setPosterStats] = useState<PosterStat[]>([]);

  useEffect(() => {
    if (!username) { setLoadState("not_found"); return; }

    let cancelled = false;

    async function loadPlayer() {
      try {
        // 1. Lookup UID from username
        const uidSnap = await get(ref(db, `usernames/${username.toLowerCase().trim()}`));
        if (!uidSnap.exists()) {
          if (!cancelled) setLoadState("not_found");
          return;
        }
        const uid = uidSnap.val() as string;

        // 2. Load user profile
        const userSnap = await get(ref(db, `users/${uid}`));
        if (!userSnap.exists()) {
          if (!cancelled) setLoadState("not_found");
          return;
        }
        const userData = userSnap.val();
        if (cancelled) return;

        setProfile({
          username: userData.username || username,
          teamId: (userData.teamId || "red") as TeamId,
          avatar: userData.avatar || "ghost",
        });

        // 3. Load posters + instances in parallel
        const [postersSnap, instancesSnap] = await Promise.all([
          get(ref(db, "posters")),
          get(ref(db, "posterInstances")),
        ]);

        const postersData = postersSnap.val() || {};
        const instancesData = instancesSnap.val() || {};

        // 4. Count pixels per poster for this user
        const stats: PosterStat[] = [];
        for (const [posterId, posterVal] of Object.entries(postersData)) {
          const pixels = (posterVal as any)?.pixels || {};
          let count = 0;
          for (const pixelData of Object.values(pixels) as PixelData[]) {
            if (pixelData.uid === uid) count++;
          }
          if (count > 0) {
            const instance = instancesData[posterId];
            const designId = instance?.designId as DesignId | undefined;
            const design = designId ? POSTER_DESIGNS[designId] : undefined;
            stats.push({
              posterId,
              displayName: instance?.displayName || posterId,
              emoji: design?.emoji || "📌",
              pixelCount: count,
            });
          }
        }
        stats.sort((a, b) => b.pixelCount - a.pixelCount);

        if (!cancelled) {
          setPosterStats(stats);
          setLoadState("ready");
        }
      } catch (e) {
        console.error("[PlayerProfile] load error:", e);
        if (!cancelled) setLoadState("not_found");
      }
    }

    loadPlayer();
    return () => { cancelled = true; };
  }, [username]);

  const teamColor = profile ? (TEAMS[profile.teamId]?.color ?? Colors.muted) : Colors.muted;
  const teamName = profile ? (TEAMS[profile.teamId]?.name ?? profile.teamId.toUpperCase()) : "";
  const currentAvatar = getAvatar(profile?.avatar);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.iceWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Revenge banner */}
      {isRevenge && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.revengeBanner}>
          <Text style={styles.revengeEmoji}>⚔️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.revengeTitle}>REVENGE MODE</Text>
            <Text style={styles.revengeSub}>Tap a poster to attack @{username}</Text>
          </View>
        </Animated.View>
      )}

      {/* Loading */}
      {loadState === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.itecBlue} />
        </View>
      )}

      {/* Not found */}
      {loadState === "not_found" && (
        <Animated.View entering={FadeInUp.duration(400)} style={styles.centered}>
          <Text style={styles.notFoundEmoji}>👤</Text>
          <Text style={styles.notFoundTitle}>PLAYER NOT FOUND</Text>
          <Text style={styles.notFoundSub}>@{username}</Text>
        </Animated.View>
      )}

      {/* Profile */}
      {loadState === "ready" && profile && (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Avatar + username + team */}
          <Animated.View entering={FadeInUp.duration(350)} style={styles.profileCard}>
            <View style={[styles.avatarCircle, { borderColor: currentAvatar.color }]}>
              <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>@{profile.username}</Text>
              <View style={[styles.teamBadge, { borderColor: teamColor }]}>
                <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
                <Text style={[styles.teamName, { color: teamColor }]}>{teamName}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Separator + section label */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>ACTIVE ON</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* Poster list */}
          {posterStats.length === 0 ? (
            <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.emptyPosters}>
              <Text style={styles.emptyEmoji}>🎨</Text>
              <Text style={styles.emptyText}>No pixels on any poster yet</Text>
            </Animated.View>
          ) : (
            posterStats.map((stat, i) => (
              <Animated.View
                key={stat.posterId}
                entering={FadeInUp.duration(300).delay(i * 50)}
              >
                <TouchableOpacity
                  style={[styles.posterRow, isRevenge && styles.posterRowRevenge]}
                  activeOpacity={isRevenge ? 0.6 : 1}
                  onPress={isRevenge ? () => router.push(`/canvas/${stat.posterId}?revenge=true` as any) : undefined}
                >
                  <Text style={styles.posterEmoji}>{stat.emoji}</Text>
                  <View style={styles.posterInfo}>
                    <Text style={styles.posterName} numberOfLines={1}>{stat.displayName}</Text>
                    <Text style={styles.posterId}>{stat.posterId}</Text>
                  </View>
                  <View style={[styles.pixelBadge, { backgroundColor: teamColor + "20", borderColor: teamColor }]}>
                    <Text style={[styles.pixelCount, { color: teamColor }]}>{stat.pixelCount} PX</Text>
                  </View>
                  {isRevenge && (
                    <Ionicons name="chevron-forward" size={16} color="#FF4444" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    paddingHorizontal: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  backBtn: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  headerTitle: {
    ...Typography.h2,
    letterSpacing: 4,
    flex: 1,
  },
  headerSpacer: { width: 38 },

  // Loading / not found
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  notFoundEmoji: { fontSize: 64 },
  notFoundTitle: { ...Typography.h3, color: Colors.softGray },
  notFoundSub: { ...Typography.caption, color: Colors.muted },

  // Scroll
  scroll: { flex: 1 },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.soft,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navyDeep,
  },
  avatarEmoji: { fontSize: 30 },
  profileInfo: { gap: Spacing.xs },
  username: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  teamBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  teamDot: { width: 7, height: 7, borderRadius: 4 },
  teamName: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },

  // Section separator
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.navyLight },
  sectionLabel: {
    color: Colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 3,
  },

  // Empty state
  emptyPosters: {
    alignItems: "center",
    paddingVertical: Spacing.huge,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: Colors.muted, fontSize: 13, fontWeight: "600" },

  // Revenge banner
  revengeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: "#3A0A0A",
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: "#FF4444",
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  revengeEmoji: { fontSize: 28 },
  revengeTitle: {
    color: "#FF4444",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 3,
  },
  revengeSub: {
    color: "#FF9999",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  // Poster row
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.soft,
  },
  posterRowRevenge: {
    borderColor: "#FF4444",
    backgroundColor: "#1A0A0A",
  },
  posterEmoji: { fontSize: 24 },
  posterInfo: { flex: 1, gap: 2 },
  posterName: { color: Colors.iceWhite, fontSize: 13, fontWeight: "700" },
  posterId: { color: Colors.muted, fontSize: 9, letterSpacing: 0.5 },
  pixelBadge: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  pixelCount: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});

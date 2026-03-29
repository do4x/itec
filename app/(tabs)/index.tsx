import GridMap from "@/components/GridMap";
import PosterBottomSheet from "@/components/PosterBottomSheet";
import PosterCard from "@/components/PosterCard";
import ProfileModal from "@/components/ProfileModal";
import TokenIcon from "@/components/TokenIcon";
import { DesignId, POSTER_DESIGNS, PosterInstance } from "@/constants/poster-designs";
import { getAvatar } from "@/constants/avatars";
import { Colors, Radii, Shadows, Spacing, Typography } from "@/constants/theme";
import { db, onValue, ref } from "@/lib/firebase";
import { TeamId, TEAMS, useGame } from "@/lib/game-state";
import { calculateTerritory, TerritoryInfo } from "@/lib/territory";
import { useTokens } from "@/lib/tokens";
import { usePosterInstances } from "@/lib/use-poster-instances";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MapScreen() {
  const { uid, teamId, avatar } = useGame();
  const { tokens } = useTokens(uid);
  const insets = useSafeAreaInsets();
  const { instances, instanceCount } = usePosterInstances();
  const [territories, setTerritories] = useState<Record<string, TerritoryInfo>>({});
  const [showProfile, setShowProfile] = useState(false);
  const currentAvatar = getAvatar(avatar);

  // Bottom sheet
  const [selectedInstance, setSelectedInstance] = useState<PosterInstance | null>(null);

  useEffect(() => {
    const postersRef = ref(db, "posters");
    const unsub = onValue(postersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const newTerritories: Record<string, TerritoryInfo> = {};
      for (const inst of instances) {
        const posterData = data[inst.id] || {};
        newTerritories[inst.id] = calculateTerritory(posterData.pixels || null);
      }
      setTerritories(newTerritories);
    });
    return () => unsub();
  }, [instances]);

  // Global scores
  const globalScores: Partial<Record<TeamId, number>> = {};
  Object.values(territories).forEach((t) => {
    Object.entries(t.scores).forEach(([team, score]) => {
      globalScores[team as TeamId] = (globalScores[team as TeamId] || 0) + score;
    });
  });
  const globalTotal = Object.values(globalScores).reduce((a, b) => a + b, 0) || 1;

  // Pin/card press → open bottom sheet
  const handlePosterPress = (posterId: string) => {
    const inst = instances.find((i) => i.id === posterId);
    if (inst) {
      setSelectedInstance(inst);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>OVERRIDE</Text>
        <View style={styles.headerRight}>
          {/* DEV — remove before demo */}
          <TouchableOpacity style={styles.devBtn} onPress={() => router.push("/calibrate")}>
            <Text style={styles.devBtnText}>📍{instanceCount > 0 ? ` ${instanceCount}` : ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.devBtn2} onPress={() => router.push("/gps-test")}>
            <Text style={styles.devBtn2Text}>📡</Text>
          </TouchableOpacity>
          <View style={styles.tokenBadge}>
            <TokenIcon size={13} color={Colors.teamYellow} innerColor={Colors.navyDeep} />
            <Text style={styles.tokenText}>{tokens}</Text>
          </View>
          <View style={[styles.teamBadge, { borderColor: TEAMS[teamId]?.color }]}>
            <View style={[styles.badgeDot, { backgroundColor: TEAMS[teamId]?.color }]} />
            <Text style={[styles.badgeText, { color: TEAMS[teamId]?.color }]}>{TEAMS[teamId]?.name}</Text>
          </View>
          {/* Buton profil */}
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => setShowProfile(true)}
          >
            <Image source={currentAvatar.image} style={styles.avatarBtnImage} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* GPS Grid Map — uses calibrated instance coords */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GridMap
            territories={territories}
            onPosterPress={handlePosterPress}
            posterLocations={instances.map((inst) => ({
              id: inst.id,
              name: inst.displayName,
              emoji: POSTER_DESIGNS[inst.designId]?.emoji ?? "📌",
              lat: inst.lat,
              lng: inst.lng,
            }))}
          />
        </Animated.View>

        {/* Global Control */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.scoreSection}>
          <Text style={styles.sectionLabel}>GLOBAL CONTROL</Text>
          <View style={styles.globalBar}>
            {(Object.entries(globalScores) as [TeamId, number][]).map(([team, score]) => (
              <View key={team} style={{ flex: score / globalTotal, height: 6, backgroundColor: TEAMS[team]?.color ?? Colors.navyLight }} />
            ))}
            {globalTotal <= 1 && <View style={{ flex: 1, height: 6, backgroundColor: Colors.navyLight }} />}
          </View>
          <View style={styles.legendRow}>
            {(Object.keys(TEAMS) as TeamId[]).map((t) => (
              <View key={t} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: TEAMS[t].color }]} />
                <Text style={styles.legendText}>
                  {TEAMS[t].name} {globalScores[t] ? `${Math.round(((globalScores[t] || 0) / globalTotal) * 100)}%` : "0%"}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Poster List */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>POSTERS</Text>
        {instances.length > 0 ? (
          instances.map((inst, i) => (
            <PosterCard
              key={inst.id}
              name={inst.displayName}
              emoji={POSTER_DESIGNS[inst.designId]?.emoji ?? "📌"}
              posterId={inst.id}
              territory={territories[inst.id]}
              index={i}
              onPress={() => handlePosterPress(inst.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyTitle}>No posters calibrated</Text>
            <Text style={styles.emptyHint}>Tap 📍 to add poster positions</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sheet */}
      <PosterBottomSheet
        visible={!!selectedInstance}
        instanceId={selectedInstance?.id ?? ""}
        displayName={selectedInstance?.displayName ?? ""}
        designId={(selectedInstance?.designId as DesignId) ?? "afis1"}
        onClose={() => setSelectedInstance(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navyDeep, paddingHorizontal: Spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  title: { ...Typography.h2, letterSpacing: 4 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  devBtn: { backgroundColor: Colors.teamGreen + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.teamGreen + "44" },
  devBtnText: { fontSize: 9, fontWeight: "800", color: Colors.teamGreen },
  devBtn2: { backgroundColor: Colors.teamCyan + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.teamCyan + "44" },
  devBtn2Text: { fontSize: 9, fontWeight: "800", color: Colors.teamCyan },
  tokenBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.teamYellow + "22", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.teamYellow + "44" },
  tokenText: { fontSize: 12, fontWeight: "800", color: Colors.teamYellow },
  teamBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, backgroundColor: Colors.navyMid },
  avatarBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.teamCyan, alignItems: "center", justifyContent: "center", backgroundColor: Colors.navyMid, overflow: "hidden" },
  avatarBtnImage: { width: 28, height: 28, borderRadius: 14 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  scoreSection: { marginTop: Spacing.lg, backgroundColor: Colors.navyMid, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.navyLight, padding: Spacing.lg, ...Shadows.soft },
  sectionLabel: { ...Typography.label, marginBottom: Spacing.md },
  globalBar: { flexDirection: "row", borderRadius: Radii.sm, overflow: "hidden", marginBottom: Spacing.md },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.softGray, fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  emptyState: { alignItems: "center", paddingVertical: Spacing.huge },
  emptyEmoji: { fontSize: 32, marginBottom: Spacing.md },
  emptyTitle: { color: Colors.softGray, fontSize: 14, fontWeight: "600" },
  emptyHint: { color: Colors.muted, fontSize: 12, marginTop: 4 },
});

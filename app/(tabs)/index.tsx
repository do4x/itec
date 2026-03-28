import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import { db, ref, onValue, off } from "@/lib/firebase";
import { useTokens } from "@/lib/tokens";
import { calculateTerritory, TerritoryInfo } from "@/lib/territory";
import { POSTER_LOCATIONS } from "@/constants/poster-locations";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GridMap from "@/components/GridMap";
import PosterCard from "@/components/PosterCard";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function MapScreen() {
  const { uid, teamId } = useGame();
  const { tokens } = useTokens(uid);
  const insets = useSafeAreaInsets();
  const [territories, setTerritories] = useState<Record<string, TerritoryInfo>>({});

  useEffect(() => {
    const postersRef = ref(db, "posters");
    const unsub = onValue(postersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const newTerritories: Record<string, TerritoryInfo> = {};
      for (const poster of POSTER_LOCATIONS) {
        const posterData = data[poster.id] || {};
        newTerritories[poster.id] = calculateTerritory(posterData.pixels || null);
      }
      setTerritories(newTerritories);
    });
    return () => unsub();
  }, []);

  // Global scores
  const globalScores: Partial<Record<TeamId, number>> = {};
  Object.values(territories).forEach((t) => {
    Object.entries(t.scores).forEach(([team, score]) => {
      globalScores[team as TeamId] = (globalScores[team as TeamId] || 0) + score;
    });
  });
  const globalTotal = Object.values(globalScores).reduce((a, b) => a + b, 0) || 1;

  const handlePosterPress = (posterId: string) => {
    router.push({ pathname: "/canvas/[posterId]", params: { posterId } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>OVERRIDE</Text>
        <View style={styles.headerRight}>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenText}>{tokens}</Text>
          </View>
          <View style={[styles.teamBadge, { borderColor: TEAMS[teamId].color }]}>
            <View style={[styles.badgeDot, { backgroundColor: TEAMS[teamId].color }]} />
            <Text style={[styles.badgeText, { color: TEAMS[teamId].color }]}>{TEAMS[teamId].name}</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* GPS Grid Map */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GridMap territories={territories} onPosterPress={handlePosterPress} />
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
        {POSTER_LOCATIONS.map((poster, i) => (
          <PosterCard
            key={poster.id}
            name={poster.name}
            emoji={poster.emoji}
            posterId={poster.id}
            territory={territories[poster.id]}
            index={i}
            onPress={() => handlePosterPress(poster.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navyDeep, paddingHorizontal: Spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  title: { ...Typography.h2, letterSpacing: 4 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  tokenBadge: { backgroundColor: Colors.teamYellow + "22", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.teamYellow + "44" },
  tokenText: { fontSize: 12, fontWeight: "800", color: Colors.teamYellow },
  teamBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, backgroundColor: Colors.navyMid },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  scoreSection: { marginTop: Spacing.lg, backgroundColor: Colors.navyMid, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.navyLight, padding: Spacing.lg, ...Shadows.soft },
  sectionLabel: { ...Typography.label, marginBottom: Spacing.md },
  globalBar: { flexDirection: "row", borderRadius: Radii.sm, overflow: "hidden", marginBottom: Spacing.md },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.softGray, fontSize: 10, fontWeight: "600", letterSpacing: 1 },
});

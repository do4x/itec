import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import { db, ref, onValue, off } from "@/lib/firebase";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PosterCard from "@/components/PosterCard";
import Animated, { FadeInDown } from "react-native-reanimated";

const POSTER_LOCATIONS = [
  { id: "afis2", name: "Digital Marketing (Red)", emoji: "📱" },
  { id: "afis3", name: "Digital Marketing (Violet)", emoji: "💜" },
  { id: "afis4", name: "Creează fără limite", emoji: "🥤" },
  { id: "afis5", name: "Best Burger in Town", emoji: "🍔" },
  { id: "afis6", name: "Form Follows Function", emoji: "🏗️" },
  { id: "afis7", name: "Explore the World", emoji: "🌍" },
  { id: "afis8", name: "Fashion Business", emoji: "👗" },
  { id: "afis9", name: "Exclusive Sneakers", emoji: "👟" },
  { id: "afis10", name: "itec Yellow", emoji: "💛" },
];

interface PosterData {
  strokes?: Record<string, { teamId: string; points: { x: number; y: number }[] }>;
}

interface TerritoryInfo {
  dominantTeam: TeamId | null;
  scores: Partial<Record<TeamId, number>>;
  totalStrokes: number;
}

export default function MapScreen() {
  const { teamId } = useGame();
  const insets = useSafeAreaInsets();
  const [territories, setTerritories] = useState<Record<string, TerritoryInfo>>({});

  useEffect(() => {
    const postersRef = ref(db, "posters");

    onValue(postersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const newTerritories: Record<string, TerritoryInfo> = {};

      for (const posterId of POSTER_LOCATIONS.map((p) => p.id)) {
        const posterData: PosterData = data[posterId] || {};
        const strokes = posterData.strokes || {};

        const scores: Partial<Record<TeamId, number>> = {};
        let totalStrokes = 0;

        Object.values(strokes).forEach((stroke) => {
          const points = stroke.points?.length || 0;
          scores[stroke.teamId as TeamId] =
            (scores[stroke.teamId as TeamId] || 0) + points;
          totalStrokes += points;
        });

        let dominantTeam: TeamId | null = null;
        let maxScore = 0;
        for (const [team, score] of Object.entries(scores)) {
          if (score > maxScore) {
            maxScore = score;
            dominantTeam = team as TeamId;
          }
        }

        newTerritories[posterId] = { dominantTeam, scores, totalStrokes };
      }

      setTerritories(newTerritories);
    });

    return () => off(postersRef);
  }, []);

  const globalScores: Partial<Record<TeamId, number>> = {};
  Object.values(territories).forEach((t) => {
    Object.entries(t.scores).forEach(([team, score]) => {
      globalScores[team as TeamId] = (globalScores[team as TeamId] || 0) + score;
    });
  });
  const globalTotal =
    Object.values(globalScores).reduce((a, b) => a + b, 0) || 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>OVERRIDE</Text>
        <View style={[styles.teamBadge, { borderColor: TEAMS[teamId].color }]}>
          <View style={[styles.badgeDot, { backgroundColor: TEAMS[teamId].color }]} />
          <Text style={[styles.badgeText, { color: TEAMS[teamId].color }]}>
            {TEAMS[teamId].name}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.scoreSection}>
        <Text style={styles.sectionLabel}>GLOBAL CONTROL</Text>
        <View style={styles.globalBar}>
          {(Object.entries(globalScores) as [TeamId, number][]).map(
            ([team, score]) => (
              <View
                key={team}
                style={{
                  flex: score / globalTotal,
                  height: 6,
                  backgroundColor: TEAMS[team]?.color ?? Colors.navyLight,
                }}
              />
            )
          )}
          {globalTotal <= 1 && (
            <View style={{ flex: 1, height: 6, backgroundColor: Colors.navyLight }} />
          )}
        </View>
        <View style={styles.legendRow}>
          {(Object.keys(TEAMS) as TeamId[]).map((t) => (
            <View key={t} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TEAMS[t].color }]} />
              <Text style={styles.legendText}>
                {TEAMS[t].name}{" "}
                {globalScores[t]
                  ? `${Math.round(((globalScores[t] || 0) / globalTotal) * 100)}%`
                  : "0%"}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <ScrollView
        style={styles.posterList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={styles.sectionLabel}>POSTERS</Text>
        {POSTER_LOCATIONS.map((poster, i) => (
          <PosterCard
            key={poster.id}
            name={poster.name}
            emoji={poster.emoji}
            posterId={poster.id}
            territory={territories[poster.id]}
            index={i}
            onPress={() =>
              router.push({
                pathname: "/canvas/[posterId]",
                params: { posterId: poster.id },
              })
            }
          />
        ))}
      </ScrollView>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h2,
    letterSpacing: 4,
  },
  teamBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.navyMid,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  scoreSection: {
    marginBottom: Spacing.xxl,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  sectionLabel: {
    ...Typography.label,
    marginBottom: Spacing.md,
  },
  globalBar: {
    flexDirection: "row",
    borderRadius: Radii.sm,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.softGray,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  posterList: {
    flex: 1,
  },
});

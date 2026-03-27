// app/map.tsx
// ============================================
// MAP — Territory overview. Which team controls which poster.
// ============================================
// For the hackathon: hardcode poster locations based on where
// you physically place QR codes. Update POSTER_LOCATIONS below.

import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import { db, ref, onValue, off } from "@/lib/firebase";

const POSTER_LOCATIONS = [
  { id: "afis2", name: "Digital Marketing (Roșu)", emoji: "📱" },
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
  const teamColor = TEAMS[teamId].color;
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

        // Find dominant team
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

  // Global team scores
  const globalScores: Partial<Record<TeamId, number>> = {};
  Object.values(territories).forEach((t) => {
    Object.entries(t.scores).forEach(([team, score]) => {
      globalScores[team as TeamId] = (globalScores[team as TeamId] || 0) + score;
    });
  });

  const globalTotal =
    Object.values(globalScores).reduce((a, b) => a + b, 0) || 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← SCAN</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TERRITORY</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Global Score Bar */}
      <View style={styles.scoreSection}>
        <Text style={styles.sectionLabel}>CONTROL GLOBAL</Text>
        <View style={styles.globalBar}>
          {(Object.entries(globalScores) as [TeamId, number][]).map(
            ([team, score]) => (
              <View
                key={team}
                style={{
                  flex: score / globalTotal,
                  height: 8,
                  backgroundColor: TEAMS[team]?.color || "#333",
                }}
              />
            )
          )}
          {globalTotal <= 1 && (
            <View style={{ flex: 1, height: 8, backgroundColor: "#222" }} />
          )}
        </View>
        <View style={styles.legendRow}>
          {(Object.keys(TEAMS) as TeamId[]).map((t) => (
            <View key={t} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: TEAMS[t].color }]}
              />
              <Text style={styles.legendText}>
                {TEAMS[t].name}{" "}
                {globalScores[t]
                  ? `${Math.round(((globalScores[t] || 0) / globalTotal) * 100)}%`
                  : "0%"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Poster Cards */}
      <ScrollView style={styles.posterList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>AFIȘE</Text>
        {POSTER_LOCATIONS.map((poster) => {
          const territory = territories[poster.id];
          const dominant = territory?.dominantTeam;
          const borderColor = dominant ? TEAMS[dominant].color : "#333";

          return (
            <TouchableOpacity
              key={poster.id}
              style={[styles.posterCard, { borderColor }]}
              onPress={() =>
                router.push({
                  pathname: "/canvas/[posterId]",
                  params: { posterId: poster.id },
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.posterEmoji}>{poster.emoji}</Text>
              <View style={styles.posterInfo}>
                <Text style={styles.posterName}>{poster.name}</Text>
                <Text style={styles.posterId}>
                  {poster.id.replace("poster_", "#")}
                </Text>
              </View>
              <View style={styles.posterStatus}>
                {dominant ? (
                  <Text style={[styles.ownerText, { color: TEAMS[dominant].color }]}>
                    {TEAMS[dominant].name}
                  </Text>
                ) : (
                  <Text style={styles.unclaimedText}>NECUCERIT</Text>
                )}
                <Text style={styles.strokeCount}>
                  {territory?.totalStrokes || 0} pts
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    marginBottom: 24,
  },
  backText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 4,
  },
  scoreSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: "#555",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 10,
  },
  globalBar: {
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  posterList: {
    flex: 1,
  },
  posterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111118",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  posterEmoji: {
    fontSize: 28,
  },
  posterInfo: {
    flex: 1,
  },
  posterName: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  posterId: {
    color: "#555",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  posterStatus: {
    alignItems: "flex-end",
  },
  ownerText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  unclaimedText: {
    color: "#444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  strokeCount: {
    color: "#555",
    fontSize: 11,
    marginTop: 2,
  },
});

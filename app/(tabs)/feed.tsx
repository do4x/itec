import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import { db, ref, onValue, off } from "@/lib/firebase";
import { POSTER_NAMES } from "@/lib/poster-matcher";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActivityCard from "@/components/ActivityCard";
import Animated, { FadeInDown } from "react-native-reanimated";

type FilterType = "all" | "mine" | "rivals";

interface ActivityItem {
  id: string;
  username: string;
  teamId: TeamId;
  action: "draw" | "capture" | "anthem" | "territory";
  posterName: string;
  timestamp: number;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FeedScreen() {
  const { teamId } = useGame();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>("all");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const postersRef = ref(db, "posters");

    onValue(postersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const items: ActivityItem[] = [];

      for (const [posterId, posterData] of Object.entries(data) as [string, any][]) {
        const strokes = posterData?.strokes || {};
        for (const [strokeId, stroke] of Object.entries(strokes) as [string, any][]) {
          items.push({
            id: strokeId,
            username: stroke.username || "Unknown",
            teamId: (stroke.teamId || "red") as TeamId,
            action: "draw",
            posterName: POSTER_NAMES[posterId] || posterId,
            timestamp: stroke.timestamp || Date.now(),
          });
        }
      }

      items.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(items.slice(0, 50));
    });

    return () => off(postersRef);
  }, []);

  const filteredActivities = activities.filter((a) => {
    if (filter === "mine") return a.teamId === teamId;
    if (filter === "rivals") return a.teamId !== teamId;
    return true;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "ALL" },
    { key: "mine", label: "MY TEAM" },
    { key: "rivals", label: "RIVALS" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>ACTIVITY</Text>
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <ScrollView
        style={styles.feedList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.itecBlue}
          />
        }
      >
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐧</Text>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              Go scan some posters and start the war!
            </Text>
          </View>
        ) : (
          filteredActivities.map((activity, i) => (
            <ActivityCard
              key={activity.id}
              username={activity.username}
              teamId={activity.teamId}
              action={activity.action}
              posterName={activity.posterName}
              timestamp={timeAgo(activity.timestamp)}
              index={i}
            />
          ))
        )}
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
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    letterSpacing: 4,
    marginBottom: Spacing.lg,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    backgroundColor: Colors.navyMid,
  },
  filterPillActive: {
    backgroundColor: Colors.itecBlue + "26",
    borderColor: Colors.itecBlue,
  },
  filterText: {
    ...Typography.caption,
    color: Colors.softGray,
  },
  filterTextActive: {
    color: Colors.itecBright,
  },
  feedList: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.softGray,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: "center",
  },
});

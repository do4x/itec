import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radii, Shadows, Typography } from "@/constants/theme";
import { TEAMS, TeamId } from "@/lib/game-state";
import Animated, { FadeInUp } from "react-native-reanimated";

type ActionType = "draw" | "capture" | "anthem" | "territory";

const ACTION_ICONS: Record<ActionType, keyof typeof Ionicons.glyphMap> = {
  draw: "brush",
  capture: "flag",
  anthem: "musical-notes",
  territory: "trophy",
};

interface ActivityCardProps {
  username: string;
  teamId: TeamId;
  action: ActionType;
  posterName: string;
  timestamp: string;
  index?: number;
}

export default function ActivityCard({
  username,
  teamId,
  action,
  posterName,
  timestamp,
  index = 0,
}: ActivityCardProps) {
  const teamColor = TEAMS[teamId]?.color ?? Colors.muted;
  const iconName = ACTION_ICONS[action] ?? "ellipse";

  const actionText =
    action === "draw"
      ? `drew on ${posterName}`
      : action === "capture"
        ? `captured ${posterName}!`
        : action === "anthem"
          ? `set anthem on ${posterName}`
          : `won territory on ${posterName}`;

  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(index * 50)}
      style={[styles.card, { borderLeftColor: teamColor }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: teamColor + "20" }]}>
        <Ionicons name={iconName} size={18} color={teamColor} />
      </View>

      <View style={styles.content}>
        <Text style={styles.text}>
          <Text style={[styles.username, { color: teamColor }]}>{username}</Text>{" "}
          {actionText}
        </Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderLeftWidth: 4,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.soft,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  text: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.iceWhite,
  },
  username: {
    fontWeight: "700",
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.softGray,
  },
});

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radii, Shadows, Typography } from "@/constants/theme";
import { TEAMS, TeamId } from "@/lib/game-state";
import type { ActivityType } from "@/lib/notifications";
import Animated, { FadeInUp } from "react-native-reanimated";

const ACTION_ICONS: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  pixel: "grid-outline",
  pixel_override: "flash",
  graffiti: "color-fill",
  gif: "happy-outline",
  ai_poster: "sparkles",
  anthem: "musical-notes",
  territory_change: "trophy",
  gif_delete: "trash-outline",
  pixel_delete: "remove-circle-outline",
  anthem_override: "musical-notes",
  poster_complete: "trophy",
};

interface ActivityCardProps {
  username: string;
  teamId: TeamId;
  action: ActivityType;
  posterName: string;
  timestamp: string;
  index?: number;
  targetUsername?: string;
  targetTeamId?: TeamId;
  onPress?: () => void;
}

export default function ActivityCard({
  username,
  teamId,
  action,
  posterName,
  timestamp,
  index = 0,
  targetUsername,
  targetTeamId,
  onPress,
}: ActivityCardProps) {
  const teamColor = TEAMS[teamId]?.color ?? Colors.muted;
  const iconName = ACTION_ICONS[action] ?? "ellipse";

  const ACTION_TEXT: Record<ActivityType, string> = {
    pixel: `drew on ${posterName}`,
    pixel_override: targetUsername ? `overwrote ${targetUsername}'s pixel on ${posterName}` : `overwrote a pixel on ${posterName}`,
    graffiti: `stamped graffiti on ${posterName}`,
    gif: `placed a GIF on ${posterName}`,
    ai_poster: `generated AI art on ${posterName}`,
    anthem: `set anthem on ${posterName}`,
    territory_change: `shifted territory on ${posterName}`,
    gif_delete: targetUsername ? `deleted ${targetUsername}'s sticker on ${posterName}` : `deleted a sticker on ${posterName}`,
    pixel_delete: targetUsername ? `erased ${targetUsername}'s pixel on ${posterName}` : `erased a pixel on ${posterName}`,
    anthem_override: `replaced the rival anthem on ${posterName}`,
    poster_complete: `dominated ${posterName} completely!`,
  };
  const actionText = ACTION_TEXT[action] ?? `acted on ${posterName}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.75 : 1} disabled={!onPress}>
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
    </TouchableOpacity>
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

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, Radii, Shadows, Typography } from "@/constants/theme";
import { TEAMS, TeamId } from "@/lib/game-state";
import { TerritoryInfo } from "@/lib/territory";
import Animated, { FadeInUp } from "react-native-reanimated";

interface PosterCardProps {
  name: string;
  emoji: string;
  posterId: string;
  territory?: TerritoryInfo;
  onPress: () => void;
  index?: number;
}

export default function PosterCard({
  name,
  emoji,
  territory,
  onPress,
  index = 0,
}: PosterCardProps) {
  const dominant = territory?.dominantTeam;
  const accentColor = dominant ? TEAMS[dominant].color : Colors.navyLight;
  const totalPoints =
    Object.values(territory?.scores ?? {}).reduce((a, b) => a + (b ?? 0), 0) || 1;

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(index * 50)}>
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: accentColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{emoji}</Text>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          <View style={styles.territoryBar}>
            {territory &&
              (Object.entries(territory.scores) as [TeamId, number][]).map(
                ([team, score]) => (
                  <View
                    key={team}
                    style={{
                      flex: score / totalPoints,
                      height: 4,
                      backgroundColor: TEAMS[team]?.color ?? Colors.navyLight,
                      borderRadius: 2,
                    }}
                  />
                )
              )}
            {(!territory || territory.totalPixels === 0) && (
              <View style={styles.emptyBar} />
            )}
          </View>
        </View>

        <View style={styles.status}>
          {dominant ? (
            <Text style={[styles.ownerText, { color: TEAMS[dominant].color }]}>
              {TEAMS[dominant].name}
            </Text>
          ) : (
            <Text style={styles.unclaimedText}>UNCLAIMED</Text>
          )}
          <Text style={styles.points}>{territory?.totalPixels ?? 0} px</Text>
        </View>
      </TouchableOpacity>
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
  emoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: Spacing.sm,
  },
  name: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  territoryBar: {
    flexDirection: "row",
    borderRadius: 2,
    overflow: "hidden",
    gap: 2,
  },
  emptyBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.navyLight,
    borderRadius: 2,
  },
  status: {
    alignItems: "flex-end",
    gap: 2,
  },
  ownerText: {
    ...Typography.caption,
    fontWeight: "800",
  },
  unclaimedText: {
    ...Typography.caption,
    color: Colors.muted,
  },
  points: {
    fontSize: 11,
    color: Colors.softGray,
    fontWeight: "600",
  },
});

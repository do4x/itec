import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useGame, TEAMS, TeamId } from "@/lib/game-state";
import { Colors, Spacing, Radii, Shadows, Typography } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function HomeScreen() {
  const { username, setUsername, teamId, setTeamId, join } = useGame();
  const [inputValue, setInputValue] = useState(username);

  const handleJoin = () => {
    if (!inputValue.trim()) return;
    setUsername(inputValue.trim());
    join();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace("/(tabs)" as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <Text style={styles.preTitle}>iTEC 2026</Text>
        <Text style={styles.title}>OVERRIDE</Text>
        <Text style={styles.subtitle}>vandalism digital colaborativ</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.inputSection}>
        <Text style={styles.label}>TAG NAME</Text>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="scrie-ți tag-ul..."
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={16}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(350)} style={styles.teamSection}>
        <Text style={styles.label}>ECHIPA</Text>
        <View style={styles.teamGrid}>
          {(Object.keys(TEAMS) as TeamId[]).map((id) => {
            const team = TEAMS[id];
            const isSelected = teamId === id;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.teamCard,
                  { borderColor: isSelected ? team.color : Colors.navyLight },
                  isSelected && {
                    ...Shadows.glow(team.color),
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  setTeamId(id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.teamDot,
                    { backgroundColor: team.color },
                    isSelected && { transform: [{ scale: 1.3 }] },
                  ]}
                />
                <Text
                  style={[
                    styles.teamName,
                    { color: isSelected ? team.color : Colors.softGray },
                  ]}
                >
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(500)}>
        <TouchableOpacity
          style={[
            styles.joinButton,
            {
              backgroundColor: TEAMS[teamId].color,
              opacity: inputValue.trim() ? 1 : 0.3,
            },
          ]}
          onPress={handleJoin}
          disabled={!inputValue.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.joinText}>INTRA IN RAZBOI</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    paddingHorizontal: Spacing.xxl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.huge,
  },
  preTitle: {
    ...Typography.label,
    color: Colors.muted,
    fontSize: 14,
  },
  title: {
    ...Typography.hero,
    marginTop: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.softGray,
    marginTop: Spacing.sm,
  },
  inputSection: {
    marginBottom: Spacing.xxxl,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: Colors.navyMid,
  },
  teamSection: {
    marginBottom: 40,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  teamCard: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.navyMid,
  },
  teamDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  joinButton: {
    borderRadius: Radii.md,
    paddingVertical: 18,
    alignItems: "center",
  },
  joinText: {
    color: Colors.navyDeep,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
  },
});

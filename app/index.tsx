// app/index.tsx
// ============================================
// HOME — Join screen. Pick username + team, enter the war.
// ============================================

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
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const { username, setUsername, teamId, setTeamId } = useGame();
  const [inputValue, setInputValue] = useState(username);

  const handleJoin = () => {
    if (!inputValue.trim()) return;
    setUsername(inputValue.trim());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/scanner");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.preTitle}>iTEC 2026</Text>
        <Text style={styles.title}>OVERRIDE</Text>
        <Text style={styles.subtitle}>vandalism digital colaborativ</Text>
      </View>

      {/* Username Input */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>TAG NAME</Text>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="scrie-ți tag-ul..."
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={16}
        />
      </View>

      {/* Team Selection */}
      <View style={styles.teamSection}>
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
                  { borderColor: team.color },
                  isSelected && {
                    backgroundColor: team.glow,
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
                  style={[styles.teamDot, { backgroundColor: team.color }]}
                />
                <Text style={[styles.teamName, { color: team.color }]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Join Button */}
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
        <Text style={styles.joinText}>INTRĂ ÎN RĂZBOI</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  preTitle: {
    color: "#666",
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: "600",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: 8,
    marginTop: 4,
  },
  subtitle: {
    color: "#888",
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 8,
    textTransform: "uppercase",
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    color: "#666",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: "#111118",
  },
  teamSection: {
    marginBottom: 40,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  teamCard: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111118",
  },
  teamDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  joinButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  joinText: {
    color: "#0A0A0F",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
  },
});

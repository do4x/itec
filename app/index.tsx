import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { db, get, onValue, ref } from "@/lib/firebase";
import { TEAMS, TeamId, useGame } from "@/lib/game-state";
import { AVATARS, getAvatar } from "@/constants/avatars";
import { useTokens } from "@/lib/tokens";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Team emoji/icon mapping
const TEAM_ICONS: Record<TeamId, string> = {
  red: "🔥",
  blue: "👻",
  green: "⚡",
  yellow: "💡",
};

// Team taglines
const TEAM_TAGLINES: Record<TeamId, string> = {
  red: "PAINT IT RED",
  blue: "LEAVE NO TRACE",
  green: "BREAK THE GRID",
  yellow: "LIGHT IT UP",
};

// ─── Animated Team Card ───
function TeamCard({
  id,
  isSelected,
  onSelect,
  enterDelay,
}: {
  id: TeamId;
  isSelected: boolean;
  onSelect: () => void;
  enterDelay: number;
}) {
  const team = TEAMS[id];
  const scale = useSharedValue(1);
  const accentWidth = useSharedValue(isSelected ? 3 : 0);
  const bgOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    accentWidth.value = withSpring(isSelected ? 3 : 0, {
      damping: 15,
      stiffness: 200,
    });
    bgOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 250 });
    if (isSelected) {
      scale.value = withSequence(
        withTiming(1.025, { duration: 100 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
  }, [isSelected]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const accentAnimStyle = useAnimatedStyle(() => ({
    width: accentWidth.value,
    opacity: accentWidth.value > 0 ? 1 : 0,
  }));

  const bgAnimStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value * 0.065,
  }));

  return (
    <AnimatedTouchable
      entering={FadeInUp.duration(400).delay(enterDelay)}
      style={[styles.teamCard, cardAnimStyle]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Animated bg tint */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: team.color, borderRadius: Radii.lg },
          bgAnimStyle,
        ]}
      />

      {/* Animated side accent */}
      <Animated.View
        style={[
          styles.teamAccent,
          { backgroundColor: team.color, ...Shadows.glow(team.color) },
          accentAnimStyle,
        ]}
      />

      <View style={styles.teamCardContent}>
        <Text style={styles.teamIcon}>{TEAM_ICONS[id]}</Text>
        <View style={styles.teamTextCol}>
          <Text
            style={[
              styles.teamName,
              { color: isSelected ? team.color : Colors.softGray },
            ]}
          >
            {team.name}
          </Text>
          <Text
            style={[
              styles.teamTagline,
              { color: isSelected ? team.color + "80" : Colors.muted },
            ]}
          >
            {TEAM_TAGLINES[id]}
          </Text>
        </View>
      </View>

      {/* Animated radio */}
      <View
        style={[
          styles.radioOuter,
          { borderColor: isSelected ? team.color : Colors.navyLight },
        ]}
      >
        {isSelected && (
          <Animated.View
            entering={ZoomIn.duration(200).springify()}
            style={[styles.radioInner, { backgroundColor: team.color }]}
          />
        )}
      </View>
    </AnimatedTouchable>
  );
}

// ─── Glitch Title ───
function GlitchTitle() {
  const glitchOffset = useSharedValue(0);
  const glitchOpacity = useSharedValue(0);

  useEffect(() => {
    // Random glitch every 3-5 seconds
    const triggerGlitch = () => {
      glitchOffset.value = withSequence(
        withTiming(3, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(1, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );
      glitchOpacity.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 100 })
      );
    };

    triggerGlitch();
    const interval = setInterval(triggerGlitch, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchOffset.value }],
  }));

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: glitchOpacity.value * 0.4,
    transform: [{ translateX: -glitchOffset.value * 2 }],
  }));

  return (
    <View style={{ position: "relative" }}>
      {/* Cyan ghost layer */}
      <Animated.Text
        style={[
          styles.title,
          { position: "absolute", color: Colors.teamCyan },
          ghostStyle,
        ]}
      >
        OVERRIDE
      </Animated.Text>
      {/* Red ghost layer */}
      <Animated.Text
        style={[
          styles.title,
          {
            position: "absolute",
            color: Colors.teamRed,
            opacity: 0,
          },
          useAnimatedStyle(() => ({
            opacity: glitchOpacity.value * 0.3,
            transform: [{ translateX: glitchOffset.value * 1.5 }],
          })),
        ]}
      >
        OVERRIDE
      </Animated.Text>
      {/* Main text */}
      <Animated.Text style={[styles.title, mainStyle]}>
        OVERRIDE
      </Animated.Text>
    </View>
  );
}

// ─── Main Screen ───
export default function HomeScreen() {
  const {
    uid,
    username,
    setUsername,
    teamId,
    setTeamId,
    avatar,
    setAvatar,
    join,
    setIsJury,
    isJoined,
    isReady,
    isGuest,
  } = useGame();
  const { grant } = useTokens(uid);
  const [inputValue, setInputValue] = useState(username);
  const [showJuryInput, setShowJuryInput] = useState(false);
  const [juryCode, setJuryCode] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [nickStatus, setNickStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced nickname availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputValue.trim();
    if (trimmed.length < 2 || isGuest) { setNickStatus("idle"); return; }
    setNickStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const key = trimmed.toLowerCase();
      const snap = await get(ref(db, `usernames/${key}`));
      if (!snap.exists() || snap.val() === uid) {
        setNickStatus("available");
      } else {
        setNickStatus("taken");
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputValue, uid, isGuest]);

  // ── Animations ──
  const glowPulse = useSharedValue(0);
  const ctaPulse = useSharedValue(0);

  useEffect(() => {
    // Background orb breathing
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    // CTA button breathing
    ctaPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Auto-redirect if session restored
  useEffect(() => {
    if (isReady && isJoined) {
      router.replace({ pathname: "/(tabs)" });
    }
  }, [isReady, isJoined]);

  const selectedTeam = TEAMS[teamId];

  const handleJoin = async () => {
    if (!inputValue.trim() || nickStatus === "taken" || nickStatus === "checking") return;
    setUsername(inputValue.trim());
    const ok = await join();
    if (!ok) {
      setNickStatus("taken"); // race condition: cineva a revendicat nickname-ul între timp
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace({ pathname: "/(tabs)" });
  };

  const handleJuryCode = () => {
    if (!juryCode.trim()) return;
    const configRef = ref(db, "config/juryCode");
    onValue(
      configRef,
      (snap) => {
        const correctCode = snap.val();
        if (juryCode.trim() === correctCode) {
          setIsJury(true);
          grant(2000);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("JURY MODE", "2000 tokens granted. Welcome, judge.");
          setShowJuryInput(false);
          setJuryCode("");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Invalid code", "Try again.");
        }
      },
      { onlyOnce: true }
    );
  };

  const handleTeamSelect = useCallback(
    (id: TeamId) => {
      setTeamId(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setTeamId]
  );

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + glowPulse.value * 0.15,
    transform: [{ scale: 1 + glowPulse.value * 0.06 }],
  }));

  const canJoin = inputValue.trim().length > 0 && nickStatus !== "taken" && nickStatus !== "checking";

  const ctaAnimStyle = useAnimatedStyle(() => {
    if (!canJoin) return {};
    return {
      transform: [{ scale: 1 + ctaPulse.value * 0.015 }],
      shadowOpacity: interpolate(ctaPulse.value, [0, 1], [0.25, 0.5]),
      shadowRadius: interpolate(ctaPulse.value, [0, 1], [10, 20]),
    };
  });

  return (
    <View style={styles.container}>
      {/* Background glow orbs — team colored */}
      <Animated.View
        style={[
          styles.bgGlow,
          glowStyle,
          { backgroundColor: selectedTeam.color },
        ]}
      />
      <Animated.View
        style={[
          styles.bgGlowBottom,
          glowStyle,
          { backgroundColor: selectedTeam.color },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(700)}
            style={styles.header}
          >
            <Text style={styles.preTitle}>iTEC 2026</Text>
            <GlitchTitle />
            <View style={styles.subtitleRow}>
              <View
                style={[
                  styles.subtitleDot,
                  { backgroundColor: selectedTeam.color },
                ]}
              />
              <Text style={styles.subtitle}>vandalism digital colaborativ</Text>
              <View
                style={[
                  styles.subtitleDot,
                  { backgroundColor: selectedTeam.color },
                ]}
              />
            </View>
          </Animated.View>

          {/* Banner Guest */}
          {isGuest && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.guestBanner}>
              <Text style={styles.guestBannerText}>👁 MOD GUEST — acțiunile nu se salvează</Text>
            </Animated.View>
          )}

          {/* Glass Card */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={[
              styles.card,
              { borderColor: selectedTeam.color + "18" },
            ]}
          >
            {/* Nickname Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>NICKNAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  inputFocused && { borderColor: selectedTeam.color + "50" },
                  nickStatus === "taken" && { borderColor: Colors.error + "60" },
                  nickStatus === "available" && { borderColor: Colors.success + "60" },
                ]}
              >
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={styles.input}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="alege-ți nickname-ul..."
                  placeholderTextColor={Colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={16}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
                {/* Availability indicator */}
                {nickStatus === "checking" && (
                  <ActivityIndicator size="small" color={Colors.muted} style={{ marginLeft: 4 }} />
                )}
                {nickStatus === "available" && (
                  <Animated.View entering={ZoomIn.duration(200)} style={[styles.inputCheck, { backgroundColor: Colors.success + "25" }]}>
                    <Text style={{ fontSize: 10, color: Colors.success }}>✓</Text>
                  </Animated.View>
                )}
                {nickStatus === "taken" && (
                  <Animated.View entering={ZoomIn.duration(200)} style={[styles.inputCheck, { backgroundColor: Colors.error + "20" }]}>
                    <Text style={{ fontSize: 9, color: Colors.error }}>✗</Text>
                  </Animated.View>
                )}
              </View>
              {nickStatus === "taken" && (
                <Text style={styles.nickError}>Nickname-ul este deja folosit.</Text>
              )}
            </View>

            {/* Avatar Selection */}
            <View style={styles.avatarSection}>
              <Text style={styles.label}>AVATAR</Text>
              <View style={styles.avatarGrid}>
                {AVATARS.map((av) => {
                  const isSelected = avatar === av.id;
                  return (
                    <TouchableOpacity
                      key={av.id}
                      style={[
                        styles.avatarItem,
                        isSelected && { borderColor: av.color, backgroundColor: av.color + "22" },
                      ]}
                      onPress={() => setAvatar(av.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.avatarEmoji}>{av.emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Team Selection */}
            <View style={styles.teamSection}>
              <Text style={styles.label}>ECHIPA</Text>
              <View style={styles.teamGrid}>
                {(Object.keys(TEAMS) as TeamId[]).map((id, index) => (
                  <TeamCard
                    key={id}
                    id={id}
                    isSelected={teamId === id}
                    onSelect={() => handleTeamSelect(id)}
                    enterDelay={300 + index * 80}
                  />
                ))}
              </View>
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(700)}
            style={styles.ctaSection}
          >
            <AnimatedTouchable
              style={[
                styles.joinButton,
                {
                  backgroundColor: canJoin
                    ? selectedTeam.color
                    : Colors.navyLight,
                  shadowColor: selectedTeam.color,
                  ...(canJoin ? Shadows.glow(selectedTeam.color) : {}),
                },
                ctaAnimStyle,
              ]}
              onPress={handleJoin}
              disabled={!canJoin}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.joinText,
                  { color: canJoin ? Colors.navyDeep : Colors.muted },
                ]}
              >
                INTRĀ ĪN RĀZBOI
              </Text>
              {canJoin && <Text style={styles.joinArrow}>→</Text>}
            </AnimatedTouchable>

            {/* Jury */}
            {showJuryInput ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.juryRow}
              >
                <TextInput
                  style={styles.juryInput}
                  value={juryCode}
                  onChangeText={setJuryCode}
                  placeholder="cod juriu..."
                  placeholderTextColor={Colors.muted}
                  autoCapitalize="characters"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.jurySubmit}
                  onPress={handleJuryCode}
                >
                  <Text style={styles.jurySubmitText}>OK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.juryCancelBtn}
                  onPress={() => {
                    setShowJuryInput(false);
                    setJuryCode("");
                  }}
                >
                  <Text style={styles.juryCancelText}>✕</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={styles.juryButton}
                onPress={() => setShowJuryInput(true)}
              >
                <Text style={styles.juryButtonText}>⚖ JURY</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.huge,
  },

  // Background glows
  bgGlow: {
    position: "absolute",
    top: -SCREEN_H * 0.12,
    alignSelf: "center",
    left: SCREEN_W * 0.1,
    width: SCREEN_W * 0.8,
    height: SCREEN_W * 0.8,
    borderRadius: SCREEN_W * 0.4,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: -SCREEN_H * 0.08,
    right: SCREEN_W * 0.15,
    width: SCREEN_W * 0.5,
    height: SCREEN_W * 0.5,
    borderRadius: SCREEN_W * 0.25,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxxl,
  },
  preTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 6,
    textTransform: "uppercase",
    color: Colors.muted,
  },
  title: {
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: 8,
    textTransform: "uppercase",
    color: Colors.white,
    marginTop: 2,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Spacing.sm,
  },
  subtitleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.softGray,
  },

  // Glass Card
  card: {
    backgroundColor: Colors.navyMid + "BB",
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
  },

  // Input
  inputSection: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 4,
    textTransform: "uppercase",
    color: Colors.softGray,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    backgroundColor: Colors.navyDeep + "90",
    paddingHorizontal: Spacing.lg,
    gap: 4,
  },
  inputPrefix: {
    color: Colors.muted,
    fontSize: 18,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  inputCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  nickError: {
    color: Colors.error,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 6,
  },

  // Guest banner
  guestBanner: {
    backgroundColor: Colors.navyMid,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  guestBannerText: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },

  // Avatar
  avatarSection: {
    marginBottom: Spacing.xl,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  avatarItem: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navyDeep + "80",
  },
  avatarEmoji: {
    fontSize: 26,
  },

  // Teams
  teamSection: {
    gap: Spacing.sm,
  },
  teamGrid: {
    gap: Spacing.sm,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.navyLight + "40",
    borderRadius: Radii.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.navyDeep + "50",
    overflow: "hidden",
  },
  teamAccent: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  teamCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  teamIcon: {
    fontSize: 20,
  },
  teamTextCol: {
    gap: 1,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  teamTagline: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // CTA
  ctaSection: {
    gap: Spacing.md,
  },
  joinButton: {
    borderRadius: Radii.lg,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  joinText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 4,
  },
  joinArrow: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.navyDeep,
  },

  // Jury
  juryButton: {
    alignSelf: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.navyLight + "50",
  },
  juryButtonText: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
  },
  juryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  juryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.white,
    fontSize: 14,
    backgroundColor: Colors.navyDeep + "90",
  },
  jurySubmit: {
    backgroundColor: Colors.teamYellow,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    justifyContent: "center",
  },
  jurySubmitText: {
    color: Colors.navyDeep,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 2,
  },
  juryCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
  },
  juryCancelText: {
    color: Colors.muted,
    fontSize: 16,
    fontWeight: "700",
  },
});
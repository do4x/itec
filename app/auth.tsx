import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import Animated, {
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, Radii } from "@/constants/theme";

const { width: SW, height: SH } = Dimensions.get("window");
const CARD_W = SW - 48;
const CARD_H = 420; // estimate for beam sizing

function translateFirebaseError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":   return "Adresa de email este deja folosită.";
    case "auth/invalid-email":          return "Adresa de email este invalidă.";
    case "auth/weak-password":          return "Parola trebuie să aibă cel puțin 6 caractere.";
    case "auth/user-not-found":         return "Nu există un cont cu această adresă de email.";
    case "auth/wrong-password":         return "Parola introdusă este incorectă.";
    case "auth/invalid-credential":     return "Email sau parolă incorectă.";
    case "auth/too-many-requests":      return "Prea multe încercări. Încearcă din nou mai târziu.";
    case "auth/network-request-failed": return "Eroare de rețea. Verifică conexiunea.";
    default:                            return "A apărut o eroare. Încearcă din nou.";
  }
}

// ── Glitch title ─────────────────────────────────────────────────────────────
function GlitchTitle() {
  const glitchX = useSharedValue(0);
  const glitchOp = useSharedValue(0);

  useEffect(() => {
    const trigger = () => {
      glitchX.value = withSequence(
        withTiming(3, { duration: 50 }), withTiming(-2, { duration: 50 }),
        withTiming(1, { duration: 40 }), withTiming(0, { duration: 40 })
      );
      glitchOp.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 100 }));
    };
    trigger();
    const id = setInterval(trigger, 4000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  const mainStyle  = useAnimatedStyle(() => ({ transform: [{ translateX: glitchX.value }] }));
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: glitchOp.value * 0.4,
    transform: [{ translateX: -glitchX.value * 2 }],
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.Text style={[s.titleText, { position: "absolute", color: Colors.teamCyan }, ghostStyle]}>
        OVERRIDE
      </Animated.Text>
      <Animated.Text style={[s.titleText, mainStyle]}>OVERRIDE</Animated.Text>
    </View>
  );
}

// ── Traveling light beams ─────────────────────────────────────────────────────
function CardBeams() {
  const BEAM_LEN_H = CARD_W * 0.45;
  const BEAM_LEN_V = CARD_H * 0.45;
  const DURATION = 2400;
  const DELAY = DURATION / 4;

  const top    = useSharedValue(-BEAM_LEN_H);
  const right  = useSharedValue(-BEAM_LEN_V);
  const bottom = useSharedValue(CARD_W);
  const left   = useSharedValue(CARD_H);

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    top.value    = withRepeat(withTiming(CARD_W,        { duration: DURATION, easing: ease }), -1, false);
    right.value  = withRepeat(withTiming(CARD_H,        { duration: DURATION, easing: ease }), -1, false);
    bottom.value = withRepeat(withTiming(-BEAM_LEN_H,  { duration: DURATION, easing: ease }), -1, false);
    left.value   = withRepeat(withTiming(-BEAM_LEN_V,  { duration: DURATION, easing: ease }), -1, false);
  }, []);

  const topStyle    = useAnimatedStyle(() => ({ transform: [{ translateX: top.value }] }));
  const rightStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: right.value }] }));
  const bottomStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bottom.value }] }));
  const leftStyle   = useAnimatedStyle(() => ({ transform: [{ translateY: left.value }] }));

  const BEAM_COLOR = Colors.itecBright + "BB";

  return (
    <>
      {/* Top */}
      <Animated.View style={[s.beamTop, { width: BEAM_LEN_H }, topStyle,
        { shadowColor: Colors.itecBright, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]}
        pointerEvents="none"
      >
        <View style={{ flex: 1, backgroundColor: BEAM_COLOR, borderRadius: 2 }} />
      </Animated.View>
      {/* Right */}
      <Animated.View style={[s.beamRight, { height: BEAM_LEN_V }, rightStyle,
        { shadowColor: Colors.itecBright, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]}
        pointerEvents="none"
      >
        <View style={{ flex: 1, backgroundColor: BEAM_COLOR, borderRadius: 2 }} />
      </Animated.View>
      {/* Bottom */}
      <Animated.View style={[s.beamBottom, { width: BEAM_LEN_H }, bottomStyle,
        { shadowColor: Colors.itecBright, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]}
        pointerEvents="none"
      >
        <View style={{ flex: 1, backgroundColor: BEAM_COLOR, borderRadius: 2 }} />
      </Animated.View>
      {/* Left */}
      <Animated.View style={[s.beamLeft, { height: BEAM_LEN_V }, leftStyle,
        { shadowColor: Colors.itecBright, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]}
        pointerEvents="none"
      >
        <View style={{ flex: 1, backgroundColor: BEAM_COLOR, borderRadius: 2 }} />
      </Animated.View>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { isReady, isAuthenticated, isGuest, loginWithEmail, registerWithEmail, loginAsGuest } = useAuth();

  const [mode, setMode]         = useState<"login" | "register">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Background glow breathing
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2800 }), withTiming(0, { duration: 2800 })),
      -1, true
    );
  }, []);
  const glowTopStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.14,
    transform: [{ scale: 0.98 + glow.value * 0.04 }],
  }));
  const glowBotStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + glow.value * 0.16,
    transform: [{ scale: 1 + glow.value * 0.05 }],
  }));

  // Redirect dacă e deja autentificat
  useEffect(() => {
    if (isReady && (isAuthenticated || isGuest)) {
      router.replace("/");
    }
  }, [isReady, isAuthenticated, isGuest]);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) { setError("Completează toate câmpurile."); return; }
    if (mode === "register" && password !== confirm) { setError("Parolele nu coincid."); return; }
    setLoading(true);
    try {
      mode === "login"
        ? await loginWithEmail(email.trim(), password)
        : await registerWithEmail(email.trim(), password);
      router.replace("/");
    } catch (e: any) {
      setError(translateFirebaseError(e?.code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
      router.replace("/");
    } catch {
      setError("Nu s-a putut conecta ca guest. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Background glows */}
      <Animated.View style={[s.bgTop, glowTopStyle]} />
      <Animated.View style={[s.bgBot, glowBotStyle]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={s.header}>
            <Text style={s.preTitle}>iTEC 2026</Text>
            <GlitchTitle />
            <Text style={s.subtitle}>vandalism digital colaborativ</Text>
          </Animated.View>

          {/* Glass Card */}
          <Animated.View entering={FadeInUp.duration(500).delay(150)} style={s.card}>
            {/* Traveling light beams */}
            <CardBeams />

            {/* Logo circle */}
            <View style={s.logoRow}>
              <View style={s.logoCircle}>
                <Text style={s.logoText}>i</Text>
              </View>
            </View>

            {/* Toggle */}
            <View style={s.toggle}>
              {(["login", "register"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.toggleBtn, mode === m && s.toggleActive]}
                  onPress={() => { setMode(m); setError(null); }}
                >
                  <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>
                    {m === "login" ? "LOGIN" : "CONT NOU"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Email */}
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="Email address"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Parolă */}
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                placeholder="Password"
                placeholderTextColor={Colors.muted}
                secureTextEntry={!showPw}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPw ? "eye-outline" : "eye-off-outline"} size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Confirmare (register) */}
            {mode === "register" && (
              <Animated.View entering={FadeInDown.duration(250)} style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.muted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); setError(null); }}
                  placeholder="Confirmă parola"
                  placeholderTextColor={Colors.muted}
                  secureTextEntry
                  editable={!loading}
                />
              </Animated.View>
            )}

            {/* Eroare */}
            {error && <Text style={s.errorText}>{error}</Text>}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.navyDeep} />
                : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.submitText}>{mode === "login" ? "Sign In" : "Creează Cont"}</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.navyDeep} />
                  </View>
                )
              }
            </TouchableOpacity>

            {/* Divider + Guest */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>sau</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity style={s.guestBtn} onPress={handleGuest} disabled={loading} activeOpacity={0.8}>
              <Text style={s.guestText}>👁  Continuă ca Guest</Text>
            </TouchableOpacity>

            {/* Sign up link */}
            {mode === "login" && (
              <TouchableOpacity onPress={() => { setMode("register"); setError(null); }} style={s.switchRow}>
                <Text style={s.switchText}>
                  Nu ai cont?{"  "}
                  <Text style={s.switchLink}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navyDeep },

  // Background glows
  bgTop: {
    position: "absolute", top: -SH * 0.1, alignSelf: "center",
    width: SW * 1.1, height: SH * 0.55, borderRadius: SW * 0.55,
    backgroundColor: Colors.itecBright,
  },
  bgBot: {
    position: "absolute", bottom: -SH * 0.08, alignSelf: "center",
    width: SW * 0.9, height: SH * 0.45, borderRadius: SW * 0.45,
    backgroundColor: Colors.teamCyan,
  },

  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },

  // Header
  header: { alignItems: "center", marginBottom: 28 },
  preTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 6, color: Colors.muted, marginBottom: 4 },
  titleText: { fontSize: 48, fontWeight: "900", letterSpacing: 8, color: Colors.white },
  subtitle: { fontSize: 10, fontWeight: "600", letterSpacing: 3, color: Colors.softGray, marginTop: 6, textTransform: "uppercase" },

  // Glass card
  card: {
    width: CARD_W,
    backgroundColor: Colors.navyDeep + "B0",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.navyLight + "80",
    padding: 24,
    overflow: "hidden",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },

  // Beams (absolute, clipped by card overflow:hidden)
  beamTop:    { position: "absolute", top: 0,    left: 0, height: 2 },
  beamRight:  { position: "absolute", top: 0,    right: 0, width: 2 },
  beamBottom: { position: "absolute", bottom: 0, left: 0, height: 2 },
  beamLeft:   { position: "absolute", top: 0,    left: 0, width: 2 },

  // Logo circle
  logoRow: { alignItems: "center", marginBottom: 14 },
  logoCircle: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.navyLight,
    backgroundColor: Colors.navyMid,
    alignItems: "center", justifyContent: "center",
  },
  logoText: { color: Colors.itecBright, fontSize: 18, fontWeight: "900", letterSpacing: 1 },

  // Toggle
  toggle: {
    flexDirection: "row", marginBottom: 20,
    borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.navyLight + "60",
    overflow: "hidden",
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  toggleActive: { backgroundColor: Colors.itecBlue + "CC" },
  toggleText: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: Colors.muted },
  toggleTextActive: { color: Colors.white },

  // Inputs
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.navyMid + "60",
    borderWidth: 1, borderColor: Colors.navyLight + "60",
    borderRadius: Radii.md, marginBottom: 12, height: 44,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, color: Colors.white, fontSize: 14,
    height: "100%",
  },
  eyeBtn: { paddingLeft: 8 },

  errorText: { color: Colors.error, fontSize: 11, letterSpacing: 0.5, marginBottom: 12, textAlign: "center" },

  // Submit
  submitBtn: {
    backgroundColor: Colors.itecBright,
    borderRadius: Radii.md, height: 44,
    alignItems: "center", justifyContent: "center",
    marginTop: 4,
    shadowColor: Colors.itecBright, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  submitText: { color: Colors.navyDeep, fontWeight: "800", fontSize: 14, letterSpacing: 1 },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.navyLight + "40" },
  dividerText: { color: Colors.muted, fontSize: 11, marginHorizontal: 12 },

  // Guest
  guestBtn: {
    backgroundColor: Colors.navyMid + "60",
    borderWidth: 1, borderColor: Colors.navyLight + "60",
    borderRadius: Radii.md, height: 44,
    alignItems: "center", justifyContent: "center",
  },
  guestText: { color: Colors.softGray, fontSize: 13, fontWeight: "600", letterSpacing: 1 },

  // Switch mode link
  switchRow: { alignItems: "center", marginTop: 16 },
  switchText: { color: Colors.muted, fontSize: 12 },
  switchLink: { color: Colors.itecBright, fontWeight: "700" },
});

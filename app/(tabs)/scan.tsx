import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useGame, TEAMS } from "@/lib/game-state";
import { matchPoster, POSTER_NAMES } from "@/lib/poster-matcher";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
} from "react-native-reanimated";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isMatching, setIsMatching] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { teamId } = useGame();
  const teamColor = TEAMS[teamId].color;
  const insets = useSafeAreaInsets();
  const captureScale = useSharedValue(1);

  const captureAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const handleCapture = async () => {
    if (!cameraRef.current || isMatching) return;

    captureScale.value = withSequence(
      withSpring(0.88, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );

    setIsMatching(true);
    setLastResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Vibration.vibrate(40);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        imageType: "jpg",
        shutterSound: false,
      });

      if (!photo?.base64) {
        Alert.alert("Error", "Could not capture photo.");
        setIsMatching(false);
        return;
      }

      if (!process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) {
        Alert.alert(
          "Missing API Key",
          "Set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file"
        );
        setIsMatching(false);
        return;
      }

      const result = await matchPoster(photo.base64, "image/jpeg");

      if (result.posterId !== "unknown") {
        Vibration.vibrate([0, 80, 50, 160]);
        setLastResult(`${POSTER_NAMES[result.posterId] || result.posterId}`);
        setTimeout(() => {
          router.push({
            pathname: "/canvas/[posterId]",
            params: { posterId: result.posterId, photoUri: photo.uri },
          });
          setIsMatching(false);
          setLastResult(null);
        }, 800);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastResult("Poster not recognized. Try again.");
        setIsMatching(false);
      }
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Error", "Check your internet connection.");
      setIsMatching(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.itecBlue} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color={Colors.softGray} />
        <Text style={styles.permMessage}>
          Camera access is needed{"\n"}to scan posters
        </Text>
        <TouchableOpacity
          style={[styles.permButton, { backgroundColor: Colors.itecBlue }]}
          onPress={requestPermission}
        >
          <Text style={styles.permButtonText}>ALLOW CAMERA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.lg }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
          <Text style={styles.topTitle}>SCAN POSTER</Text>
          <View style={[styles.teamPill, { borderColor: teamColor }]}>
            <View style={[styles.pillDot, { backgroundColor: teamColor }]} />
            <Text style={[styles.pillText, { color: teamColor }]}>
              {TEAMS[teamId].name}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.tl, { borderColor: teamColor }]} />
          <View style={[styles.corner, styles.tr, { borderColor: teamColor }]} />
          <View style={[styles.corner, styles.bl, { borderColor: teamColor }]} />
          <View style={[styles.corner, styles.br, { borderColor: teamColor }]} />
        </View>

        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 100 }]}>
          {lastResult && (
            <View
              style={[
                styles.resultBadge,
                {
                  borderColor: lastResult.includes("not recognized")
                    ? Colors.error
                    : teamColor,
                },
              ]}
            >
              <Ionicons
                name={
                  lastResult.includes("not recognized")
                    ? "close-circle"
                    : "checkmark-circle"
                }
                size={18}
                color={
                  lastResult.includes("not recognized") ? Colors.error : Colors.success
                }
              />
              <Text style={styles.resultText}>{lastResult}</Text>
            </View>
          )}

          {!isMatching && !lastResult && (
            <Text style={styles.hint}>
              Point camera at a poster{"\n"}and tap the button
            </Text>
          )}

          <Animated.View style={captureAnimStyle}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                { borderColor: teamColor },
                isMatching && { opacity: 0.5 },
              ]}
              onPress={handleCapture}
              disabled={isMatching}
              activeOpacity={0.7}
            >
              {isMatching ? (
                <ActivityIndicator size="large" color={teamColor} />
              ) : (
                <View style={[styles.captureInner, { backgroundColor: teamColor }]} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {isMatching && (
            <Text style={styles.matchingText}>Identifying poster...</Text>
          )}

          <View style={styles.devSection}>
            <Text style={styles.devLabel}>DEV — TEST WITHOUT CAMERA:</Text>
            <View style={styles.devButtons}>
              {["afis4", "afis7", "afis9"].map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.devButton, { borderColor: teamColor }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: "/canvas/[posterId]",
                      params: { posterId: id },
                    });
                  }}
                >
                  <Text style={[styles.devButtonText, { color: teamColor }]}>
                    {POSTER_NAMES[id]?.substring(0, 12) || id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },
  permMessage: {
    ...Typography.body,
    textAlign: "center",
    color: Colors.softGray,
  },
  permButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    borderRadius: Radii.md,
  },
  permButtonText: {
    color: Colors.white,
    fontWeight: "800",
    letterSpacing: 2,
    fontSize: 13,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: Spacing.xxl,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topTitle: {
    ...Typography.h3,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  teamPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  scanArea: {
    width: 280,
    height: 360,
    alignSelf: "center",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderRadius: 4,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  bottomSection: {
    alignItems: "center",
    gap: Spacing.md,
  },
  hint: {
    ...Typography.body,
    color: Colors.iceWhite,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  resultText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  matchingText: {
    ...Typography.caption,
    color: Colors.softGray,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  devSection: {
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  devLabel: {
    ...Typography.caption,
    fontSize: 9,
    color: Colors.muted,
  },
  devButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  devButton: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  devButtonText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
});

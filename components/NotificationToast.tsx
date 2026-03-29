import React, { useEffect } from "react";
import { Text, StyleSheet, View, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Colors, Spacing, Radii } from "@/constants/theme";

interface NotificationToastProps {
  message: string;
  type: "info" | "warning" | "success";
  visible: boolean;
  onHide: () => void;
  glitch?: boolean;
  onPress?: () => void;
}

export default function NotificationToast({ message, type, visible, onHide, glitch = false, onPress }: NotificationToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const glitchX = useSharedValue(0);
  const glitchOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      if (glitch) {
        // Shake animation
        glitchX.value = withSequence(
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(-3, { duration: 50 }),
          withTiming(3, { duration: 50 }),
          withTiming(-2, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        // Ghost layers flash
        glitchOpacity.value = withSequence(
          withTiming(1, { duration: 60 }),
          withTiming(0, { duration: 120 }),
          withTiming(0.7, { duration: 60 }),
          withTiming(0, { duration: 120 })
        );
      }

      const timer = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 300 });
        opacity.value = withSequence(
          withTiming(0, { duration: 300 }),
          withTiming(0, { duration: 0 }, () => runOnJS(onHide)())
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: glitchX.value }],
    opacity: opacity.value,
  }));

  const cyanGhostStyle = useAnimatedStyle(() => ({
    opacity: glitchOpacity.value * 0.6,
    transform: [{ translateX: -glitchX.value * 2 }],
  }));

  const redGhostStyle = useAnimatedStyle(() => ({
    opacity: glitchOpacity.value * 0.5,
    transform: [{ translateX: glitchX.value * 1.5 }],
  }));

  const bgColor = type === "warning" ? Colors.error + "DD" : type === "success" ? Colors.success + "DD" : Colors.itecBlue + "DD";

  if (!visible && !message) return null;

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bgColor }, animatedStyle]}>
      {glitch && (
        <>
          <Animated.Text style={[styles.text, styles.ghostCyan, cyanGhostStyle]}>{message}</Animated.Text>
          <Animated.Text style={[styles.text, styles.ghostRed, redGhostStyle]}>{message}</Animated.Text>
        </>
      )}
      <Text style={styles.text}>{message}</Text>
      {onPress && (
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} activeOpacity={0.85} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    zIndex: 9999,
  },
  text: { color: Colors.white, fontWeight: "700", fontSize: 13, textAlign: "center", letterSpacing: 1 },
  ghostCyan: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    color: Colors.teamCyan,
  },
  ghostRed: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    color: Colors.teamRed,
  },
});

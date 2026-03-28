import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS } from "react-native-reanimated";
import { Colors, Spacing, Radii } from "@/constants/theme";

interface NotificationToastProps {
  message: string;
  type: "info" | "warning" | "success";
  visible: boolean;
  onHide: () => void;
}

export default function NotificationToast({ message, type, visible, onHide }: NotificationToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      // Auto-hide after 3 seconds
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
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bgColor = type === "warning" ? Colors.error + "DD" : type === "success" ? Colors.success + "DD" : Colors.itecBlue + "DD";

  if (!visible && !message) return null;

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bgColor }, animatedStyle]}>
      <Text style={styles.text}>{message}</Text>
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
});

import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Colors, Radii, Spacing, Shadows } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; iconFilled: keyof typeof Ionicons.glyphMap; label: string }
> = {
  index: { icon: "map-outline", iconFilled: "map", label: "MAP" },
  scan: { icon: "scan-outline", iconFilled: "scan", label: "SCAN" },
  feed: { icon: "flash-outline", iconFilled: "flash", label: "FEED" },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, { damping: 18, stiffness: 200 });
  }, [state.index]);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name] ?? {
            icon: "ellipse-outline" as const,
            iconFilled: "ellipse" as const,
            label: route.name.toUpperCase(),
          };
          const isFocused = state.index === index;
          const isScan = route.name === "scan";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          if (isScan) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.scanWrapper}
              >
                <View style={[styles.scanButton, isFocused && styles.scanButtonActive]}>
                  <Ionicons
                    name={isFocused ? config.iconFilled : config.icon}
                    size={28}
                    color={isFocused ? Colors.white : Colors.softGray}
                  />
                </View>
                <Text style={[styles.label, isFocused && styles.labelActive]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tab}
            >
              <AnimatedTab
                isFocused={isFocused}
                icon={isFocused ? config.iconFilled : config.icon}
                label={config.label}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedTab({
  isFocused,
  icon,
  label,
}: {
  isFocused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const bgOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(45, 125, 210, ${bgOpacity.value * 0.15})`,
  }));

  return (
    <Animated.View style={[styles.pill, pillStyle]}>
      <Ionicons
        name={icon}
        size={22}
        color={isFocused ? Colors.itecBright : Colors.softGray}
      />
      <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  container: {
    flexDirection: "row",
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    ...Shadows.card,
  },
  tab: {
    flex: 1,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
  },
  scanWrapper: {
    alignItems: "center",
    marginTop: -28,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navyMid,
    borderWidth: 2,
    borderColor: Colors.navyLight,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.card,
  },
  scanButtonActive: {
    backgroundColor: Colors.itecBlue,
    borderColor: Colors.itecBright,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.softGray,
    textTransform: "uppercase",
    marginTop: 2,
  },
  labelActive: {
    color: Colors.itecBright,
  },
});

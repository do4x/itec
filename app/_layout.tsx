import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { GameProvider } from "@/lib/game-state";
import { Colors } from "@/constants/theme";
import { ErrorBoundary } from "expo-router";

// #region agent log
console.error('[DBG b64100] _layout.tsx MODULE LOADED');
// #endregion

export { ErrorBoundary };

export default function RootLayout() {
// #region agent log
console.error('[DBG b64100] RootLayout RENDER');
// #endregion
  try {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.navyDeep },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen
            name="canvas/[posterId]"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen name="calibrate" />
          <Stack.Screen name="gps-test" />
        </Stack>
        <StatusBar style="light" />
      </GameProvider>
    </GestureHandlerRootView>
  );
  } catch (e: any) {
// #region agent log
    console.error('[DBG b64100] RootLayout CRASH:', e?.message, e?.stack);
// #endregion
    throw e;
  }
}

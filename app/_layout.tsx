import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { GameProvider, useGame } from "@/lib/game-state";
import { NotificationProvider, useNotificationToast } from "@/lib/notification-context";
import NotificationToast from "@/components/NotificationToast";
import { Colors } from "@/constants/theme";
import { ErrorBoundary } from "expo-router";

export { ErrorBoundary };

function GlobalToast() {
  const { toast, toastVisible, hideToast } = useNotificationToast();
  return (
    <NotificationToast
      message={toast?.message ?? ""}
      type={toast?.type ?? "info"}
      visible={toastVisible}
      onHide={hideToast}
      glitch={toast?.glitch ?? false}
    />
  );
}

// Redirecționează utilizatorii neautentificați la ecranul de login
function AuthGuard() {
  const { isReady, isAuthenticated, isGuest } = useGame();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated && !isGuest) {
      router.replace("/auth" as any);
    }
  }, [isReady, isAuthenticated, isGuest]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameProvider>
        <NotificationProvider>
          <AuthGuard />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.navyDeep },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="auth" options={{ animation: "fade" }} />
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen
              name="canvas/[posterId]"
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="calibrate" />
            <Stack.Screen name="gps-test" />
          </Stack>
          <GlobalToast />
          <StatusBar style="light" />
        </NotificationProvider>
      </GameProvider>
    </GestureHandlerRootView>
  );
}

// app/scanner.tsx
import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useGame, TEAMS } from "@/lib/game-state";
import { matchPoster, POSTER_NAMES } from "@/lib/poster-matcher";
import * as Haptics from "expo-haptics";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isMatching, setIsMatching] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { teamId } = useGame();
  const teamColor = TEAMS[teamId].color;

  const handleCapture = async () => {
    if (!cameraRef.current || isMatching) return;

    setIsMatching(true);
    setLastResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        imageType: "jpg",
      });

      if (!photo?.base64) {
        Alert.alert("Eroare", "Nu am putut captura fotografia.");
        setIsMatching(false);
        return;
      }

      if (!process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) {
        Alert.alert(
          "API Key Lipsă",
          "Configurează EXPO_PUBLIC_ANTHROPIC_API_KEY în fișierul .env"
        );
        setIsMatching(false);
        return;
      }

      const result = await matchPoster(photo.base64, "image/jpeg");

      if (result.posterId !== "unknown") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLastResult(
          `${POSTER_NAMES[result.posterId] || result.posterId}`
        );
        setTimeout(() => {
          router.push({
            pathname: "/canvas/[posterId]",
            params: { posterId: result.posterId },
          });
          setIsMatching(false);
          setLastResult(null);
        }, 800);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastResult("Afiș nerecunoscut. Încearcă din nou.");
        setIsMatching(false);
      }
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Eroare", "Verifică conexiunea la internet.");
      setIsMatching(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Se încarcă...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Avem nevoie de acces la cameră{"\n"}pentru a scana afișele
        </Text>
        <TouchableOpacity
          style={[styles.permButton, { backgroundColor: teamColor }]}
          onPress={requestPermission}
        >
          <Text style={styles.permButtonText}>PERMITE CAMERA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← ÎNAPOI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/map")}>
            <Text style={[styles.mapLink, { color: teamColor }]}>
              HARTĂ →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft, { borderColor: teamColor }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: teamColor }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: teamColor }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: teamColor }]} />
        </View>

        <View style={styles.bottomSection}>
          {lastResult && (
            <View style={[styles.resultBadge, {
              borderColor: lastResult.includes("nerecunoscut") ? "#FF2E63" : teamColor,
            }]}>
              <Text style={styles.resultText}>
                {lastResult.includes("nerecunoscut") ? "❌" : "✅"} {lastResult}
              </Text>
            </View>
          )}

          {!isMatching && !lastResult && (
            <Text style={styles.hint}>
              Îndreaptă camera spre un afiș{"\n"}și apasă butonul
            </Text>
          )}

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

          {isMatching && (
            <Text style={styles.matchingText}>Se identifică afișul...</Text>
          )}

          <View style={styles.devSection}>
            <Text style={styles.devLabel}>DEV — TEST FĂRĂ CAMERĂ:</Text>
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

const CORNER_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    color: "#AAA",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  permButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permButtonText: {
    color: "#0A0A0F",
    fontWeight: "800",
    letterSpacing: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mapLink: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  bottomSection: {
    alignItems: "center",
    gap: 12,
  },
  hint: {
    color: "#CCC",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  resultBadge: {
    backgroundColor: "#000000CC",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000044",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  matchingText: {
    color: "#AAA",
    fontSize: 12,
    letterSpacing: 1,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  devSection: {
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  devLabel: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
  },
  devButtons: {
    flexDirection: "row",
    gap: 6,
  },
  devButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#00000088",
  },
  devButtonText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
});

import { Colors, Radii, Spacing } from "@/constants/theme";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Reading {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  timestamp: number;
}

export default function GpsTestScreen() {
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [tracking, setTracking] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    setReadings([]);
    setTracking(true);

    subRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 500,
        distanceInterval: 0,
      },
      (loc) => {
        const r: Reading = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? -1,
          altitude: loc.coords.altitude,
          timestamp: Date.now(),
        };
        setReadings((prev) => [r, ...prev].slice(0, 100));
      }
    );
  };

  const stopTracking = () => {
    subRef.current?.remove();
    subRef.current = null;
    setTracking(false);
  };

  useEffect(() => {
    return () => {
      subRef.current?.remove();
    };
  }, []);

  // Stats
  const accuracies = readings.map((r) => r.accuracy).filter((a) => a > 0);
  const avgAccuracy =
    accuracies.length > 0
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : 0;
  const bestAccuracy = accuracies.length > 0 ? Math.min(...accuracies) : 0;
  const worstAccuracy = accuracies.length > 0 ? Math.max(...accuracies) : 0;

  const getAccuracyColor = (acc: number) => {
    if (acc <= 3) return Colors.teamGreen;
    if (acc <= 8) return Colors.teamYellow;
    if (acc <= 15) return Colors.warning;
    return Colors.teamRed;
  };

  const latest = readings[0];

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}
    >
      <Text style={styles.title}>GPS PRECISION TEST</Text>
      <Text style={styles.subtitle}>
        Stand still indoors for 30s, then walk 10m
      </Text>

      {/* Big accuracy display */}
      <View style={styles.bigStat}>
        <Text style={styles.bigLabel}>CURRENT ACCURACY</Text>
        <Text
          style={[
            styles.bigValue,
            {
              color: latest
                ? getAccuracyColor(latest.accuracy)
                : Colors.muted,
            },
          ]}
        >
          {latest ? `${latest.accuracy.toFixed(1)}m` : "—"}
        </Text>
        <Text style={styles.bigHint}>
          {latest
            ? latest.accuracy <= 5
              ? "✓ EXCELLENT — 1-2m tracking is viable"
              : latest.accuracy <= 10
              ? "◐ DECENT — 5m tracking, pins will be approximate"
              : latest.accuracy <= 20
              ? "△ WEAK — dots will overlap on close pins"
              : "✕ TOO WEAK — need fallback strategy"
            : "Tap START to begin"}
        </Text>
      </View>

      {/* Stats row */}
      {accuracies.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>BEST</Text>
            <Text
              style={[
                styles.statValue,
                { color: getAccuracyColor(bestAccuracy) },
              ]}
            >
              {bestAccuracy.toFixed(1)}m
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>AVG</Text>
            <Text
              style={[
                styles.statValue,
                { color: getAccuracyColor(avgAccuracy) },
              ]}
            >
              {avgAccuracy.toFixed(1)}m
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WORST</Text>
            <Text
              style={[
                styles.statValue,
                { color: getAccuracyColor(worstAccuracy) },
              ]}
            >
              {worstAccuracy.toFixed(1)}m
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SAMPLES</Text>
            <Text style={[styles.statValue, { color: Colors.teamCyan }]}>
              {readings.length}
            </Text>
          </View>
        </View>
      )}

      {/* Coords */}
      {latest && (
        <View style={styles.coordBox}>
          <Text style={styles.coordText}>
            {latest.lat.toFixed(6)}°N, {latest.lng.toFixed(6)}°E
          </Text>
          <Text style={styles.coordText}>
            Alt: {latest.altitude?.toFixed(1) ?? "N/A"}m
          </Text>
        </View>
      )}

      {/* Start/Stop */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: tracking ? Colors.teamRed : Colors.teamGreen },
        ]}
        onPress={tracking ? stopTracking : startTracking}
      >
        <Text style={styles.buttonText}>
          {tracking ? "STOP" : "START TRACKING"}
        </Text>
      </TouchableOpacity>

      {/* Log */}
      <ScrollView style={styles.log} showsVerticalScrollIndicator={false}>
        {readings.slice(0, 30).map((r, i) => (
          <View key={i} style={styles.logRow}>
            <Text
              style={[styles.logAcc, { color: getAccuracyColor(r.accuracy) }]}
            >
              {r.accuracy.toFixed(1)}m
            </Text>
            <Text style={styles.logCoord}>
              {r.lat.toFixed(6)}, {r.lng.toFixed(6)}
            </Text>
            <Text style={styles.logTime}>
              {new Date(r.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: Colors.softGray,
    textAlign: "center",
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  bigStat: {
    alignItems: "center",
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  bigLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.softGray,
    marginBottom: Spacing.sm,
  },
  bigValue: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 2,
  },
  bigHint: {
    fontSize: 11,
    color: Colors.softGray,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.muted,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  coordBox: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: 2,
  },
  coordText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: Colors.softGray,
  },
  button: {
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.navyDeep,
  },
  log: {
    flex: 1,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight + "30",
    gap: Spacing.md,
  },
  logAcc: {
    fontSize: 12,
    fontWeight: "800",
    width: 50,
  },
  logCoord: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 10,
    color: Colors.muted,
  },
  logTime: {
    fontSize: 10,
    color: Colors.muted,
  },
});
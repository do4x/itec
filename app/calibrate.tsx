import {
    DESIGN_IDS,
    DesignId,
    POSTER_DESIGNS,
    PosterInstance,
} from "@/constants/poster-designs";
import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { db, onValue, ref, remove, set } from "@/lib/firebase";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_SLOTS = 18;
const NUM_SAMPLES = 5;

export default function CalibrateScreen() {
  const insets = useSafeAreaInsets();
  const [instances, setInstances] = useState<Record<string, PosterInstance>>({});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [sampleCount, setSampleCount] = useState(0);

  // For the "add new" flow
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDesignId, setNewDesignId] = useState<DesignId>("afis1");
  const [showDesignPicker, setShowDesignPicker] = useState(false);

  // Load existing instances from Firebase
  useEffect(() => {
    const instancesRef = ref(db, "posterInstances");
    const unsub = onValue(instancesRef, (snap) => {
      const data = snap.val();
      if (data) {
        setInstances(data);
      } else {
        setInstances({});
      }
    });
    return () => unsub();
  }, []);

  const instanceList = Object.entries(instances).map(([id, val]) => ({
    id,
    ...val,
  }));
  const calibratedCount = instanceList.length;

  const startCalibration = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert("Scrie un nume", "Ex: West Wing Sneakers");
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied");
      return;
    }

    const instanceId = `inst_${String(calibratedCount + 1).padStart(2, "0")}`;
    setActiveSlot(instanceId);
    setShowAddModal(false);
    setSampleCount(0);

    // Collect samples
    const samples: { lat: number; lng: number; acc: number }[] = [];
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      samples.push({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        acc: loc.coords.accuracy ?? 99,
      });
      setSampleCount(i + 1);
      if (i < NUM_SAMPLES - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    const avgLat = samples.reduce((s, p) => s + p.lat, 0) / samples.length;
    const avgLng = samples.reduce((s, p) => s + p.lng, 0) / samples.length;
    const avgAcc = samples.reduce((s, p) => s + p.acc, 0) / samples.length;

    const instance: PosterInstance = {
      id: instanceId,
      designId: newDesignId,
      displayName: newDisplayName.trim(),
      lat: avgLat,
      lng: avgLng,
      calibratedAt: Date.now(),
      accuracy: Math.round(avgAcc * 10) / 10,
    };

    await set(ref(db, `posterInstances/${instanceId}`), instance);

    setActiveSlot(null);
    setNewDisplayName("");
    setNewDesignId("afis1");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteInstance = (id: string, name: string) => {
    Alert.alert(`Șterge "${name}"?`, "Se va elimina din hartă.", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          await remove(ref(db, `posterInstances/${id}`));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const clearAll = () => {
    Alert.alert("Resetează tot?", `Șterge toate ${calibratedCount} instanțe.`, [
      { text: "Anulează", style: "cancel" },
      {
        text: "Resetează",
        style: "destructive",
        onPress: async () => {
          await set(ref(db, "posterInstances"), null);
          setInstances({});
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CALIBRATE</Text>
        <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
          <Text style={styles.clearText}>RESET</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>POSTER INSTANCES</Text>
          <Text style={styles.progressCount}>
            <Text
              style={{
                color:
                  calibratedCount === TOTAL_SLOTS
                    ? Colors.teamGreen
                    : Colors.teamCyan,
              }}
            >
              {calibratedCount}
            </Text>
            <Text style={{ color: Colors.muted }}>/{TOTAL_SLOTS}</Text>
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                flex: calibratedCount / TOTAL_SLOTS || 0.001,
                backgroundColor:
                  calibratedCount === TOTAL_SLOTS
                    ? Colors.teamGreen
                    : Colors.teamCyan,
              },
            ]}
          />
          <View
            style={{ flex: 1 - calibratedCount / TOTAL_SLOTS || 0.999 }}
          />
        </View>
        <Text style={styles.progressHint}>
          Walk to each physical poster → tap + → name it → log GPS
        </Text>
      </View>

      {/* Instance list */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {instanceList.map((inst, i) => {
          const design = POSTER_DESIGNS[inst.designId as DesignId];
          const isActive = activeSlot === inst.id;

          return (
            <Animated.View
              key={inst.id}
              entering={FadeInUp.duration(300).delay(i * 30)}
            >
              <View style={[styles.instanceCard, isActive && styles.instanceCardActive]}>
                <View style={styles.instanceLeft}>
                  <Text style={styles.instanceEmoji}>
                    {design?.emoji ?? "📌"}
                  </Text>
                  <View style={styles.instanceInfo}>
                    <Text style={styles.instanceName} numberOfLines={1}>
                      {inst.displayName}
                    </Text>
                    <Text style={styles.instanceMeta}>
                      {design?.name ?? inst.designId} · ±{inst.accuracy}m
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => deleteInstance(inst.id, inst.displayName)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}

        {/* Sampling indicator */}
        {activeSlot && (
          <View style={styles.samplingCard}>
            <ActivityIndicator color={Colors.teamCyan} />
            <Text style={styles.samplingText}>
              Sampling GPS... {sampleCount}/{NUM_SAMPLES}
            </Text>
          </View>
        )}

        {/* Empty state */}
        {calibratedCount === 0 && !activeSlot && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyText}>No posters calibrated yet</Text>
            <Text style={styles.emptyHint}>
              Tap + to add your first poster
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB — Add new instance */}
      {calibratedCount < TOTAL_SLOTS && !activeSlot && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ADD POSTER INSTANCE</Text>
            <Text style={styles.modalSubtitle}>
              #{calibratedCount + 1} of {TOTAL_SLOTS}
            </Text>

            {/* Display name */}
            <Text style={styles.modalLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.modalInput}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="ex: West Wing Sneakers"
              placeholderTextColor={Colors.muted}
              autoFocus
            />

            {/* Design picker */}
            <Text style={styles.modalLabel}>POSTER DESIGN</Text>
            <TouchableOpacity
              style={styles.designSelector}
              onPress={() => setShowDesignPicker(!showDesignPicker)}
            >
              <Text style={styles.designSelectorEmoji}>
                {POSTER_DESIGNS[newDesignId].emoji}
              </Text>
              <Text style={styles.designSelectorText}>
                {POSTER_DESIGNS[newDesignId].name}
              </Text>
              <Text style={styles.designSelectorArrow}>
                {showDesignPicker ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showDesignPicker && (
              <ScrollView style={styles.designList} nestedScrollEnabled>
                {DESIGN_IDS.map((dId) => {
                  const d = POSTER_DESIGNS[dId];
                  const isSelected = dId === newDesignId;
                  return (
                    <TouchableOpacity
                      key={dId}
                      style={[
                        styles.designOption,
                        isSelected && styles.designOptionSelected,
                      ]}
                      onPress={() => {
                        setNewDesignId(dId);
                        setShowDesignPicker(false);
                      }}
                    >
                      <Text style={styles.designOptionEmoji}>{d.emoji}</Text>
                      <Text
                        style={[
                          styles.designOptionText,
                          isSelected && { color: Colors.teamCyan },
                        ]}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowAddModal(false);
                  setNewDisplayName("");
                  setShowDesignPicker(false);
                }}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  !newDisplayName.trim() && { opacity: 0.3 },
                ]}
                onPress={startCalibration}
                disabled={!newDisplayName.trim()}
              >
                <Text style={styles.modalConfirmText}>📍 LOG POSITION</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backBtn: { paddingVertical: Spacing.xs, paddingRight: Spacing.md },
  backText: { color: Colors.softGray, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  title: { fontSize: 16, fontWeight: "900", letterSpacing: 4, color: Colors.white },
  clearBtn: { paddingVertical: Spacing.xs, paddingLeft: Spacing.md },
  clearText: { color: Colors.teamRed, fontSize: 10, fontWeight: "800", letterSpacing: 2 },

  // Progress
  progressCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 3, color: Colors.softGray },
  progressCount: { fontSize: 18, fontWeight: "900" },
  progressBar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.navyLight,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressHint: { fontSize: 11, color: Colors.muted },

  // List
  list: { flex: 1 },
  instanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  instanceCardActive: {
    borderColor: Colors.teamCyan + "50",
    backgroundColor: Colors.teamCyan + "08",
  },
  instanceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  instanceEmoji: { fontSize: 22 },
  instanceInfo: { flex: 1, gap: 2 },
  instanceName: { fontSize: 13, fontWeight: "700", color: Colors.white },
  instanceMeta: { fontSize: 9, color: Colors.muted, letterSpacing: 0.5 },
  deleteBtn: { padding: Spacing.sm },
  deleteText: { color: Colors.teamRed + "80", fontSize: 14, fontWeight: "700" },

  // Sampling
  samplingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    backgroundColor: Colors.teamCyan + "10",
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.teamCyan + "30",
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  samplingText: { color: Colors.teamCyan, fontSize: 13, fontWeight: "700" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: Spacing.huge },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
  emptyText: { color: Colors.softGray, fontSize: 16, fontWeight: "700" },
  emptyHint: { color: Colors.muted, fontSize: 12, marginTop: Spacing.xs },

  // FAB
  fab: {
    position: "absolute",
    bottom: 30,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.teamCyan,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.glow(Colors.teamCyan),
  },
  fabText: { fontSize: 28, fontWeight: "700", color: Colors.navyDeep, marginTop: -2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xxl,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.white,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.muted,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.softGray,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: Colors.navyDeep + "80",
  },

  // Design selector
  designSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.navyDeep + "80",
  },
  designSelectorEmoji: { fontSize: 18 },
  designSelectorText: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: "600" },
  designSelectorArrow: { color: Colors.muted, fontSize: 10 },

  // Design picker list
  designList: {
    maxHeight: 200,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    backgroundColor: Colors.navyDeep,
  },
  designOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight + "30",
  },
  designOptionSelected: {
    backgroundColor: Colors.teamCyan + "10",
  },
  designOptionEmoji: { fontSize: 16 },
  designOptionText: { color: Colors.softGray, fontSize: 13, fontWeight: "600" },

  // Modal actions
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    alignItems: "center",
  },
  modalCancelText: { color: Colors.softGray, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  modalConfirm: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    backgroundColor: Colors.teamCyan,
    alignItems: "center",
  },
  modalConfirmText: { color: Colors.navyDeep, fontSize: 13, fontWeight: "900", letterSpacing: 1 },
});
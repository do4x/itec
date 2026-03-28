import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { GRAFFITI_PATTERNS, GraffitiPattern } from "@/constants/graffiti-patterns";
import { Colors, Spacing, Radii, Typography } from "@/constants/theme";

interface GraffitiPickerProps {
  visible: boolean;
  teamColor: string;
  onSelect: (pattern: GraffitiPattern) => void;
  onClose: () => void;
}

function PatternPreview({ pattern, color }: { pattern: GraffitiPattern; color: string }) {
  const cellSize = 6;
  return (
    <Svg width={pattern.width * cellSize} height={pattern.height * cellSize}>
      {pattern.pixels.flatMap((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <Rect key={`${r}_${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill={color} />
          ) : null
        )
      )}
    </Svg>
  );
}

export default function GraffitiPicker({ visible, teamColor, onSelect, onClose }: GraffitiPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>GRAFFITI (50 tokens)</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {GRAFFITI_PATTERNS.map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                style={styles.patternCard}
                onPress={() => { onSelect(pattern); onClose(); }}
              >
                <PatternPreview pattern={pattern} color={teamColor} />
                <Text style={styles.patternName}>{pattern.emoji} {pattern.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: Colors.navyMid, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.xl, maxHeight: "60%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  title: { ...Typography.h2, color: Colors.white },
  close: { color: Colors.softGray, fontSize: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  patternCard: { width: "30%", backgroundColor: Colors.navyDeep, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.navyLight, padding: Spacing.md, alignItems: "center", gap: Spacing.sm },
  patternName: { color: Colors.softGray, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});

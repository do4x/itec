import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { generateAiPoster } from "@/lib/ai-gen";
import { Colors, Spacing, Radii, Typography } from "@/constants/theme";

interface AiPosterModalProps {
  visible: boolean;
  onConfirm: (url: string) => void;
  onClose: () => void;
}

export default function AiPosterModal({ visible, onConfirm, onClose }: AiPosterModalProps) {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUrl(null);
    const url = await generateAiPoster(prompt.trim());
    setImageUrl(url);
    setLoading(false);
  };

  const handleConfirm = () => {
    if (imageUrl) {
      onConfirm(imageUrl);
      setPrompt("");
      setImageUrl(null);
      onClose();
    }
  };

  const handleClose = () => {
    setPrompt("");
    setImageUrl(null);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>AI POSTER (150 tokens)</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe your poster... (e.g. cyberpunk graffiti)"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            multiline
          />

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.itecBright} />
              <Text style={styles.loadingText}>Generating...</Text>
            </View>
          )}

          {imageUrl && !loading && (
            <View style={styles.previewBox}>
              <Image source={{ uri: imageUrl }} style={styles.preview} contentFit="contain" />
            </View>
          )}

          <View style={styles.actions}>
            {!imageUrl && !loading && (
              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={!prompt.trim()}>
                <Text style={styles.generateText}>GENERATE</Text>
              </TouchableOpacity>
            )}
            {imageUrl && !loading && (
              <>
                <TouchableOpacity style={styles.retryBtn} onPress={handleGenerate}>
                  <Text style={styles.retryText}>RETRY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmText}>PLACE ON CANVAS</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: Colors.navyMid, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.xl, maxHeight: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  title: { ...Typography.h2, color: Colors.white },
  close: { color: Colors.softGray, fontSize: 20 },
  input: { borderWidth: 1, borderColor: Colors.navyLight, borderRadius: Radii.md, padding: Spacing.md, color: Colors.white, fontSize: 14, minHeight: 60, textAlignVertical: "top", marginBottom: Spacing.md },
  loadingBox: { alignItems: "center", padding: Spacing.xxl, gap: Spacing.md },
  loadingText: { color: Colors.softGray, fontSize: 12, letterSpacing: 2 },
  previewBox: { alignItems: "center", marginBottom: Spacing.md },
  preview: { width: 200, height: 200, borderRadius: Radii.md },
  actions: { flexDirection: "row", gap: Spacing.md, justifyContent: "center" },
  generateBtn: { backgroundColor: Colors.itecBlue, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radii.md },
  generateText: { color: Colors.white, fontWeight: "800", fontSize: 14, letterSpacing: 2 },
  retryBtn: { borderWidth: 1, borderColor: Colors.navyLight, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.md },
  retryText: { color: Colors.softGray, fontWeight: "700", fontSize: 12, letterSpacing: 2 },
  confirmBtn: { backgroundColor: Colors.success, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.md },
  confirmText: { color: Colors.navyDeep, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
});

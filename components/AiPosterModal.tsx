import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { generateAiPoster } from "@/lib/ai-gen";
import { Colors, Spacing, Radii, Typography } from "@/constants/theme";

interface AiPosterModalProps {
  visible: boolean;
  onConfirm: (url: string) => void;
  onClose: () => void;
}

export default function AiPosterModal({ visible, onConfirm, onClose }: AiPosterModalProps) {
  const [prompt, setPrompt]       = useState("");
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  // ready = true după ce expo-image a terminat de decodat și redat imaginea
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const reset = () => {
    setImageUri(null);
    setLoading(false);
    setError(null);
    setReady(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUri(null);
    setError(null);
    setReady(false);
    try {
      const uri = await generateAiPoster(prompt.trim());
      setImageUri(uri);
      // expo-image va decoda data URI-ul și va apela onLoad când e gata
    } catch (e: any) {
      setError(e?.message ?? "Generarea a eșuat. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!imageUri || !ready) return;
    onConfirm(imageUri);
    setPrompt("");
    reset();
    onClose();
  };

  const handleClose = () => {
    setPrompt("");
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AI POSTER (150 tokens)</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Prompt input */}
          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Descrie posterul... (ex: cyberpunk city graffiti)"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            multiline
            editable={!loading}
          />

          {/* Spinner generare */}
          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.itecBright} />
              <Text style={styles.statusText}>Se generează imaginea...</Text>
              <Text style={styles.hintText}>Poate dura 10–30 secunde</Text>
            </View>
          )}

          {/* Eroare */}
          {error && !loading && (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Preview — data URI decodat de expo-image */}
          {imageUri && !loading && !error && (
            <View style={styles.previewBox}>
              {!ready && (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="small" color={Colors.itecBright} />
                  <Text style={styles.hintText}>Se afișează imaginea...</Text>
                </View>
              )}
              <Image
                source={{ uri: imageUri }}
                style={[styles.preview, !ready && { width: 0, height: 0 }]}
                contentFit="contain"
                onLoad={() => setReady(true)}
                onError={() => setError("Afișarea a eșuat. Încearcă din nou.")}
              />
            </View>
          )}

          {/* Acțiuni */}
          <View style={styles.actions}>
            {!loading && (!imageUri || error) && (
              <TouchableOpacity
                style={[styles.generateBtn, !prompt.trim() && { opacity: 0.4 }]}
                onPress={handleGenerate}
                disabled={!prompt.trim()}
              >
                <Text style={styles.generateText}>{error ? "RETRY" : "GENERATE"}</Text>
              </TouchableOpacity>
            )}
            {imageUri && !loading && !error && (
              <>
                <TouchableOpacity style={styles.retryBtn} onPress={handleGenerate}>
                  <Text style={styles.retryText}>RETRY</Text>
                </TouchableOpacity>
                {ready && (
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                    <Text style={styles.confirmText}>PLACE ON CANVAS</Text>
                  </TouchableOpacity>
                )}
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
  modal: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    padding: Spacing.xl, maxHeight: "85%",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: Spacing.lg,
  },
  title: { ...Typography.h2, color: Colors.white },
  close: { color: Colors.softGray, fontSize: 20 },
  input: {
    borderWidth: 1, borderColor: Colors.navyLight, borderRadius: Radii.md,
    padding: Spacing.md, color: Colors.white, fontSize: 14,
    minHeight: 60, textAlignVertical: "top", marginBottom: Spacing.md,
  },
  centerBox: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.sm },
  statusText: { color: Colors.softGray, fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  hintText: { color: Colors.muted, fontSize: 11, letterSpacing: 1 },
  errorText: { color: Colors.error, fontSize: 12, letterSpacing: 1, textAlign: "center" },
  previewBox: { alignItems: "center", marginBottom: Spacing.md },
  preview: { width: 220, height: 220, borderRadius: Radii.md },
  actions: { flexDirection: "row", gap: Spacing.md, justifyContent: "center", marginTop: Spacing.sm },
  generateBtn: {
    backgroundColor: Colors.itecBlue,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radii.md,
  },
  generateText: { color: Colors.white, fontWeight: "800", fontSize: 14, letterSpacing: 2 },
  retryBtn: {
    borderWidth: 1, borderColor: Colors.navyLight,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.md,
  },
  retryText: { color: Colors.softGray, fontWeight: "700", fontSize: 12, letterSpacing: 2 },
  confirmBtn: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.md,
  },
  confirmText: { color: Colors.navyDeep, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
});

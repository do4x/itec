import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { generateAiPoster } from "@/lib/ai-gen";
import { Colors, Spacing, Radii, Typography } from "@/constants/theme";

interface AiPosterModalProps {
  visible: boolean;
  onConfirm: (url: string) => void;
  onClose: () => void;
}

const IMAGE_LOAD_TIMEOUT = 15_000;

export default function AiPosterModal({ visible, onConfirm, onClose }: AiPosterModalProps) {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadTimeout = () => {
    if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
  };

  // Start 15s timeout whenever imageUrl is set and image hasn't loaded yet
  useEffect(() => {
    clearLoadTimeout();
    if (imageUrl && !imageLoaded) {
      loadTimeoutRef.current = setTimeout(() => {
        setImageError(true);
        setGenError("Imaginea nu s-a putut afișa. Încearcă din nou.");
        setImageUrl(null);
      }, IMAGE_LOAD_TIMEOUT);
    }
    return clearLoadTimeout;
  }, [imageUrl]);

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const reset = () => {
    clearLoadTimeout();
    setImageUrl(null);
    setLoading(false);
    setImageLoaded(false);
    setImageError(false);
    setGenError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    clearLoadTimeout();
    setLoading(true);
    setImageUrl(null);
    setImageLoaded(false);
    setImageError(false);
    setGenError(null);
    try {
      const url = await generateAiPoster(prompt.trim());
      setImageUrl(url);
    } catch (e: any) {
      setGenError(e?.message ?? "Generarea a eșuat. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (imageUrl && imageLoaded) {
      clearLoadTimeout();
      onConfirm(imageUrl);
      setPrompt("");
      reset();
      onClose();
    }
  };

  const handleClose = () => {
    setPrompt("");
    reset();
    onClose();
  };

  const canGenerate = !loading && prompt.trim().length > 0;
  const showRetry = !loading && (genError !== null || imageError);
  const showPlace = imageUrl !== null && imageLoaded && !imageError && !loading;
  const showImageSpinner = imageUrl !== null && !imageLoaded && !imageError && !loading;

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
            placeholder="Descrie posterul... (ex: cyberpunk graffiti)"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            multiline
          />

          {/* Generating spinner */}
          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.itecBright} />
              <Text style={styles.loadingText}>Se generează imaginea...</Text>
            </View>
          )}

          {/* Image loading spinner */}
          {showImageSpinner && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.itecBright} />
              <Text style={styles.loadingText}>Se încarcă imaginea...</Text>
            </View>
          )}

          {/* Error */}
          {genError && !loading && (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{genError}</Text>
            </View>
          )}

          {/* Preview — hidden (0x0) until loaded */}
          {imageUrl && !loading && (
            <Image
              source={{ uri: imageUrl }}
              style={showPlace ? styles.preview : { width: 0, height: 0 }}
              contentFit="contain"
              onLoad={() => { clearLoadTimeout(); setImageLoaded(true); }}
              onError={() => {
                clearLoadTimeout();
                setImageLoaded(false);
                setImageError(true);
                setImageUrl(null);
                setGenError("Imaginea nu s-a putut afișa. Încearcă din nou.");
              }}
            />
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!loading && (showRetry || !imageUrl) && (
              <TouchableOpacity
                style={[styles.generateBtn, !canGenerate && { opacity: 0.4 }]}
                onPress={handleGenerate}
                disabled={!canGenerate}
              >
                <Text style={styles.generateText}>{genError ? "RETRY" : "GENERATE"}</Text>
              </TouchableOpacity>
            )}
            {showPlace && (
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
  centerBox: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.md },
  loadingText: { color: Colors.softGray, fontSize: 12, letterSpacing: 2 },
  errorText: { color: Colors.error, fontSize: 12, letterSpacing: 1, textAlign: "center" },
  preview: { width: 200, height: 200, borderRadius: Radii.md, alignSelf: "center", marginBottom: Spacing.md },
  actions: { flexDirection: "row", gap: Spacing.md, justifyContent: "center", marginTop: Spacing.sm },
  generateBtn: { backgroundColor: Colors.itecBlue, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radii.md },
  generateText: { color: Colors.white, fontWeight: "800", fontSize: 14, letterSpacing: 2 },
  retryBtn: { borderWidth: 1, borderColor: Colors.navyLight, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.md },
  retryText: { color: Colors.softGray, fontWeight: "700", fontSize: 12, letterSpacing: 2 },
  confirmBtn: { backgroundColor: Colors.success, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.md },
  confirmText: { color: Colors.navyDeep, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
});

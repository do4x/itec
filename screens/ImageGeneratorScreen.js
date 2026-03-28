// Ecran standalone pentru generare imagini cu Google Gemini
// Input → Buton → Loading → Afișare imagine

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { generateImage } from "../services/imageGeneration";

export default function ImageGeneratorScreen() {
  const [prompt, setPrompt] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    // Validare input
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setImageUri(null);

    try {
      const uri = await generateImage(prompt.trim());
      setImageUri(uri);
    } catch (e) {
      setError(e?.message ?? "Generarea a eșuat. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Generator Imagini AI</Text>
        <Text style={styles.subtitle}>Powered by Google Gemini</Text>

        {/* Input prompt */}
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Descrie imaginea..."
          placeholderTextColor="#666"
          multiline
          editable={!loading}
        />

        {/* Buton Generează */}
        <TouchableOpacity
          style={[styles.button, (!prompt.trim() || loading) && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Se generează..." : "Generează"}
          </Text>
        </TouchableOpacity>

        {/* Loading indicator — generarea durează 10-30 secunde */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Poate dura 10–30 secunde...</Text>
          </View>
        )}

        {/* Eroare */}
        {error && !loading && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Imagine generată */}
        {imageUri && !loading && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#0D1B2A",
  },
  container: {
    padding: 24,
    alignItems: "center",
    flexGrow: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 16,
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 24,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#1E3A5F",
    borderRadius: 10,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: "#112035",
  },
  button: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1,
  },
  loadingBox: {
    alignItems: "center",
    marginTop: 24,
    gap: 10,
  },
  loadingText: {
    color: "#888",
    fontSize: 12,
    letterSpacing: 1,
  },
  errorText: {
    color: "#FF4444",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 0.5,
  },
  imageContainer: {
    marginTop: 24,
    width: "100%",
    alignItems: "center",
  },
  image: {
    width: 280,
    height: 280,
    borderRadius: 12,
  },
});

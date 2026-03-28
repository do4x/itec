import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radii } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - 8) / 3;

const GIPHY_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;

interface GifResult {
  id: string;
  previewUrl: string;
  fullUrl: string;
}

interface Props {
  visible: boolean;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPickerModal({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [tab, setTab] = useState<"search" | "url">(GIPHY_KEY ? "search" : "url");

  const fetchGifs = useCallback(async (q: string) => {
    if (!GIPHY_KEY) return;
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=18&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=18&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setResults(
        json.data.map((g: any) => ({
          id: g.id,
          previewUrl: g.images.fixed_width_small?.url ?? g.images.fixed_width.url,
          fullUrl: g.images.fixed_width.url,
        }))
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending when modal opens
  useEffect(() => {
    if (visible && tab === "search" && GIPHY_KEY) {
      fetchGifs("");
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!GIPHY_KEY || tab !== "search") return;
    const timer = setTimeout(() => fetchGifs(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectGif = (url: string) => {
    onSelect(url);
    onClose();
    setQuery("");
  };

  const handleAddUrl = () => {
    if (!manualUrl.trim()) return;
    onSelect(manualUrl.trim());
    setManualUrl("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ADD GIF</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.softGray} />
          </TouchableOpacity>
        </View>

        {/* Tabs — only show if Giphy key is configured */}
        {GIPHY_KEY && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === "search" && styles.tabActive]}
              onPress={() => setTab("search")}
            >
              <Text style={[styles.tabText, tab === "search" && styles.tabTextActive]}>
                Caută Giphy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "url" && styles.tabActive]}
              onPress={() => setTab("url")}
            >
              <Text style={[styles.tabText, tab === "url" && styles.tabTextActive]}>
                URL direct
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Giphy Search Tab */}
        {tab === "search" && GIPHY_KEY && (
          <>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="caută gif-uri..."
              placeholderTextColor={Colors.muted}
              returnKeyType="search"
            />
            {loading ? (
              <ActivityIndicator color={Colors.itecBright} style={styles.loader} />
            ) : results.length === 0 ? (
              <View style={styles.emptySearch}>
                <Text style={styles.emptyText}>Niciun rezultat</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                numColumns={3}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.row}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectGif(item.fullUrl)}
                    activeOpacity={0.75}
                  >
                    <Image
                      source={{ uri: item.previewUrl }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}

        {/* URL Input Tab */}
        {tab === "url" && (
          <View style={styles.urlSection}>
            {!GIPHY_KEY && (
              <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.itecBright} />
                <Text style={styles.tipText}>
                  Adaugă EXPO_PUBLIC_GIPHY_API_KEY în .env pentru search Giphy.{"\n"}
                  Sau lipsă direct URL-ul unui GIF (giphy.com, tenor.com etc.)
                </Text>
              </View>
            )}
            <Text style={styles.urlLabel}>URL GIF</Text>
            <TextInput
              style={styles.urlInput}
              value={manualUrl}
              onChangeText={setManualUrl}
              placeholder="https://media.giphy.com/..."
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddUrl}
            />
            <TouchableOpacity
              style={[styles.addBtn, !manualUrl.trim() && styles.addBtnDisabled]}
              onPress={handleAddUrl}
              disabled={!manualUrl.trim()}
            >
              <Text style={styles.addBtnText}>ADAUGĂ</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navyDeep,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navyMid,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    justifyContent: "center",
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    backgroundColor: Colors.navyMid,
  },
  tabActive: {
    backgroundColor: Colors.itecBlue + "26",
    borderColor: Colors.itecBright,
  },
  tabText: {
    color: Colors.softGray,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.itecBright,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    color: Colors.white,
    fontSize: 16,
    backgroundColor: Colors.navyMid,
    marginBottom: Spacing.md,
  },
  loader: {
    marginTop: 40,
  },
  emptySearch: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 14,
  },
  row: {
    gap: 4,
    marginBottom: 4,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.sm,
    backgroundColor: Colors.navyMid,
  },
  urlSection: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  tipBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.itecBlue + "18",
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.itecBlue + "44",
    padding: Spacing.md,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    color: Colors.softGray,
    fontSize: 12,
    lineHeight: 18,
  },
  urlLabel: {
    color: Colors.softGray,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  urlInput: {
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 15,
    backgroundColor: Colors.navyMid,
  },
  addBtn: {
    backgroundColor: Colors.itecBlue,
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnDisabled: {
    opacity: 0.3,
  },
  addBtnText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 3,
  },
});

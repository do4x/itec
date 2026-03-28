import { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Colors, Spacing, Radii, Typography, Shadows } from "@/constants/theme";
import { searchJamendoTracks, JamendoTrack } from "@/constants/anthem-tracks";

interface Props {
  visible: boolean;
  onSelect: (track: JamendoTrack) => void;
  onClose: () => void;
}

const LIMIT = 20;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AnthemPickerModal({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<JamendoTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const player = useAudioPlayer(previewUrl ? { uri: previewUrl } : null);

  // Auto-play when previewUrl changes
  useEffect(() => {
    if (!previewUrl) return;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    try { player.play(); } catch { /* ignore playback errors */ }
    return () => {
      try { player.pause(); } catch { /* ignore */ }
    };
  }, [previewUrl]);

  // Stop player when modal closes
  useEffect(() => {
    if (!visible) {
      player.pause();
      setPlayingId(null);
      setPreviewUrl(null);
      setSelectedId(null);
    }
  }, [visible]);

  const fetchTracks = useCallback(async (q: string, off: number, replace: boolean) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    const results = await searchJamendoTracks(q, off, LIMIT);
    if (replace) {
      setTracks(results);
      setLoading(false);
    } else {
      setTracks((prev) => [...prev, ...results]);
      setLoadingMore(false);
    }
    setHasMore(results.length === LIMIT);
    setOffset(off + results.length);
  }, []);

  // Initial load / search change
  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTracks(query, 0, true);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchTracks(query, offset, false);
  }, [loadingMore, hasMore, query, offset, fetchTracks]);

  const handlePlay = useCallback((track: JamendoTrack) => {
    if (playingId === track.id) {
      player.pause();
      setPlayingId(null);
      setPreviewUrl(null);
    } else {
      setPreviewUrl(track.audio);
      setPlayingId(track.id);
    }
  }, [playingId, player]);

  const handleSelect = useCallback((track: JamendoTrack) => {
    player.pause();
    setPlayingId(null);
    setPreviewUrl(null);
    onSelect(track);
  }, [player, onSelect]);

  const renderTrack = useCallback(({ item }: { item: JamendoTrack }) => {
    const isPlaying = playingId === item.id;
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.trackRow, isSelected && styles.trackRowSelected]}
        onPress={() => setSelectedId(item.id)}
        activeOpacity={0.7}
      >
        {item.album_image ? (
          <Image source={{ uri: item.album_image }} style={styles.albumArt} />
        ) : (
          <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
            <Ionicons name="musical-note" size={20} color={Colors.muted} />
          </View>
        )}

        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist_name}</Text>
          <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
        </View>

        <TouchableOpacity style={styles.playBtn} onPress={() => handlePlay(item)}>
          <Ionicons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={32}
            color={isPlaying ? Colors.itecBright : Colors.softGray}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.setBtn} onPress={() => handleSelect(item)}>
          <Text style={styles.setBtnText}>SET</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [playingId, selectedId, handlePlay, handleSelect]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ALEGE ANTHEM</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.softGray} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Caută..."
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Track list */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.itecBright} />
            <Text style={styles.loadingText}>Se caută muzică...</Text>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="musical-notes-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>Niciun rezultat</Text>
          </View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            renderItem={renderTrack}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.itecBright} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navyDeep },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  title: { ...Typography.h3, letterSpacing: 3 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.navyMid,
    borderWidth: 1, borderColor: Colors.navyLight,
    justifyContent: "center", alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.lg,
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    padding: 0,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyMid,
  },
  trackRowSelected: {
    backgroundColor: Colors.itecBlue + "18",
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
  },
  albumArt: { width: 48, height: 48, borderRadius: Radii.sm, backgroundColor: Colors.navyMid },
  albumArtPlaceholder: { justifyContent: "center", alignItems: "center" },
  trackInfo: { flex: 1 },
  trackName: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  trackArtist: { color: Colors.softGray, fontSize: 11, marginTop: 2 },
  trackDuration: { color: Colors.muted, fontSize: 10, marginTop: 2, letterSpacing: 1 },
  playBtn: { padding: Spacing.xs },
  setBtn: {
    backgroundColor: Colors.itecBlue + "26",
    borderWidth: 1,
    borderColor: Colors.itecBright,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  setBtnText: { color: Colors.itecBright, fontWeight: "800", fontSize: 11, letterSpacing: 2 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  loadingText: { color: Colors.muted, fontSize: 13, letterSpacing: 1 },
  emptyText: { color: Colors.muted, fontSize: 13, letterSpacing: 1 },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});

import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useGame, TEAMS } from "@/lib/game-state";
import { useTokens } from "@/lib/tokens";
import { AVATARS, getAvatar } from "@/constants/avatars";
import { Colors, Spacing, Radii, Shadows } from "@/constants/theme";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { uid, username, teamId, avatar, setAvatar, isGuest, isAuthenticated, logout } = useGame();
  const { tokens, nextRefillIn, TOKEN_CAP } = useTokens(uid);
  const team = TEAMS[teamId];
  const currentAvatar = getAvatar(avatar);
  const [changingAvatar, setChangingAvatar] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Ești sigur că vrei să ieși din cont?",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            onClose();
            await logout();
            router.replace("/auth" as any);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Handle */}
            <View style={styles.handle} />

            {/* Avatar + info */}
            <View style={styles.profileRow}>
              <View style={[styles.avatarCircle, { borderColor: currentAvatar.color }]}>
                <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>@{username || "guest"}</Text>
                <View style={[styles.teamBadge, { borderColor: team.color }]}>
                  <View style={[styles.teamDot, { backgroundColor: team.color }]} />
                  <Text style={[styles.teamName, { color: team.color }]}>{team.name}</Text>
                </View>
                {isGuest && <Text style={styles.guestTag}>MOD GUEST</Text>}
              </View>
            </View>

            {/* Token balance */}
            <View style={styles.statCard}>
              <View>
                <Text style={styles.statLabel}>TOKENS</Text>
                {!isGuest && tokens < TOKEN_CAP && (
                  <Text style={styles.refillTimer}>+20 în {nextRefillIn}s</Text>
                )}
              </View>
              <Text style={styles.statValue}>{isGuest ? "—" : tokens}</Text>
            </View>

            {/* Schimbă avatar */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setChangingAvatar((v) => !v)}
            >
              <Text style={styles.sectionTitle}>SCHIMBĂ AVATAR</Text>
              <Text style={styles.chevron}>{changingAvatar ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {changingAvatar && (
              <View style={styles.avatarGrid}>
                {AVATARS.map((av) => {
                  const isSelected = avatar === av.id;
                  return (
                    <TouchableOpacity
                      key={av.id}
                      style={[
                        styles.avatarOption,
                        isSelected && { borderColor: av.color, backgroundColor: av.color + "20" },
                      ]}
                      onPress={() => setAvatar(av.id)}
                    >
                      <Text style={styles.avatarOptionEmoji}>{av.emoji}</Text>
                      <Text style={[styles.avatarOptionLabel, isSelected && { color: av.color }]}>
                        {av.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>⏻ LOGOUT</Text>
            </TouchableOpacity>

            {/* Închide */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>ÎNCHIDE</Text>
            </TouchableOpacity>

          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
    maxHeight: "80%",
    ...Shadows.card,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.navyLight, alignSelf: "center", marginBottom: Spacing.xl,
  },

  profileRow: { flexDirection: "row", alignItems: "center", gap: Spacing.lg, marginBottom: Spacing.xl },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.navyDeep,
  },
  avatarEmoji: { fontSize: 30 },
  profileInfo: { gap: Spacing.xs },
  username: { color: Colors.white, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  teamBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: Radii.full,
    paddingHorizontal: Spacing.md, paddingVertical: 3,
    alignSelf: "flex-start",
  },
  teamDot: { width: 7, height: 7, borderRadius: 4 },
  teamName: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  guestTag: { color: Colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: 2 },

  statCard: {
    backgroundColor: Colors.navyDeep,
    borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.navyLight,
    padding: Spacing.lg, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: Spacing.xl,
  },
  statLabel: { color: Colors.softGray, fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  statValue: { color: Colors.teamYellow, fontSize: 20, fontWeight: "800" },
  refillTimer: { color: Colors.muted, fontSize: 10, fontWeight: "600", marginTop: 3 },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.navyLight,
    marginBottom: Spacing.md,
  },
  sectionTitle: { color: Colors.softGray, fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  chevron: { color: Colors.muted, fontSize: 12 },

  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg },
  avatarOption: {
    width: 64, alignItems: "center", gap: 4,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.navyLight,
    borderRadius: Radii.md, backgroundColor: Colors.navyDeep + "80",
  },
  avatarOptionEmoji: { fontSize: 24 },
  avatarOptionLabel: { color: Colors.muted, fontSize: 8, fontWeight: "700", letterSpacing: 1 },

  logoutBtn: {
    borderWidth: 1, borderColor: Colors.error + "60",
    borderRadius: Radii.md, paddingVertical: Spacing.md,
    alignItems: "center", marginBottom: Spacing.md,
  },
  logoutText: { color: Colors.error, fontWeight: "800", fontSize: 13, letterSpacing: 2 },

  closeBtn: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: "center",
  },
  closeText: { color: Colors.softGray, fontWeight: "700", fontSize: 12, letterSpacing: 2 },
});

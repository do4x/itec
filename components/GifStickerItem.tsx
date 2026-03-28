import { useEffect, useRef, useCallback } from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

export const GIF_BASE_SIZE = 80;

export interface CanvasGif {
  id: string;
  url: string;
  x: number;        // centrul GIF-ului pe canvas (X)
  y: number;        // centrul GIF-ului pe canvas (Y)
  scale: number;
  rotation: number; // radiani
}

interface Props {
  gif: CanvasGif;
  isSelected: boolean;
  interactive: boolean;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, x: number, y: number, scale: number, rotation: number) => void;
  onDelete: (id: string) => void;
}

const SPRING = { damping: 20, stiffness: 200 };

export default function GifStickerItem({
  gif,
  isSelected,
  interactive,
  onSelect,
  onUpdate,
  onDelete,
}: Props) {
  // Coordonate centrate: translateX/Y = centrul GIF-ului
  const translateX  = useSharedValue(gif.x);
  const translateY  = useSharedValue(gif.y);
  const scale       = useSharedValue(gif.scale);
  const rotation    = useSharedValue(gif.rotation ?? 0);

  // Valori salvate la începutul fiecărui gest
  const savedX        = useSharedValue(gif.x);
  const savedY        = useSharedValue(gif.y);
  const savedScale    = useSharedValue(gif.scale);
  const savedRotation = useSharedValue(gif.rotation ?? 0);

  // Previne Firebase echo să reseteze poziția în timp ce userul gesticulează
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      translateX.value  = withSpring(gif.x,              SPRING);
      translateY.value  = withSpring(gif.y,              SPRING);
      scale.value       = withSpring(gif.scale,          SPRING);
      rotation.value    = withSpring(gif.rotation ?? 0,  SPRING);
    }
  }, [gif.x, gif.y, gif.scale, gif.rotation]);

  const setDragging = useCallback((v: boolean) => { isDraggingRef.current = v; }, []);

  const persist = useCallback(
    (x: number, y: number, s: number, r: number) => onUpdate(gif.id, x, y, s, r),
    [gif.id, onUpdate]
  );

  const handleSelect = useCallback(
    () => onSelect(isSelected ? null : gif.id),
    [gif.id, isSelected, onSelect]
  );

  const handleDelete = useCallback(() => onDelete(gif.id), [gif.id, onDelete]);

  // ── Gesturi ────────────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      runOnJS(setDragging)(true);
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(persist)(translateX.value, translateY.value, scale.value, rotation.value);
      runOnJS(setDragging)(false);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = Math.max(0.3, Math.min(1.6, savedScale.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(persist)(translateX.value, translateY.value, scale.value, rotation.value);
    });

  const rotationGesture = Gesture.Rotation()
    .onStart(() => { savedRotation.value = rotation.value; })
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      runOnJS(persist)(translateX.value, translateY.value, scale.value, rotation.value);
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => runOnJS(handleSelect)());

  // Pan + Pinch + Rotation simultan, Tap separat
  const gesture = Gesture.Simultaneous(
    Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture),
    tapGesture
  );

  // ── Animație ───────────────────────────────────────────────────────────
  // Container-ul are top/left = 0; translateX/Y compensează cu -GIF_BASE_SIZE/2
  // astfel că vizual CENTRUL GIF-ului ajunge la (gif.x, gif.y).
  // React Native aplică rotate/scale în jurul centrului elementului — corect.
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - GIF_BASE_SIZE / 2 },
      { translateY: translateY.value - GIF_BASE_SIZE / 2 },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value },
    ],
  }));

  const content = (
    <Animated.View style={[styles.container, animStyle]}>
      <Image source={{ uri: gif.url }} style={styles.image} contentFit="contain" />
      {isSelected && <View style={styles.selectionBorder} />}
      {isSelected && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="close-circle" size={24} color={Colors.error} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (!interactive) {
    return (
      <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
        <Image source={{ uri: gif.url }} style={styles.image} contentFit="contain" />
      </Animated.View>
    );
  }
  return <GestureDetector gesture={gesture}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  // top/left = 0 astfel că layout-ul e întotdeauna în interiorul canvas-ului;
  // offset-ul față de centru e aplicat în transform (nu în layout) ca
  // overflow:hidden să nu clipeze GIF-ul.
  container: {
    position: "absolute",
    top:  0,
    left: 0,
    width:  GIF_BASE_SIZE,
    height: GIF_BASE_SIZE,
  },
  image: {
    width:  GIF_BASE_SIZE,
    height: GIF_BASE_SIZE,
  },
  selectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.itecBright,
    borderRadius: 6,
    borderStyle: "dashed",
  },
  deleteBtn: {
    position: "absolute",
    top:   -12,
    right: -12,
    backgroundColor: Colors.navyDeep,
    borderRadius: 12,
  },
});

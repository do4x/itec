import React, { useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import { Colors } from "@/constants/theme";

export interface PixelData {
  color: string;
  teamId: string;
  username: string;
  uid: string;
}

interface PixelGridProps {
  pixels: Map<string, PixelData>;
  selectedColor: string;
  cellSize: number;
  gridCols?: number;
  gridRows?: number;
  onPixelPress: (row: number, col: number) => void;
  onPixelDrag?: (row: number, col: number) => void;
}

const GRID_SIZE = 40;

const MemoRect = React.memo(
  ({ x, y, size, color }: { x: number; y: number; size: number; color: string }) => (
    <Rect x={x} y={y} width={size} height={size} fill={color} />
  ),
  (prev, next) => prev.color === next.color
);

export default function PixelGrid({
  pixels,
  selectedColor,
  cellSize,
  gridCols = GRID_SIZE,
  gridRows = GRID_SIZE,
  onPixelPress,
  onPixelDrag,
}: PixelGridProps) {
  const lastCell = useRef<string | null>(null);
  const width = gridCols * cellSize;
  const height = gridRows * cellSize;

  const getCell = useCallback(
    (pageX: number, pageY: number, viewRef: View | null) => {
      if (!viewRef) return null;
      return new Promise<{ row: number; col: number } | null>((resolve) => {
        viewRef.measure((_x, _y, _w, _h, px, py) => {
          const localX = pageX - px;
          const localY = pageY - py;
          const col = Math.floor(localX / cellSize);
          const row = Math.floor(localY / cellSize);
          if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
            resolve({ row, col });
          } else {
            resolve(null);
          }
        });
      });
    },
    [cellSize, gridCols, gridRows]
  );

  const viewRef = useRef<View>(null);

  const handleTouch = useCallback(
    async (pageX: number, pageY: number, isDrag: boolean) => {
      const cell = await getCell(pageX, pageY, viewRef.current);
      if (!cell) return;
      const key = `${cell.row}_${cell.col}`;
      if (isDrag && key === lastCell.current) return;
      lastCell.current = key;
      if (isDrag && onPixelDrag) {
        onPixelDrag(cell.row, cell.col);
      } else if (!isDrag) {
        onPixelPress(cell.row, cell.col);
      }
    },
    [getCell, onPixelPress, onPixelDrag]
  );

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= gridCols; i++) {
    gridLines.push(
      <Line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={height} stroke={Colors.navyLight} strokeWidth={0.5} opacity={0.3} />
    );
  }
  for (let i = 0; i <= gridRows; i++) {
    gridLines.push(
      <Line key={`h${i}`} x1={0} y1={i * cellSize} x2={width} y2={i * cellSize} stroke={Colors.navyLight} strokeWidth={0.5} opacity={0.3} />
    );
  }

  // Pixel rects
  const rects: React.ReactNode[] = [];
  pixels.forEach((data, key) => {
    const [r, c] = key.split("_").map(Number);
    if (!isNaN(r) && !isNaN(c)) {
      rects.push(
        <MemoRect key={key} x={c * cellSize} y={r * cellSize} size={cellSize} color={data.color} />
      );
    }
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={Colors.navyDeep} />
        {gridLines}
        {rects}
      </Svg>
      <View
        ref={viewRef}
        style={[StyleSheet.absoluteFill, { width, height }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderStart={(e) => {
          lastCell.current = null;
          handleTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, false);
        }}
        onResponderMove={(e) => {
          handleTouch(e.nativeEvent.pageX, e.nativeEvent.pageY, true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 4,
  },
});

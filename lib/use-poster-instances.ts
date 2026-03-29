// lib/use-poster-instances.ts
import { DesignId, PosterInstance } from "@/constants/poster-designs";
import { db, onValue, ref } from "@/lib/firebase";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook: reads all calibrated poster instances from Firebase.
 * Returns instances for map rendering + a proximity resolver for scan validation.
 */
export function usePosterInstances() {
  const [instances, setInstances] = useState<PosterInstance[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const instancesRef = ref(db, "posterInstances");
    const unsub = onValue(instancesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list: PosterInstance[] = Object.entries(data).map(
          ([id, val]: [string, any]) => ({
            id,
            designId: val.designId,
            displayName: val.displayName || "Unnamed",
            lat: val.lat,
            lng: val.lng,
            calibratedAt: val.calibratedAt || 0,
            accuracy: val.accuracy || 99,
          })
        );
        setInstances(list);
      } else {
        setInstances([]);
      }
      setIsLoaded(true);
    });
    return () => unsub();
  }, []);

  /**
   * Given a designId (from Claude Vision) and user GPS coords,
   * find the nearest physical instance of that design.
   * Returns { instance, distance } or null if none found within maxDistance.
   */
  const resolveNearestInstance = useCallback(
    (
      designId: DesignId,
      userLat: number,
      userLng: number,
      maxDistanceMeters: number = 25
    ): { instance: PosterInstance; distance: number } | null => {
      // Filter instances matching this design
      const candidates = instances.filter((i) => i.designId === designId);
      if (candidates.length === 0) return null;

      let nearest: PosterInstance | null = null;
      let nearestDist = Infinity;

      for (const inst of candidates) {
        const dist = haversineMeters(userLat, userLng, inst.lat, inst.lng);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = inst;
        }
      }

      if (!nearest || nearestDist > maxDistanceMeters) return null;

      return { instance: nearest, distance: Math.round(nearestDist * 10) / 10 };
    },
    [instances]
  );

  return {
    instances,
    instanceCount: instances.length,
    isLoaded,
    resolveNearestInstance,
  };
}

/**
 * Haversine distance in meters between two GPS coords.
 */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
import { useState, useEffect, useCallback } from "react";
import { db, ref, onValue, runTransaction, serverTimestamp, set } from "./firebase";

const TOKEN_CAP = 2000;
const REFILL_RATE = 20; // per minute
const REFILL_INTERVAL = 60_000; // 1 minute

export function useTokens(uid: string | null) {
  const [tokens, setTokens] = useState(100);

  // Listen to token balance in real-time
  useEffect(() => {
    if (!uid) return;
    const tokensRef = ref(db, `users/${uid}/tokens`);
    const unsub = onValue(tokensRef, (snap) => {
      const val = snap.val();
      if (typeof val === "number") setTokens(val);
    });
    return () => unsub();
  }, [uid]);

  // Token regeneration timer
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => {
      const tokensRef = ref(db, `users/${uid}/tokens`);
      runTransaction(tokensRef, (current) => {
        if (current === null) return 100;
        if (current >= TOKEN_CAP) return current;
        return Math.min(current + REFILL_RATE, TOKEN_CAP);
      });
    }, REFILL_INTERVAL);
    return () => clearInterval(interval);
  }, [uid]);

  const spend = useCallback(async (amount: number): Promise<boolean> => {
    if (!uid) return false;
    const tokensRef = ref(db, `users/${uid}/tokens`);
    const result = await runTransaction(tokensRef, (current) => {
      if (current === null || current < amount) return; // abort
      return current - amount;
    });
    return result.committed;
  }, [uid]);

  const canAfford = useCallback((amount: number) => tokens >= amount, [tokens]);

  const grant = useCallback(async (amount: number) => {
    if (!uid) return;
    const tokensRef = ref(db, `users/${uid}/tokens`);
    await runTransaction(tokensRef, (current) => {
      if (current === null) return amount;
      return Math.min(current + amount, TOKEN_CAP);
    });
  }, [uid]);

  return { tokens, spend, canAfford, grant, TOKEN_CAP };
}

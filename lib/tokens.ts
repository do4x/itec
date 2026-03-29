import { useState, useEffect, useCallback } from "react";
import { auth, db, ref, onValue, runTransaction } from "./firebase";

export const TOKEN_CAP = 2000;
export const REFILL_RATE = 20; // per minute
const REFILL_INTERVAL = 60_000; // 1 minute

export function useTokens(uid: string | null) {
  const [tokens, setTokens] = useState(200);
  const [nextRefillIn, setNextRefillIn] = useState(REFILL_INTERVAL / 1000);

  // Listen to token balance in real-time + initialize to 200 if missing
  useEffect(() => {
    if (!uid) return;
    const tokensRef = ref(db, `users/${uid}/tokens`);
    const unsub = onValue(tokensRef, (snap) => {
      const val = snap.val();
      if (typeof val === "number") {
        setTokens(val);
        if (val < 200) {
          runTransaction(tokensRef, (current) =>
            current !== null && current < 200 ? 200 : current
          );
        }
      } else {
        runTransaction(tokensRef, (current) => (current === null ? 200 : current));
      }
    });
    return () => unsub();
  }, [uid]);

  // Token regeneration + countdown timer (synced)
  useEffect(() => {
    if (!uid) return;

    setNextRefillIn(REFILL_INTERVAL / 1000);

    // 1-second countdown
    const tick = setInterval(() => {
      setNextRefillIn((prev) => (prev <= 1 ? REFILL_INTERVAL / 1000 : prev - 1));
    }, 1000);

    // Actual refill every minute (synced with countdown reset above)
    const refill = setInterval(() => {
      const tokensRef = ref(db, `users/${uid}/tokens`);
      runTransaction(tokensRef, (current) => {
        if (current === null) return 200;
        if (current >= TOKEN_CAP) return current;
        return Math.min(current + REFILL_RATE, TOKEN_CAP);
      });
    }, REFILL_INTERVAL);

    return () => {
      clearInterval(tick);
      clearInterval(refill);
    };
  }, [uid]);

  const spend = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!uid || auth.currentUser?.isAnonymous) return false;
      const tokensRef = ref(db, `users/${uid}/tokens`);
      const result = await runTransaction(tokensRef, (current) => {
        const balance = current === null ? 200 : current;
        if (balance < amount) return; // abort — insufficient
        return balance - amount;
      });
      return result.committed;
    },
    [uid]
  );

  const canAfford = useCallback((amount: number) => tokens >= amount, [tokens]);

  const grant = useCallback(
    async (amount: number) => {
      if (!uid) return;
      const tokensRef = ref(db, `users/${uid}/tokens`);
      await runTransaction(tokensRef, (current) => {
        if (current === null) return amount;
        return Math.min(current + amount, TOKEN_CAP);
      });
    },
    [uid]
  );

  return { tokens, spend, canAfford, grant, TOKEN_CAP, REFILL_RATE, nextRefillIn };
}

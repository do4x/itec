import { useState, useEffect } from "react";
import { auth, signInAnonymously, onAuthStateChanged } from "./firebase";

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        setIsReady(true);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setUid(cred.user.uid);
          setIsReady(true);
        } catch (err: any) {
          console.error("[Auth] Anonymous sign-in failed:", err?.code, err?.message);
          setIsReady(true);
        }
      }
    });
    return unsubscribe;
  }, []);

  return { uid, isReady };
}

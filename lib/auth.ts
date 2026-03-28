import { useState, useEffect } from "react";
import { auth, signInAnonymously, onAuthStateChanged } from "./firebase";

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setIsReady(true);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  return { uid, isReady };
}

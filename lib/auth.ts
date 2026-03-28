import { useState, useEffect, useCallback } from "react";
import {
  auth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "./firebase";

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setIsGuest(user.isAnonymous);
        setIsAuthenticated(!user.isAnonymous);
      } else {
        setUid(null);
        setIsGuest(false);
        setIsAuthenticated(false);
      }
      setIsReady(true);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const loginAsGuest = useCallback(async () => {
    await signInAnonymously(auth);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { uid, isReady, isGuest, isAuthenticated, loginWithEmail, registerWithEmail, loginAsGuest, logout };
}

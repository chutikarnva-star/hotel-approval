"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getClientAuth, getGoogleProvider } from "./firebase";
import { isAllowedEmail } from "./email-domain";

interface AuthState {
  loading: boolean;
  user: User | null;
  idToken: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !isAllowedEmail(firebaseUser.email)) {
        await signOut(auth);
        setUser(null);
        setIdToken(null);
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        setIdToken(await firebaseUser.getIdToken());
      } else {
        setUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signIn() {
    await signInWithPopup(getClientAuth(), getGoogleProvider());
  }

  async function signOutUser() {
    await signOut(getClientAuth());
  }

  return (
    <AuthContext.Provider value={{ loading, user, idToken, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

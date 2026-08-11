import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

function firebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Missing Firebase client env vars: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    );
  }

  return { apiKey, authDomain, projectId };
}

let cachedAuth: Auth | null = null;

export function getClientAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig());
  cachedAuth = getAuth(app);
  return cachedAuth;
}

let cachedProvider: GoogleAuthProvider | null = null;

export function getGoogleProvider(): GoogleAuthProvider {
  if (cachedProvider) return cachedProvider;
  cachedProvider = new GoogleAuthProvider();
  cachedProvider.setCustomParameters({ prompt: "select_account" });
  return cachedProvider;
}

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { isAllowedEmail } from "./email-domain";

let cachedApp: App | null = null;

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    cachedApp = initializeApp({ projectId });
  }

  return cachedApp;
}

export interface AuthUser {
  id: string;
  email: string;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length);

    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    if (!decoded.email || !isAllowedEmail(decoded.email)) return null;

    return { id: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export async function requireAuthUser(request: Request): Promise<AuthUser | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

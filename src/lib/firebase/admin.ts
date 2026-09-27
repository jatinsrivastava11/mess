// Firebase Admin SDK: server only. It bypasses security rules, so it must
// never be imported from a "use client" file.
import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (useEmulators) {
    // `npm run dev:online` sets these; the defaults cover `npm run emulators` + `npm run dev`.
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }

  const key = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  return initializeApp({ credential: cert(JSON.parse(key)) });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());

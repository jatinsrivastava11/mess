// Firebase in the browser: sign-in and live game updates.
"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { type Firestore, connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// NEXT_PUBLIC_ values are baked into the page at build time. They identify the
// project but grant nothing on their own: the security rules decide access.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const onlineAvailable = Boolean(config.apiKey && config.projectId);

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function firebase() {
  if (cached) return cached;
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true") {
    const host = window.location.hostname; // lets a phone on the same Wi-Fi reach the emulators too
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }
  cached = { app, auth, db };
  return cached;
}

/** The signed-in user, signing in anonymously if needed. Accounts will upgrade this same user later. */
export async function currentUser() {
  const { auth } = firebase();
  await auth.authStateReady();
  return auth.currentUser ?? (await signInAnonymously(auth)).user;
}

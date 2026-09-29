"use client";

import {
  EmailAuthProvider,
  type User,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { api } from "../firebase/api";
import { currentUser, firebase, onlineAvailable } from "../firebase/client";
import { passwordProblem, usernameProblem } from "./username";

export interface Profile {
  username: string;
  wins: number;
}

/** Friendly messages for Firebase Auth errors. Sign-in failures stay vague on purpose, so nobody can probe which emails have accounts. */
export function authMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "Wrong email or password.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/email-already-in-use": "Couldn't create an account with that email. Try signing in instead.",
    "auth/credential-already-in-use": "Couldn't create an account with that email. Try signing in instead.",
    "auth/weak-password": "That password is too weak.",
    "auth/password-does-not-meet-requirements": "That password is too weak.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "Network problem. Check your connection.",
    "auth/requires-recent-login": "Please sign in again first.",
  };
  return messages[code] ?? (err instanceof Error && !code ? err.message : "Something went wrong. Try again.");
}

/** The signed-in account (if any) and its public profile, kept live. */
export function useAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!onlineAvailable);
  const [profile, setProfile] = useState<{ uid: string; data: Profile | null } | null>(null);
  // Bumped after user.reload() so a fresh emailVerified value re-renders.
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!onlineAvailable) return;
    return onAuthStateChanged(firebase().auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const uid = user && !user.isAnonymous ? user.uid : null;
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(firebase().db, "users", uid),
      (snap) => setProfile({ uid, data: snap.exists() ? (snap.data() as Profile) : null }),
      () => setProfile({ uid, data: null }),
    );
  }, [uid]);

  const hasAccount = uid !== null;
  const myProfile = profile && profile.uid === uid ? profile.data : null;
  const profileLoaded = !hasAccount || (profile !== null && profile.uid === uid);

  async function claimUsername(username: string) {
    const problem = usernameProblem(username);
    if (problem) throw new Error(problem);
    await api("/api/account/username", { username });
  }

  /** Turns the current guest into an account (keeping any game in progress), then claims the username. */
  async function signUp(username: string, email: string, password: string) {
    const problem = usernameProblem(username) ?? passwordProblem(password);
    if (problem) throw new Error(problem);
    const { available } = await api("/api/account/username", { username, check: true });
    if (!available) throw new Error("That username is taken.");

    const me = await currentUser();
    if (!me.isAnonymous) throw new Error("Sign out first.");
    try {
      await linkWithCredential(me, EmailAuthProvider.credential(email.trim(), password));
    } catch (err) {
      throw new Error(authMessage(err));
    }
    await me.getIdToken(true);
    setVersion((v) => v + 1); // same user object, now no longer anonymous
    await sendEmailVerification(me).catch(() => {}); // the account works either way; they can resend
    await claimUsername(username);
  }

  async function signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(firebase().auth, email.trim(), password);
    } catch (err) {
      throw new Error(authMessage(err));
    }
  }

  async function signOut() {
    await firebaseSignOut(firebase().auth);
  }

  /** Always "succeeds" from the user's point of view, so it doesn't reveal whether the email has an account. */
  async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(firebase().auth, email.trim());
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/invalid-email" || code === "auth/too-many-requests" || code === "auth/network-request-failed") {
        throw new Error(authMessage(err));
      }
    }
  }

  async function resendVerification() {
    if (!user) return;
    try {
      await sendEmailVerification(user);
    } catch (err) {
      throw new Error(authMessage(err));
    }
  }

  /** Re-checks the account (e.g. after clicking the verification link). */
  async function refresh() {
    if (!user) return;
    await user.reload();
    await user.getIdToken(true);
    setVersion((v) => v + 1);
  }

  return {
    ready,
    user,
    hasAccount,
    email: hasAccount ? user?.email ?? null : null,
    verified: hasAccount && Boolean(user?.emailVerified),
    profile: myProfile,
    profileLoaded,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendVerification,
    refresh,
    claimUsername,
  };
}

export type Account = ReturnType<typeof useAccount>;

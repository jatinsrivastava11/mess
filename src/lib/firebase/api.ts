"use client";

import { currentUser } from "./client";

/** POSTs to one of our API routes as the current user (signing in as a guest if needed). */
export async function api(path: string, body: Record<string, unknown>) {
  const user = await currentUser();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return { ...data, uid: user.uid };
}

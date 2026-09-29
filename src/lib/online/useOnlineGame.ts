"use client";

import { doc as docRef, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TimeControl } from "../game/clock";
import type { Color } from "../game/engine";
import { api } from "../firebase/api";
import { currentUser, firebase } from "../firebase/client";
import { type GameDoc, colorOf } from "./game-doc";

const SAVED_GAME_KEY = "mess-online-game";

function saveCode(code: string | null) {
  try {
    if (code) localStorage.setItem(SAVED_GAME_KEY, code);
    else localStorage.removeItem(SAVED_GAME_KEY);
  } catch {}
}

/**
 * One online game: create/join it, then follow it live. The browser only ever
 * reads the game from Firestore; every change goes through /api/games so the
 * server can check it.
 */
export function useOnlineGame() {
  const [code, setCode] = useState<string | null>(null);
  const [game, setGame] = useState<GameDoc | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Server time minus local time, so both players' clocks show the same thing.
  const offset = useRef(0);

  // Follow the game live.
  useEffect(() => {
    if (!code) return;
    return onSnapshot(
      docRef(firebase().db, "games", code),
      (snap) => snap.exists() && setGame(snap.data() as GameDoc),
      () => setCode(null), // e.g. no longer allowed to read it
    );
  }, [code]);

  // After a refresh, pick the game back up (the anonymous user survives reloads).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SAVED_GAME_KEY);
    } catch {}
    if (!saved) return;
    currentUser().then(
      (user) => {
        setUid(user.uid);
        setCode(saved);
      },
      () => saveCode(null),
    );
  }, []);

  const call = useCallback(async (path: string, body: Record<string, unknown>) => {
    const sent = Date.now();
    const data = await api(path, body);
    setUid(data.uid);
    if (typeof data.serverNow === "number") offset.current = data.serverNow - (sent + Date.now()) / 2;
    return data;
  }, []);

  const withBusy = useCallback(
    async <T>(fn: () => Promise<T>) => {
      setBusy(true);
      try {
        return await fn();
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const create = (minutes: TimeControl) =>
    withBusy(async () => {
      const { code } = await call("/api/games", { minutes });
      setGame(null);
      setCode(code);
      saveCode(code);
    });

  const join = (raw: string) =>
    withBusy(async () => {
      const c = raw.trim().toUpperCase();
      await call(`/api/games/${c}`, { action: "join" });
      setGame(null);
      setCode(c);
      saveCode(c);
    });

  const move = (from: number, to: number) =>
    call(`/api/games/${code}`, { action: "move", from, to, ply: game?.moves.length ?? 0 });
  const resign = () => call(`/api/games/${code}`, { action: "resign" });
  const flag = () => call(`/api/games/${code}`, { action: "flag" });

  function leave() {
    setCode(null);
    setGame(null);
    saveCode(null);
  }

  const serverNow = useCallback(() => Date.now() + offset.current, []);
  const color: Color | null = game && uid ? colorOf(game, uid) : null;
  return { code, game, color, busy, serverNow, create, join, move, resign, flag, leave };
}

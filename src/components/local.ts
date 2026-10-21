"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

// Small things kept on this device only (localStorage), as in ことのあめ: how the learner likes to hear and read
// (sound, speed, translations), and half-written sentences. Never anything that must persist: the browser may drop
// it, and every reader falls back to the default.

const EVENT = "english:local";
const PREFIX = "english:";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null || value === "") window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Private mode or storage switched off: the value simply is not kept.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function useLocal(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

/** An on/off preference remembered on this device. */
export function usePref(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const raw = useLocal(key);
  const set = useCallback((value: boolean) => write(key, value ? "1" : "0"), [key]);
  return [raw === null ? fallback : raw === "1", set];
}

/** One of a few named choices remembered on this device. */
export function useChoice<T extends string>(key: string, choices: readonly T[], fallback: T): [T, (value: T) => void] {
  const raw = useLocal(key);
  const set = useCallback((value: T) => write(key, value), [key]);
  return [(choices as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback, set];
}

/** Read outside React (the player). */
export function prefNow(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = read(key);
  return raw === null ? fallback : raw === "1";
}

export function choiceNow(key: string, fallback: string): string {
  return (typeof window !== "undefined" && read(key)) || fallback;
}

/**
 * A text field's draft, kept on this device while the learner types, so leaving for another expression or another
 * screen never loses it. `clear` after it was sent; `restore` puts it back when sending failed.
 */
export function useDraft(key: string) {
  const storageKey = `draft:${key}`;
  const saved = useLocal(storageKey) ?? "";
  // null until the learner types here: until then the field shows what was saved.
  const [typed, setTyped] = useState<{ key: string; text: string } | null>(null);
  const value = typed && typed.key === key ? typed.text : saved;
  const change = useCallback(
    (next: string) => {
      setTyped({ key, text: next });
      write(storageKey, next);
    },
    [key, storageKey],
  );
  const clear = useCallback(() => change(""), [change]);
  return { value, change, clear };
}

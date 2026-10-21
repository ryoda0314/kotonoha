"use client";

// Playback, one sound at a time across the app. A prepared line plays its clip (public/audio, by line id); English the
// app's AI wrote plays through /api/say with the signature it came with (fetched once, kept for the session). Either
// way, when nothing can be played the browser's own voice reads it.
import { useSyncExternalStore } from "react";
import manifest from "@/content/audio.json";
import { choiceNow } from "./local";

export type Sound = { line: string } | { sig: string; voice: string };

export const SPEEDS = ["0.8", "1"] as const;
export type Speed = (typeof SPEEDS)[number];

const clips = manifest as Record<string, string>;
let el: HTMLAudioElement | null = null;
let turn = 0;
let playing: string | null = null;
const listeners = new Set<() => void>();
const made = new Map<string, Promise<string | null>>();

function setPlaying(key: string | null) {
  playing = key;
  listeners.forEach((l) => l());
}

/** The key of what is playing now (for a button to show it), null when quiet. */
export function usePlaying(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => playing,
    () => null,
  );
}

export function soundKey(sound: Sound | null, text: string): string {
  return sound && "line" in sound ? sound.line : `${sound && "voice" in sound ? sound.voice : ""}:${text}`;
}

export function hasClip(line: string): boolean {
  return Boolean(clips[line]);
}

function said(text: string, sig: string, voice: string): Promise<string | null> {
  const key = `${voice}\n${text}`;
  let job = made.get(key);
  if (!job) {
    job = fetch("/api/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, sig, voice }) })
      .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
      .catch(() => null)
      .then((url) => {
        if (!url) made.delete(key); // asked for again next time
        return url;
      });
    made.set(key, job);
  }
  return job;
}

/** Fetches what will be played soon, so it starts at once. */
export function prepare(items: { sound: Sound | null; text: string }[]): void {
  for (const { sound, text } of items) if (sound && "sig" in sound) void said(text, sound.sig, sound.voice);
}

async function source(sound: Sound | null, text: string): Promise<string | null> {
  if (!sound) return null;
  if ("line" in sound) return clips[sound.line] ? `/audio/${clips[sound.line]}` : null;
  return said(text, sound.sig, sound.voice);
}

function rate(): number {
  return Number(choiceNow("speed", "1")) || 1;
}

function untilEnd(audio: HTMLAudioElement, mine: number): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
      clearInterval(check);
      resolve(ok);
    };
    const onEnd = () => done(true);
    const onError = () => done(false);
    // Stopped or replaced: finish quietly.
    const check = setInterval(() => {
      if (turn !== mine) done(false);
    }, 100);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
  });
}

function speakWithBrowser(text: string, mine: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearInterval(check);
      resolve(ok);
    };
    u.onend = () => done(true);
    u.onerror = () => done(false);
    const check = setInterval(() => {
      if (turn !== mine) {
        window.speechSynthesis.cancel();
        done(false);
      }
    }, 100);
    window.speechSynthesis.speak(u);
    // Some browsers never say they have finished.
    setTimeout(() => done(true), 4000 + text.length * 120);
  });
}

/** Call inside a tap: lets the page play sound from then on (mobile browsers ask for a tap first). */
export function unlock(): void {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
  }
}

export function stop(): void {
  turn++;
  el?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  setPlaying(null);
}

/** Plays one sentence to its end. False if it was stopped, replaced, or nothing could play it. */
export async function play(sound: Sound | null, text: string): Promise<boolean> {
  unlock();
  const mine = ++turn;
  el!.pause();
  window.speechSynthesis?.cancel();
  const key = soundKey(sound, text);
  setPlaying(key);
  const src = await source(sound, text);
  if (turn !== mine) return false;
  let ok = false;
  if (src) {
    const audio = el!;
    audio.src = src;
    audio.defaultPlaybackRate = rate();
    audio.playbackRate = rate();
    try {
      await audio.play();
      ok = await untilEnd(audio, mine);
    } catch {
      ok = false;
    }
  }
  if (!ok && turn === mine) ok = await speakWithBrowser(text, mine);
  if (turn === mine) setPlaying(null);
  return ok && turn === mine;
}

/** Sentences one after another, `gapMs` apart; `onStart(i)` as each begins. Stops early (false) when interrupted. */
export async function playInTurn(items: { sound: Sound | null; text: string }[], onStart?: (i: number) => void, gapMs = 450): Promise<boolean> {
  for (let i = 0; i < items.length; i++) {
    const mine = turn + 1;
    onStart?.(i);
    if (!(await play(items[i].sound, items[i].text)) && turn !== mine) return false;
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, gapMs));
      if (turn !== mine) return false;
    }
  }
  return true;
}

export type Item = { sound: Sound | null; text: string };

/** A partner's reply as what to play: its signed sentences when it has them, else the whole text. */
export function replyItems(turn: { text: string; sig?: string; parts?: { text: string; sig: string }[] }, voice: string): Item[] {
  if (turn.parts?.length) return turn.parts.map((p) => ({ sound: { sig: p.sig, voice }, text: p.text }));
  return [{ sound: turn.sig ? { sig: turn.sig, voice } : null, text: turn.text }];
}

/** Sentences asked for all at once and played one after another: the first is heard while the rest are being made. */
export function playAll(items: Item[]): Promise<boolean> {
  prepare(items);
  return items.length === 1 ? play(items[0].sound, items[0].text) : playInTurn(items, undefined, 150);
}

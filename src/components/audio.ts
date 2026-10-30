"use client";

// Playback, one sound at a time across the app. A prepared line plays its clip (public/audio, by line id); English the
// app's AI wrote plays through /api/say with the signature it came with (fetched once, kept for the session). Only
// Gemini's voices are heard: when neither can play a sentence it stays silent, and the browser's own voice is never
// used (the maker asked for Gemini alone).
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

/** True when there is something to play: a prepared line's clip, or English the AI wrote with its signature. */
export function playable(sound: Sound | null): boolean {
  return Boolean(sound && ("line" in sound ? hasClip(sound.line) : sound.sig));
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
  setPlaying(null);
}

/** Plays one sentence to its end. False if it was stopped, replaced, or nothing could play it (then it stays silent). */
export async function play(sound: Sound | null, text: string): Promise<boolean> {
  unlock();
  const mine = ++turn;
  el!.pause();
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

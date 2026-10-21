"use client";

import { play, soundKey, stop, usePlaying, type Sound } from "./audio";
import { Icon } from "./Icon";
import styles from "./Speak.module.css";

/** Plays one sentence; pressed again while it plays, stops it. */
export function Speak({
  sound,
  text,
  label,
  size = "md",
  solid = false,
}: {
  sound: Sound | null;
  text: string;
  label: string;
  size?: "sm" | "md";
  solid?: boolean;
}) {
  const key = soundKey(sound, text);
  const playing = usePlaying() === key;
  return (
    <button
      type="button"
      className={[styles.button, styles[size], solid ? styles.solid : "", playing ? styles.playing : ""].join(" ")}
      onClick={() => (playing ? stop() : void play(sound, text))}
      aria-label={label}
      aria-pressed={playing}
    >
      <Icon name="speaker" size={size === "sm" ? 17 : 20} />
    </button>
  );
}

"use client";

import { play, playAll, soundKey, stop, usePlaying, type Item, type Sound } from "./audio";
import { Icon } from "./Icon";
import styles from "./Speak.module.css";

/** Plays one sentence (or a reply's sentences one after another); pressed again while it plays, stops it. */
export function Speak({
  sound,
  text,
  label,
  size = "md",
  solid = false,
  sequence,
}: {
  sound: Sound | null;
  text: string;
  label: string;
  size?: "sm" | "md";
  solid?: boolean;
  sequence?: Item[];
}) {
  const keys = sequence?.length ? sequence.map((x) => soundKey(x.sound, x.text)) : [soundKey(sound, text)];
  const now = usePlaying();
  const playing = now !== null && keys.includes(now);
  return (
    <button
      type="button"
      className={[styles.button, styles[size], solid ? styles.solid : "", playing ? styles.playing : ""].join(" ")}
      onClick={() => (playing ? stop() : void (sequence?.length ? playAll(sequence) : play(sound, text)))}
      aria-label={label}
      aria-pressed={playing}
    >
      <Icon name="speaker" size={size === "sm" ? 17 : 20} />
    </button>
  );
}

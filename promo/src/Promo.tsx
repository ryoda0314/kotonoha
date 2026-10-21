import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { f, prog } from "./anim";
import { TimelineContext, useTimeline } from "./context";
import { Doors } from "./scenes/Doors";
import { End } from "./scenes/End";
import { Gap } from "./scenes/Gap";
import { Hook } from "./scenes/Hook";
import { NameMark } from "./scenes/Mark";
import { Story } from "./scenes/Story";
import { C, FONT, useFonts } from "./theme";
import { AUDIO, makeTimeline, NARRATION, TYPE1, TYPE2, TYPE3 } from "./timeline";

/** Shown from `from` to `to` (frames), fading in and out over `fade` frames at either end. */
function Window({
  frame,
  from,
  to,
  fade = 12,
  fadeIn = true,
  fadeOut = true,
  children,
}: {
  frame: number;
  from: number;
  to: number;
  fade?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  children: React.ReactNode;
}) {
  if (frame < from || frame >= to) return null;
  const opacity = Math.min(fadeIn ? prog(frame, from, fade) : 1, fadeOut ? 1 - prog(frame, to - fade, fade) : 1);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

/** The film, with the narration or without (Root.tsx registers both). */
export function Promo({ narrated = false }: { narrated?: boolean }) {
  useFonts();
  const timeline = useMemo(() => makeTimeline(narrated), [narrated]);
  const { T, TOTAL } = timeline;
  const frame = useCurrentFrame();
  return (
    <TimelineContext.Provider value={timeline}>
      <AbsoluteFill style={{ background: C.paper, color: C.ink, fontFamily: FONT.ui, WebkitFontSmoothing: "antialiased" }}>
        <style>{"* { box-sizing: border-box; }"}</style>
        <Window frame={frame} from={0} to={T.gap.start + 8} fadeIn={false} fade={16}>
          <Hook frame={frame} />
        </Window>
        <Window frame={frame} from={T.gap.start - 8} to={T.title.start + 6} fade={14}>
          <Gap frame={frame} />
        </Window>
        <Window frame={frame} from={T.title.start} to={T.doors.start + 10} fade={14}>
          <NameMark frame={frame} start={T.title.drops} icon={T.title.icon} word={T.title.word} lead={T.title.lead} size={280} top={150} wordSize={104} leadSize={46} />
        </Window>
        <Window frame={frame} from={T.doors.start} to={T.doors.end + 1} fade={1}>
          <Doors frame={frame} />
        </Window>
        <Window frame={frame} from={T.scene.start} to={T.end.start + 10} fade={14} fadeIn={false}>
          <Story frame={frame} />
        </Window>
        <Window frame={frame} from={T.end.start} to={TOTAL} fade={20} fadeOut={false}>
          <End frame={frame} />
        </Window>
        <Sound />
      </AbsoluteFill>
    </TimelineContext.Provider>
  );
}

// ---- Sound: the app's voices, the narration, quiet music under them, and a few small sounds of the screen. --------

// Levels, measured (scripts/music.py writes music at about -13 LUFS; the app's clips are about -22, and the narration
// is levelled the same way by scripts/narration.mjs): voices brought up to about -16, the music about -22 on its own and
// some 14 dB under a voice.
const VOICE = 2;
const MUSIC = 0.37;
const UNDER_VOICE = 0.4;

function Clip({ from, src, volume = 1, frames }: { from: number; src: string; volume?: number; frames?: number }) {
  return (
    <Sequence from={from} durationInFrames={frames} layout="none">
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
}

function Sound() {
  const { T, TOTAL, VOICES, SAID, narrated } = useTimeline();
  // Whenever anyone speaks, in English or in the narration, the music steps back.
  const spans = useMemo(
    () => [
      ...VOICES.map((v) => [v.from, v.from + f(AUDIO[v.id].seconds)] as const),
      ...SAID.map((s) => [s.from, s.from + f(NARRATION[s.id].seconds)] as const),
    ],
    [VOICES, SAID],
  );
  const musicVolume = (frame: number) => {
    let duck = 0;
    for (const [a, b] of spans) {
      duck = Math.max(duck, interpolate(frame, [a - 10, a, b, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }
    const ends = interpolate(frame, [0, 20, TOTAL - 75, TOTAL - 4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return MUSIC * (1 - (1 - UNDER_VOICE) * duck) * ends;
  };
  const taps = [T.hook.press, T.detail.press, T.sheet.press, T.tryIt.press];
  const sends = [T.scene.send, T.tryIt.send, T.own.send];
  const typing: [number, number][] = [
    [T.scene.type, TYPE1.duration],
    [T.tryIt.type, TYPE2.duration],
    [T.own.type, TYPE3.duration],
  ];
  const drops = [T.hook.line1, T.hook.line2, T.hook.line3];
  return (
    <>
      <Audio src={staticFile(narrated ? "sound/music-narration.wav" : "sound/music.wav")} volume={musicVolume} />
      {VOICES.map((v) => (
        <Clip key={v.id} from={v.from} src={AUDIO[v.id].src} volume={VOICE} />
      ))}
      {SAID.map((s) => (
        <Clip key={`${s.id}@${s.from}`} from={s.from} src={NARRATION[s.id].src} volume={VOICE} />
      ))}
      {drops.map((at, i) => (
        <Clip key={`d${at}`} from={at} src={`sound/drop${(i % 3) + 1}.wav`} volume={0.4} />
      ))}
      {[0, 4, 7].map((delay, i) => (
        <Clip key={`t${delay}`} from={T.title.drops + delay + 14} src={`sound/drop${i + 1}.wav`} volume={0.3} />
      ))}
      {[0, 4, 7].map((delay, i) => (
        <Clip key={`e${delay}`} from={T.end.start + delay + 14} src={`sound/drop${i + 1}.wav`} volume={0.26} />
      ))}
      {taps.map((at) => (
        <Clip key={`p${at}`} from={at - 2} src="sound/tap.wav" volume={0.5} />
      ))}
      {sends.map((at) => (
        <Clip key={`s${at}`} from={at - 2} src="sound/send.wav" volume={0.45} />
      ))}
      {typing.map(([at, dur]) => (
        <Clip key={`k${at}`} from={at} frames={dur + 2} src="sound/typing.wav" volume={0.6} />
      ))}
      <Clip from={T.later.violet} src="sound/chime.wav" volume={0.3} />
      <Clip from={T.own.me + 8} src="sound/chime.wav" volume={0.3} />
    </>
  );
}

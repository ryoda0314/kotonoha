// How English is voiced, the same for the prepared lines (scripts/generate-audio.mjs) and for what the app's AI
// writes (/api/say), so a partner sounds the same in a scene and in a conversation. Every voice is a Google one,
// "google:<Gemini voice>" (src/lib/tts.ts).

// Part of every clip's name (scripts/generate-audio.mjs). Clips are cached as immutable by name, so when the way lines
// are voiced changes (2: both providers' speech tidied, src/lib/pcm.ts), this changes, every name changes, and every
// line is voiced again instead of a new sound hiding behind an old name.
export const VOICING = "2";

// Google voices: Gemini 3.1 Flash TTS on Vertex AI, in ことのあめ's project. Its quota is per model, so it is not the one
// ことのあめ's live voice (2.5 Pro) or ことのおと's scripts (2.5 Flash) draw on. Of the three it was also the quickest
// (1.8 s for a six-word line).
export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

// Before the line, as in ことのあめ. Checked on a short line that it is not read aloud: six words came out as 2.0 s.
export const GEMINI_INSTRUCTION = "Say this the way a friend would in a relaxed chat, at a natural pace:\n";

// Words per second of an everyday pace (ことのあめ's range for English). Gemini's pace changes from one take to the next:
// a take outside it is made again.
export const PACE_RANGE: [number, number] = [1.5, 3.6];

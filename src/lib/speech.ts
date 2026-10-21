// How English is voiced, the same for the prepared lines (scripts/generate-audio.mjs) and for what the app's AI
// writes (/api/say), so a partner sounds the same in a scene and in a conversation.
export const TTS_MODEL = "gpt-4o-mini-tts";

// A natural, everyday pace. Asking for a pace "for learners" overshoots into slow, careful speech; the learner can
// slow a clip down on the device instead.
export const TTS_INSTRUCTIONS =
  "Speak as a university student chatting with a friend: relaxed, warm and clear, at a natural everyday pace. Read only the text.";

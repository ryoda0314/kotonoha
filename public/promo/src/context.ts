import { createContext, useContext } from "react";
import type { Timeline } from "./timeline";

/** The timeline of the version being made (with the narration or without), given by the film's root. */
export const TimelineContext = createContext<Timeline | null>(null);

export function useTimeline(): Timeline {
  const timeline = useContext(TimelineContext);
  if (!timeline) throw new Error("no timeline: render inside <Promo>");
  return timeline;
}

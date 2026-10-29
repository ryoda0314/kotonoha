import { Composition } from "remotion";
import { FPS } from "./anim";
import { Promo } from "./Promo";
import { makeTimeline } from "./timeline";

// The film without words spoken over it (captions only), and with the narration (scripts/narration-lines.json).
export function Root() {
  return (
    <>
      <Composition id="Promo" component={Promo} durationInFrames={makeTimeline(false).TOTAL} fps={FPS} width={1920} height={1080} defaultProps={{ narrated: false }} />
      <Composition
        id="PromoNarration"
        component={Promo}
        durationInFrames={makeTimeline(true).TOTAL}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ narrated: true }}
      />
    </>
  );
}

// B. 読めば分かる。なのに、言おうとすると出てこない。 The empty field, and then what the app's own field says to that.
import { fall, prog } from "../anim";
import { FONT } from "../theme";
import { useTimeline } from "../context";
import { Composer } from "../ui";

const ZOOM = 1.8;
const W = 1000 / ZOOM;

export function Gap({ frame }: { frame: number }) {
  const t = useTimeline().T.gap;
  const blink = Math.floor((frame - t.l2) / 16) % 2 === 0;
  const line = { margin: 0, fontSize: 64, fontWeight: 600, lineHeight: 1.45, letterSpacing: "0.01em", fontFamily: FONT.ja } as const;
  return (
    <>
      <div style={{ position: "absolute", top: 292, left: 0, right: 0, textAlign: "center" }}>
        <p style={{ ...line, ...fall(frame, t.l1, 18, 18) }}>読めば、分かる。</p>
        <p style={{ ...line, ...fall(frame, t.l2, 18, 18) }}>なのに、言おうとすると出てこない。</p>
      </div>
      <div style={{ position: "absolute", top: 640, left: (1920 - W * ZOOM) / 2, ...fall(frame, t.l2 + 10, 10, 18) }}>
        <div style={{ width: W, transform: `scale(${ZOOM})`, transformOrigin: "0 0" }}>
          <Composer bare text="" caret={blink} placeholderOpacity={prog(frame, t.hint, 18)} />
        </div>
      </div>
    </>
  );
}

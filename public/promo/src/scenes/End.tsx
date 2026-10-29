// M. The name again, the line under it, and how to begin (the app's first screen: はじめる, 登録はいりません).
import { fall } from "../anim";
import { C, FONT } from "../theme";
import { useTimeline } from "../context";
import { Btn, Icon, type IconName } from "../ui";
import { NameMark } from "./Mark";

const DOORS: [IconName, string][] = [
  ["meet", "出会う"],
  ["talk", "話す"],
  ["scene", "場面で言う"],
];

export function End({ frame }: { frame: number }) {
  const e = useTimeline().T.end;
  return (
    <>
      <NameMark frame={frame} start={e.start} icon={e.icon} word={e.word} lead={e.lead} size={210} top={120} wordSize={88} leadSize={40} />
      <div style={{ position: "absolute", top: 610, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 44, ...fall(frame, e.lead + 8, 10, 16) }}>
        {DOORS.map(([icon, name]) => (
          <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 28, color: C.ink2, fontFamily: FONT.ja }}>
            <Icon name={icon} size={30} stroke={1.7} />
            {name}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", top: 730, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, ...fall(frame, e.rest, 14, 18) }}>
        <Btn style={{ minWidth: 360, minHeight: 80, fontSize: 30, borderRadius: 18 }}>はじめる</Btn>
        <p style={{ margin: 0, fontSize: 25, color: C.muted, fontFamily: FONT.ja }}>登録はいりません。記録はこの端末に残ります。</p>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { ja } from "@/lib/i18n/ja";
import { Meet } from "./_meet/Meet";

export const metadata: Metadata = { title: ja.nav.meet };

export default function MeetPage() {
  return <Meet />;
}

import type { Metadata } from "next";
import { ja } from "@/lib/i18n/ja";
import { Talk } from "./Talk";

export const metadata: Metadata = { title: ja.nav.talk };

export default function TalkPage() {
  return <Talk />;
}

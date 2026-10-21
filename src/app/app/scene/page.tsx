import type { Metadata } from "next";
import { ja } from "@/lib/i18n/ja";
import { ScenePage } from "./ScenePage";

export const metadata: Metadata = { title: ja.nav.scene };

export default function Page() {
  return <ScenePage />;
}

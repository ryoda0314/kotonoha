import type { Metadata } from "next";
import { ja } from "@/lib/i18n/ja";
import { ThreadLook } from "./ThreadLook";

export const metadata: Metadata = { title: ja.me.title };

export default async function ThreadPage({ params }: PageProps<"/app/me/t/[id]">) {
  const { id } = await params;
  return <ThreadLook id={id} />;
}

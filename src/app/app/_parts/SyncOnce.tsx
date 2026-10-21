"use client";

import { useEffect } from "react";
import { syncRecord } from "@/lib/sync";

/** When the app opens, the account's copy of the record (if signed in) is merged in once; later saves follow it. */
export function SyncOnce() {
  useEffect(() => {
    void syncRecord();
  }, []);
  return null;
}

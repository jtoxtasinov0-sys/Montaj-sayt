"use client";

import { useEffect } from "react";
import { PRESENCE_PING_MS } from "@/lib/constants";

/** Kirgan foydalanuvchi sahifani ochib turganda har daqiqada signal yuboradi — boshqalarga "onlayn" ko'rinadi */
export function PresencePing() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };
    const id = setInterval(ping, PRESENCE_PING_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}

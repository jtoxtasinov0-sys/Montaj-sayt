"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sahifani har N soniyada yangilaydi (masalan to'lov avtomatik tasdiqlanganini ko'rsatish uchun). Yashirin tabda kutadi. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

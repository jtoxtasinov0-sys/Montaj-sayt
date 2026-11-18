"use client";

import { useEffect, useRef } from "react";

/**
 * Studiya illyustratsiyasini sichqonchaga qarab biroz og'diradi (faqat sichqonchali qurilmalarda).
 * Ichidagi sekin "chayqalish" CSS animatsiyasi alohida qatlamda — ikkalasi bir-biriga xalaqit bermaydi.
 */
export function StudioTilt({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        el.style.setProperty("--tx", `${(-y * 6).toFixed(2)}deg`);
        el.style.setProperty("--ty", `${(x * 9).toFixed(2)}deg`);
      });
    };
    const reset = () => {
      el.style.setProperty("--tx", "0deg");
      el.style.setProperty("--ty", "0deg");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, []);
  return (
    <div ref={ref} className={className} aria-hidden>
      {children}
    </div>
  );
}

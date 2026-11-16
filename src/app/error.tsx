"use client";

import { useEffect } from "react";

// Xato tafsilotlari foydalanuvchiga ko'rsatilmaydi (faqat digest)
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 pt-24 text-center">
      <div>
        <p className="h-hero text-6xl">:(</p>
        <h1 className="mt-4 text-2xl font-light">Nimadir xato ketdi · Что-то пошло не так</h1>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted">#{error.digest}</p>}
        <button onClick={reset} className="btn btn-primary mt-8">
          Qayta urinish
        </button>
      </div>
    </main>
  );
}

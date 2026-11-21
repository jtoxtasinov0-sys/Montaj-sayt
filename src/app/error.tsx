"use client";

import { useEffect, useState } from "react";
import { isStaleDeployError, reloadForNewVersion } from "@/lib/stale-deploy";

// Xato tafsilotlari foydalanuvchiga ko'rsatilmaydi (faqat digest)
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Sayt yangilangan, sahifa esa eski — bu xato emas: sahifani o'zimiz yangilaymiz
  const stale = isStaleDeployError(error);
  const [reloading, setReloading] = useState(stale);

  useEffect(() => {
    if (!stale) {
      console.error(error);
      return;
    }
    const t = setTimeout(() => setReloading(reloadForNewVersion()), 1200);
    return () => clearTimeout(t);
  }, [error, stale]);

  if (stale) {
    return (
      <main className="grid min-h-[70vh] place-items-center px-4 pt-24 text-center">
        <div className="max-w-md">
          <p className="h-hero text-6xl">↻</p>
          <h1 className="mt-4 text-2xl font-light">Sayt yangilandi · Сайт обновился</h1>
          <p className="mt-3 text-sm text-muted">
            {reloading
              ? "Sahifa qayta yuklanmoqda… Kiritgan ma’lumotlaringizni qaytadan kiriting. · Страница перезагружается…"
              : "Sahifani yangilang va qaytadan urinib ko’ring. · Обновите страницу и попробуйте снова."}
          </p>
          {!reloading && (
            <button onClick={() => window.location.reload()} className="btn btn-primary mt-8">
              Sahifani yangilash
            </button>
          )}
        </div>
      </main>
    );
  }

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

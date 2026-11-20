import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function NotFound() {
  const d = await getDict();
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-center text-fg">
      <div className="fade-up">
        <p className="h-display text-[clamp(6rem,22vw,14rem)] leading-none">404</p>
        <h1 className="mt-4 text-2xl font-light">{d.common.notFoundTitle}</h1>
        <p className="mt-2 text-muted">{d.common.notFoundText}</p>
        <Link href="/" className="btn btn-primary mt-8">
          {d.common.home}
        </Link>
      </div>
    </main>
  );
}

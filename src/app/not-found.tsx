import Link from "next/link";
import { Stars } from "@/components/stars";
import { getDict } from "@/lib/i18n";

export default async function NotFound() {
  const d = await getDict();
  return (
    <main className="dark relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#05050f] px-4 text-center text-fg">
      <Stars className="absolute inset-0 -z-10 opacity-70" />
      <div className="planet -z-10" aria-hidden />
      <div className="fade-up">
        <p className="h-hero text-[clamp(6rem,22vw,14rem)] leading-none text-gradient">404</p>
        <h1 className="mt-4 text-2xl font-light">{d.common.notFoundTitle}</h1>
        <p className="mt-2 text-muted">{d.common.notFoundText}</p>
        <Link href="/" className="btn btn-primary mt-8">
          {d.common.home}
        </Link>
      </div>
    </main>
  );
}

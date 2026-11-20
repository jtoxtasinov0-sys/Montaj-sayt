import { uploadUrl } from "@/lib/uploads-url";
import { cn, initials } from "@/lib/utils";

/** Profil rasmi: yuklangan rasm → Google rasmi → bosh harflar (oq-qora) */
export function Avatar({
  name,
  avatarKey,
  image,
  size = 48,
  className,
}: {
  name: string;
  avatarKey?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const src = uploadUrl(avatarKey) ?? image ?? null;
  const style = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", className)}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-card-2 font-medium text-fg ring-1 ring-line", className)}
      style={{ ...style, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

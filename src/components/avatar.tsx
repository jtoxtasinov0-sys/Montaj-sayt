import { uploadUrl } from "@/lib/uploads-url";
import { cn, initials } from "@/lib/utils";

/** Profil rasmi: yuklangan rasm → Google rasmi → bosh harflar (gradient) */
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
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 60;
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full font-medium text-white ring-1 ring-line", className)}
      style={{
        ...style,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${230 + hue} 85% 66%), hsl(${245 + hue} 70% 46%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

import { Clapperboard, Film, Palette, Sparkles } from "lucide-react";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;

/* Geometriya (viewBox 600×600, markaz 300:300) */
const R_TICKS = 292;
const R_COMET = 246;
const R_DOTS = 180;
const C = (r: number) => 2 * Math.PI * r;

/** Kometa qatlamlari: dum → o'rta → yorqin bosh (uzunlik, sinf) */
const LAYERS = [
  { l: 230, cls: "oc1" },
  { l: 90, cls: "oc2" },
  { l: 14, cls: "oc3" },
];

/**
 * Kamera linzasi kabi halqalar: tashqi shkala sekin aylanadi, o'rtadagi halqada ko'k kometa
 * soat yo'nalishida, ichki nuqtali halqada to'q sariq kometa teskari yo'nalishda yuradi.
 * Hammasi aylana bo'ylab — tezlik har joyda bir xil.
 */
export function HeroOrbit() {
  const cTicks = C(R_TICKS);
  const cComet = C(R_COMET);
  const cDots = C(R_DOTS);
  return (
    <svg viewBox="0 0 600 600" className="orbit absolute inset-[-10%] h-[120%] w-[120%]" aria-hidden>
      {/* Shkala: 120 ta mayda va 12 ta katta chiziqcha */}
      <g className="orbit-rot orbit-slow">
        <circle cx="300" cy="300" r={R_TICKS} className="orbit-tick" strokeWidth="6" strokeDasharray={`1.2 ${cTicks / 120 - 1.2}`} />
        <circle
          cx="300"
          cy="300"
          r={R_TICKS - 3}
          className="orbit-tick orbit-tick-major"
          strokeWidth="12"
          strokeDasharray={`1.8 ${cTicks / 12 - 1.8}`}
        />
      </g>

      <circle cx="300" cy="300" r={R_COMET} className="orbit-line" />
      <g className="orbit-rot orbit-comet">
        {LAYERS.map((x) => (
          <circle
            key={x.cls}
            cx="300"
            cy="300"
            r={R_COMET}
            className={x.cls}
            strokeDasharray={`${x.l} ${cComet - x.l}`}
            strokeDashoffset={x.l}
          />
        ))}
      </g>

      <g className="orbit-rot orbit-rev">
        <circle cx="300" cy="300" r={R_DOTS} className="orbit-dots" strokeDasharray={`0.01 ${cDots / 72 - 0.01}`} />
      </g>
      <g className="orbit-rot orbit-comet-rev">
        {LAYERS.map((x) => (
          <circle
            key={x.cls}
            cx="300"
            cy="300"
            r={R_DOTS}
            className={`${x.cls} oc-accent`}
            strokeDasharray={`${x.l * 0.7} ${cDots - x.l * 0.7}`}
          />
        ))}
      </g>
    </svg>
  );
}

const CHIP_ICONS = [Film, Sparkles, Palette, Clapperboard];
const CHIP_DUR = 48;

/** Ichki halqa bo'ylab aylanuvchi yo'nalish yorliqlari — doim tik turadi */
export function HeroChips({ labels }: { labels: string[] }) {
  return (
    <div className="pointer-events-none absolute inset-[-10%]" aria-hidden>
      {labels.slice(0, 4).map((label, i) => {
        const Icon = CHIP_ICONS[i % CHIP_ICONS.length];
        const angle = i * 90 + 30;
        return (
          <div key={label} className="orbit-arm" style={{ "--ad": `${(-(angle / 360) * CHIP_DUR).toFixed(2)}s`, "--od": `${CHIP_DUR}s` } as Css}>
            <span className="orbit-chip">
              <Icon className="h-3 w-3 text-primary-2" />
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

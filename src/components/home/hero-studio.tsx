import {
  Camera,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  Crop,
  Diamond,
  Hand,
  Magnet,
  MousePointer2,
  PenTool,
  MoveHorizontal,
  Play,
  Scan,
  Scissors,
  SkipBack,
  SkipForward,
  Sparkles,
  Spline,
  Type,
  Wand2,
} from "lucide-react";
import { StudioTilt } from "./studio-tilt";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;

const WAVE = [38, 62, 30, 80, 46, 70, 24, 58, 90, 40, 66, 28, 74, 52, 34, 84, 44, 60, 26, 72, 50, 88, 36, 64, 30, 76, 48, 58, 22, 68];
const TICKS = ["00:00", "00:05", "00:10", "00:15"];

/**
 * Hero belgisi — montaj studiyasi (kodda chizilgan, rasm emas).
 * Bitta oyna ichida montaj (taymlayn), harakat (egri chiziqlar), rang (g'ildiraklar) va 3D (kub)
 * birlashgan. Kirishda oyna ko'tarilib chiqadi, panellar har tomondan prujina bilan uchib kelib
 * joyiga "o'tirib" qoladi; suzish esa boshidanoq ketayotgani uchun hech qachon to'xtab qolmaydi.
 * Panel o'zgaruvchilari: --fx/--fy/--fr — qayerdan va qanday burilib uchib keladi, --d — kechikish,
 * --t / --rt — tebranish va og'ish davri (har xil — harakat takrorlanmaydi), --b — faza.
 * Hamma o'lchamlar konteyner kengligiga (cqw) bog'liq — telefonda ham aynan shunday ko'rinadi.
 */
export function HeroStudio() {
  return (
    <StudioTilt className="studio">
      {/* Orqa nur: sekin aylanuvchi rangli nurlar + nafas oluvchi markaz */}
      <div className="st-light" />
      <div className="st-halo" />
      <div className="st-stage">

      {/* ---- Asosiy oyna ---- */}
      <div className="st-win">
        <div className="st-bar">
          <span className="st-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="st-tabs">
            <span className="st-tab-pill" />
            <span>Edit</span>
            <span>Motion</span>
            <span>Color</span>
            <span>3D</span>
          </span>
        </div>

        <div className="st-body">
          <div className="st-fx">
            <p className="st-h">Effect Controls</p>
            {[
              ["Position", "540,0", "540,0"],
              ["Scale", "100,0", ""],
              ["Rotation", "0°", ""],
              ["Opacity", "100 %", ""],
            ].map(([k, a, b], i) => (
              <p key={k} className="st-row">
                <span className="st-k">{k}</span>
                <span className="st-v">{a}</span>
                <span className="st-v">{b}</span>
                <span className="st-kf" style={{ "--i": i } as Css} />
              </p>
            ))}
            <div className="st-transport">
              <SkipBack />
              <ChevronsLeft />
              <Play className="st-playbtn" />
              <ChevronsRight />
              <SkipForward />
            </div>
          </div>
          <div className="st-view">
            <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#5b6cff" />
                  <stop offset="1" stopColor="#c06bff" />
                </linearGradient>
                <linearGradient id="st-hill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#3fe0c5" />
                  <stop offset="1" stopColor="#1f8f9b" />
                </linearGradient>
              </defs>
              <rect width="160" height="90" fill="url(#st-sky)" />
              <circle cx="118" cy="30" r="11" fill="#ffd166" className="st-sun" />
              <path d="M0 90 L0 62 L34 34 L62 60 L88 40 L124 68 L160 50 L160 90 Z" fill="url(#st-hill)" />
              <path d="M0 90 L0 74 L40 56 L78 76 L112 62 L160 80 L160 90 Z" fill="#17606f" />
            </svg>
            <span className="st-rec">REC</span>
          </div>
        </div>

        <div className="st-tl">
          <div className="st-tlhead">
            <span className="st-tc">00:14:10:22</span>
            <div className="st-ruler">
              {TICKS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="st-tracks">
            <div className="st-track">
              <span className="st-clip st-c-purple" style={{ left: "8%", width: "38%" }}>
                Title
              </span>
              <span className="st-clip st-c-purple" style={{ left: "58%", width: "26%" }} />
            </div>
            <div className="st-track">
              <span className="st-clip st-c-blue" style={{ left: "0%", width: "54%" }}>
                fx Main.mp4
              </span>
              <span className="st-clip st-c-blue st-cut" style={{ left: "55%", width: "45%" }}>
                fx Main.mp4
              </span>
            </div>
            <div className="st-track st-audio">
              {WAVE.map((h, i) => (
                <i key={i} style={{ height: `${h}%`, "--i": i } as Css} />
              ))}
            </div>
            <div className="st-playhead">
              <MousePointer2 className="st-cursor" />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Suzuvchi panellar (har biri o'z tomonidan uchib keladi) ---- */}
      <div className="st-float st-graph" style={{ "--z": "9cqw", "--fx": "-14cqw", "--fy": "-10cqw", "--fr": "-6deg", "--d": "0.5s", "--t": "4.6s", "--rt": "7s", "--b": "-1.2s" } as Css}>
        <div className="st-panel st-gpanel">
          {/* Tezlik grafigi: ish oralig'i, qiymat to'ri, ikki "qo'ng'iroq" egri chiziq, kalit kadrlar va pleyhed */}
          <svg viewBox="0 0 240 118" className="st-curve">
            <rect x="0" y="4" width="240" height="6" rx="3" className="st-g-area" />
            <rect x="2" y="1" width="9" height="12" rx="2.5" className="st-g-mark" />
            <rect x="229" y="1" width="9" height="12" rx="2.5" className="st-g-mark" />
            {[30, 50, 70, 90, 110, 130, 150, 170, 190, 210].map((x) => (
              <line key={x} x1={x} x2={x} y1="16" y2="100" className="st-g-grid" />
            ))}
            {[34, 60, 86].map((y) => (
              <line key={y} x1="6" x2="234" y1={y} y2={y} className="st-g-grid" />
            ))}
            <text x="8" y="30" className="st-g-label">
              1000 px/sec
            </text>
            <text x="8" y="56" className="st-g-label">
              500
            </text>
            <path className="st-c1" pathLength={100} d="M8 94 C 44 94, 50 30, 66 30 C 82 30, 88 94, 120 94 C 152 94, 158 30, 174 30 C 190 30, 196 94, 232 94" />
            {/* Kalit kadrlar va ularning dastaklari (baseline bo'ylab) */}
            <g className="st-c2">
              <line x1="8" x2="44" y1="94" y2="94" />
              <line x1="88" x2="152" y1="94" y2="94" />
              <line x1="196" x2="232" y1="94" y2="94" />
              {[44, 88, 152, 196].map((x) => (
                <circle key={x} cx={x} cy="94" r="2" />
              ))}
              {[8, 120, 232].map((x) => (
                <rect key={x} x={x - 3.5} y="90.5" width="7" height="7" rx="1" />
              ))}
            </g>
            <g className="st-gph">
              <line x1="120" x2="120" y1="14" y2="102" className="st-g-head" />
              <rect x="113" y="0" width="14" height="15" rx="3" className="st-g-mark" />
              <circle cx="120" cy="94" r="3.4" className="st-g-dot" />
            </g>
          </svg>
          <div className="st-gtools">
            <Spline />
            <Magnet />
            <Scan />
            <Diamond />
            <MoveHorizontal />
            <span className="st-gslider">
              <i />
            </span>
          </div>
        </div>
      </div>

      <div className="st-float st-cubebox" style={{ "--z": "7cqw", "--fx": "14cqw", "--fy": "-12cqw", "--fr": "6deg", "--d": "0.62s", "--t": "4s", "--rt": "6.2s", "--b": "-3.1s" } as Css}>
        <div className="st-panel st-3d">
          <div className="st-grid3d" />
          <div className="st-cube">
            {["f", "b", "l", "r", "t", "d"].map((s) => (
              <i key={s} className={`st-face st-${s}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="st-float st-meters" style={{ "--z": "6cqw", "--fx": "12cqw", "--fy": "0cqw", "--fr": "5deg", "--d": "0.74s", "--t": "3.6s", "--rt": "5.6s", "--b": "-2.2s" } as Css}>
        <div className="st-panel">
          <span className="st-m" style={{ "--s": "0.9s" } as Css} />
          <span className="st-m" style={{ "--s": "1.15s" } as Css} />
        </div>
      </div>

      <div className="st-float st-tools" style={{ "--z": "8cqw", "--fx": "-12cqw", "--fy": "2cqw", "--fr": "-5deg", "--d": "0.82s", "--t": "4.2s", "--rt": "6.6s", "--b": "-4s" } as Css}>
        <div className="st-panel">
          {[MousePointer2, Scissors, PenTool, Type, Hand, Crop].map((I, i) => (
            <I key={i} className={i === 1 ? "st-on" : undefined} />
          ))}
        </div>
      </div>

      <div className="st-float st-wheels" style={{ "--z": "10cqw", "--fx": "-10cqw", "--fy": "12cqw", "--fr": "-4deg", "--d": "0.9s", "--t": "4.8s", "--rt": "7.4s", "--b": "-2.6s" } as Css}>
        <div className="st-panel">
          {["Lift", "Gamma", "Gain"].map((l, i) => (
            <span key={l} className="st-wheel">
              <i style={{ "--i": i } as Css} />
              <em>{l}</em>
            </span>
          ))}
        </div>
      </div>

      <div className="st-float st-tile st-t1" style={{ "--z": "12cqw", "--fx": "0cqw", "--fy": "-12cqw", "--fr": "-8deg", "--d": "1s", "--t": "3.2s", "--rt": "5.2s", "--b": "-1.7s" } as Css}>
        <div className="st-panel">
          <span className="st-fxt">fx</span>
        </div>
      </div>
      <div className="st-float st-tile st-t2" style={{ "--z": "11cqw", "--fx": "10cqw", "--fy": "10cqw", "--fr": "8deg", "--d": "1.08s", "--t": "3.5s", "--rt": "5.6s", "--b": "-3.4s" } as Css}>
        <div className="st-panel">
          <Clapperboard />
        </div>
      </div>
      <div className="st-float st-tile st-t3" style={{ "--z": "13cqw", "--fx": "6cqw", "--fy": "-10cqw", "--fr": "8deg", "--d": "1.14s", "--t": "3s", "--rt": "4.8s", "--b": "-0.6s" } as Css}>
        <div className="st-panel">
          <Camera />
        </div>
      </div>
      <div className="st-float st-tile st-t4" style={{ "--z": "12cqw", "--fx": "-6cqw", "--fy": "10cqw", "--fr": "-8deg", "--d": "1.2s", "--t": "3.4s", "--rt": "5.4s", "--b": "-2.9s" } as Css}>
        <div className="st-panel">
          <Wand2 />
          <Sparkles className="st-spark" />
        </div>
      </div>
      </div>
    </StudioTilt>
  );
}

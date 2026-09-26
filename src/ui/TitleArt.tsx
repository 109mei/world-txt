import { memo, type ReactNode } from 'react';

/**
 * タイトル画面の絵（黒と銀の写本の世界）。星空・魔法陣の円・三日月・大聖堂・開いた本・舞うページ・水面の映り込み。
 * 飛び出す絵本のように、奥から手前へ5つの層に分けて描く（空・遠景・大聖堂・本と水面・手前の飾り）。
 * 同じ視野の SVG を重ねるので、止まっているときは1枚の絵と同じ。pop のときだけ、切り絵が奥から順に立ち上がる。
 * 飾りなので SVG だけで描き、文字は HTML 側に置く（文字を置く空の上半分は、明るいものを置かずに暗く保つ）。
 * 明るい画面でも夜の絵として描く（theme-night の中に置く）ので、色はこの絵の中で決める
 */

function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(20260924);
const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: r() * 390,
  y: r() * 620,
  s: 0.25 + r() * r() * 1.3,
  o: 0.25 + r() * 0.75,
  tw: i % 5 === 0,
  d: r() * 6,
}));

/** 舞うページ（位置・角度・大きさ・動きの遅れ）。文字の置き場（上の空）には置かない */
const PAGES = [
  { x: 40, y: 520, a: -24, w: 30, d: 0 },
  { x: 318, y: 505, a: 18, w: 34, d: 1.2 },
  { x: 70, y: 430, a: 12, w: 22, d: 2.1 },
  { x: 300, y: 420, a: -15, w: 24, d: 0.6 },
  { x: 16, y: 640, a: 28, w: 40, d: 1.7 },
  { x: 334, y: 650, a: -30, w: 42, d: 2.6 },
  { x: 118, y: 575, a: -8, w: 20, d: 3.1 },
  { x: 258, y: 580, a: 10, w: 22, d: 0.9 },
  { x: 356, y: 330, a: 22, w: 16, d: 2.4 },
  { x: 24, y: 350, a: -18, w: 14, d: 1.4 },
  { x: 20, y: 770, a: -12, w: 46, d: 0.4 },
  { x: 330, y: 790, a: 16, w: 50, d: 2.9 },
];

const spire = (cx: number, top: number, half: number, base: number) => `M${cx - half} ${base} L${cx} ${top} L${cx + half} ${base} Z`;
const tower = (cx: number, top: number, half: number, base: number, bottom = 606) =>
  `M${cx - half} ${bottom} L${cx - half} ${base} L${cx} ${top} L${cx + half} ${base} L${cx + half} ${bottom} Z`;

/** 遠くの城（左右の端） */
function FarCastles() {
  return (
    <g fill="#34363c" opacity="0.9">
      <path d={tower(30, 470, 7, 500)} />
      <path d={tower(48, 488, 6, 512)} />
      <path d="M18 606 L18 530 L62 530 L62 606 Z" />
      <path d={tower(360, 468, 7, 498)} />
      <path d={tower(342, 490, 6, 514)} />
      <path d="M328 606 L328 528 L374 528 L374 606 Z" />
    </g>
  );
}

/** 大聖堂（中心 x=195、地面 y=606） */
function Cathedral() {
  return (
    <g>
      <g fill="url(#ta-stone)">
        {/* 外側の小さな尖塔 */}
        <path d={tower(74, 468, 5, 492)} />
        <path d={tower(316, 468, 5, 492)} />
        <path d={tower(95, 440, 6, 470)} />
        <path d={tower(295, 440, 6, 470)} />
        {/* 外の塔 */}
        <path d={tower(118, 396, 9, 440)} />
        <path d={tower(272, 396, 9, 440)} />
        {/* 双塔 */}
        <path d={tower(150, 352, 11, 408)} />
        <path d={tower(240, 352, 11, 408)} />
        {/* 身廊と中央の尖塔 */}
        <path d="M165 606 L165 444 L195 404 L225 444 L225 606 Z" />
        <path d={spire(195, 318, 9, 420)} />
        {/* 低い壁 */}
        <path d="M66 606 L66 500 L324 500 L324 606 Z" />
        {/* 小尖塔 */}
        {[132, 172, 218, 258].map((x) => (
          <path key={x} d={spire(x, 470, 3, 500)} />
        ))}
      </g>
      {/* 窓（暗い切り欠き） */}
      <g fill="#0c0d10" opacity="0.72">
        {[84, 104, 128, 262, 286, 306].map((x) => (
          <path key={x} d={`M${x - 4} 560 L${x - 4} 530 Q${x} 520 ${x + 4} 530 L${x + 4} 560 Z`} />
        ))}
        {[150, 240].map((x) => (
          <path key={x} d={`M${x - 5} 470 L${x - 5} 438 Q${x} 426 ${x + 5} 438 L${x + 5} 470 Z`} />
        ))}
      </g>
      {/* バラ窓 */}
      <g stroke="#0c0d10" strokeWidth="1" fill="none" opacity="0.7">
        <circle cx="195" cy="468" r="12" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1="195" y1="468" x2={195 + Math.cos(a) * 12} y2={468 + Math.sin(a) * 12} />;
        })}
      </g>
      {/* 光る扉 */}
      <path d="M181 606 L181 546 Q195 512 209 546 L209 606 Z" fill="url(#ta-door)" />
    </g>
  );
}

function Page({ x, y, a, w, d }: (typeof PAGES)[number]) {
  const h = w * 1.3;
  return (
    <g className="page-float" style={{ animationDelay: `${-d}s` }}>
      <g transform={`translate(${x} ${y}) rotate(${a})`}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="1.5" fill="#e6e6ea" opacity="0.88" />
        {Array.from({ length: 4 }, (_, i) => (
          <line key={i} x1={-w / 2 + 3} x2={w / 2 - 3 - (i % 2) * 4} y1={-h / 2 + 5 + i * (h / 5)} y2={-h / 2 + 5 + i * (h / 5)} stroke="#6d7078" strokeWidth="0.8" />
        ))}
      </g>
    </g>
  );
}

function Sparkle({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <path
      className="twinkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} ${y - 8 * s} L${x + 1.2 * s} ${y - 1.2 * s} L${x + 8 * s} ${y} L${x + 1.2 * s} ${y + 1.2 * s} L${x} ${y + 8 * s} L${x - 1.2 * s} ${y + 1.2 * s} L${x - 8 * s} ${y} L${x - 1.2 * s} ${y - 1.2 * s} Z`}
      fill="#fff"
      filter="url(#ta-glow)"
    />
  );
}

function Ornament({ x, len, beads }: { x: number; len: number; beads: number[] }) {
  return (
    <g stroke="#cfd3da" strokeOpacity="0.55" strokeWidth="0.8">
      <line x1={x} y1="0" x2={x} y2={len} />
      {beads.map((b, i) => (
        <path key={i} d={`M${x} ${b - 5} L${x + 3} ${b} L${x} ${b + 5} L${x - 3} ${b} Z`} fill="#e9ebef" stroke="none" />
      ))}
      <circle cx={x} cy={len + 4} r="3.5" fill="none" />
    </g>
  );
}

/** この絵の中だけで使う色と光（ほかの絵と名前がぶつからないよう ta- を付ける） */
function Defs() {
  return (
    <defs>
      <radialGradient id="ta-bg" cx="50%" cy="66%" r="75%">
        <stop offset="0" stopColor="#2b2d33" />
        <stop offset="0.38" stopColor="#101115" />
        <stop offset="1" stopColor="#030304" />
      </radialGradient>
      <linearGradient id="ta-stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6f6f8" />
        <stop offset="0.55" stopColor="#b9bcc4" />
        <stop offset="1" stopColor="#5d6068" />
      </linearGradient>
      <radialGradient id="ta-door" cx="50%" cy="80%" r="70%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#f2f3f7" />
        <stop offset="1" stopColor="#9fa3ab" />
      </radialGradient>
      <radialGradient id="ta-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ta-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#15161a" />
        <stop offset="1" stopColor="#040405" />
      </linearGradient>
      <linearGradient id="ta-refl-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
        <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <mask id="ta-refl-mask">
        <rect x="0" y="690" width="390" height="154" fill="url(#ta-refl-fade)" />
      </mask>
      <linearGradient id="ta-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="ta-page-l" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9a9ca3" />
        <stop offset="1" stopColor="#f1f1f3" />
      </linearGradient>
      <linearGradient id="ta-page-r" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#9a9ca3" />
        <stop offset="1" stopColor="#f1f1f3" />
      </linearGradient>
      <linearGradient id="ta-brace" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3f4f6" />
        <stop offset="0.5" stopColor="#9da1a9" />
        <stop offset="1" stopColor="#e6e8ec" />
      </linearGradient>
      <filter id="ta-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="ta-soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="ta-blur-refl">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </defs>
  );
}

/** 空（星・魔法陣の円・吊り下がる飾り・三日月）。三日月は、題名の右上に重ならない高さに置く */
function Sky() {
  return (
    <>
      <rect width="390" height="844" fill="url(#ta-bg)" />
      <g fill="#fff">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.s}
            opacity={s.o}
            className={s.tw ? 'twinkle' : undefined}
            style={s.tw ? { animationDelay: `${-s.d}s` } : undefined}
          />
        ))}
      </g>
      <g fill="none" stroke="#dfe2e8" className="rings">
        <circle cx="195" cy="300" r="178" strokeOpacity="0.42" strokeWidth="1.3" />
        <circle cx="195" cy="300" r="166" strokeOpacity="0.22" strokeWidth="0.8" strokeDasharray="2 7" />
        <circle cx="195" cy="300" r="124" strokeOpacity="0.12" strokeWidth="0.8" />
        <circle cx="195" cy="300" r="250" strokeOpacity="0.07" strokeWidth="0.8" />
        <ellipse cx="195" cy="300" rx="210" ry="70" strokeOpacity="0.1" strokeWidth="0.8" transform="rotate(-12 195 300)" />
      </g>
      <Ornament x={26} len={210} beads={[70, 140]} />
      <Ornament x={62} len={130} beads={[60]} />
      <Ornament x={328} len={120} beads={[54]} />
      <Ornament x={364} len={220} beads={[80, 160]} />
      <g filter="url(#ta-glow)">
        <circle cx="298" cy="64" r="20" fill="#f4f4f6" />
        <circle cx="307" cy="57" r="18" fill="#0a0b0d" />
      </g>
    </>
  );
}

/** 遠景（雲と遠くの城） */
function Far() {
  return (
    <>
      <g fill="#fff" filter="url(#ta-soft)">
        <ellipse cx="60" cy="520" rx="70" ry="22" opacity="0.1" />
        <ellipse cx="330" cy="515" rx="75" ry="24" opacity="0.1" />
        <ellipse cx="110" cy="585" rx="80" ry="18" opacity="0.12" />
        <ellipse cx="285" cy="590" rx="85" ry="18" opacity="0.12" />
      </g>
      <FarCastles />
    </>
  );
}

/** 大聖堂と後光と光の柱 */
function Mid() {
  return (
    <>
      <circle cx="195" cy="560" r="120" fill="url(#ta-halo)" opacity="0.6" />
      <Cathedral />
      <rect x="191" y="470" width="8" height="200" fill="url(#ta-beam)" opacity="0.9" />
    </>
  );
}

/** 開いた本と、水面の映り込み */
function Near() {
  return (
    <>
      <g>
        <path d="M44 700 Q120 650 195 676 Q270 650 346 700 L346 712 Q270 668 195 690 Q120 668 44 712 Z" fill="#141519" />
        <path d="M48 692 Q122 640 195 668 L195 684 Q122 660 48 704 Z" fill="url(#ta-page-l)" />
        <path d="M342 692 Q268 640 195 668 L195 684 Q268 660 342 704 Z" fill="url(#ta-page-r)" />
        <g stroke="#6f727a" strokeWidth="0.7" opacity="0.7">
          {Array.from({ length: 5 }, (_, i) => (
            <path key={`l${i}`} d={`M${70 + i * 4} ${684 - i * 5.5} Q${128} ${652 - i * 4} ${184} ${674 - i * 1.5}`} fill="none" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <path key={`r${i}`} d={`M${320 - i * 4} ${684 - i * 5.5} Q${262} ${652 - i * 4} ${206} ${674 - i * 1.5}`} fill="none" />
          ))}
        </g>
        <path d="M195 664 L201 676 L195 700 L189 676 Z" fill="#e8e9ec" filter="url(#ta-glow)" />
      </g>
      <rect x="0" y="706" width="390" height="138" fill="url(#ta-water)" />
      <g mask="url(#ta-refl-mask)" filter="url(#ta-blur-refl)" opacity="0.55">
        <g transform="matrix(1 0 0 -1 0 1312)">
          <FarCastles />
          <Cathedral />
        </g>
      </g>
      <rect x="192" y="706" width="6" height="138" fill="url(#ta-beam)" opacity="0.6" />
      <g fill="none" stroke="#fff" className="ripples">
        {[46, 86, 130, 178].map((rx, i) => (
          <ellipse key={rx} cx="195" cy="770" rx={rx} ry={rx * 0.18} strokeOpacity={0.2 - i * 0.04} strokeWidth="0.8" />
        ))}
      </g>
    </>
  );
}

/** 手前の飾り（題名を囲む括弧・舞うページ・きらめき）。括弧は、上へ上げた題名の高さに合わせる */
function Front() {
  return (
    <>
      <g fill="none" stroke="url(#ta-brace)" strokeLinecap="round" transform="translate(0 -138)">
        <path d="M36 214 C 14 222, 18 262, 24 286 C 30 306, 18 318, 6 322 C 18 326, 30 338, 24 358 C 18 382, 14 422, 36 430" strokeWidth="5" />
        <path d="M354 214 C 376 222, 372 262, 366 286 C 360 306, 372 318, 384 322 C 372 326, 360 338, 366 358 C 372 382, 376 422, 354 430" strokeWidth="5" />
        <path d="M44 226 C 30 236, 32 262, 34 280" strokeWidth="1" strokeOpacity="0.6" />
        <path d="M346 226 C 360 236, 358 262, 356 280" strokeWidth="1" strokeOpacity="0.6" />
      </g>
      {PAGES.map((p, i) => (
        <Page key={i} {...p} />
      ))}
      <Sparkle x={195} y={300} s={1.4} />
      <Sparkle x={64} y={610} s={0.6} delay={-0.7} />
      <Sparkle x={330} y={730} s={0.7} delay={-3} />
    </>
  );
}

const LAYERS: { id: string; draw: () => ReactNode }[] = [
  { id: 'sky', draw: Sky },
  { id: 'far', draw: Far },
  { id: 'mid', draw: Mid },
  { id: 'near', draw: Near },
  { id: 'front', draw: Front },
];

export const TitleArt = memo(function TitleArt({ pop = false }: { pop?: boolean }) {
  return (
    <div className={pop ? 'title-art title-pop' : 'title-art'} aria-hidden="true">
      {LAYERS.map((l, i) => (
        <div key={l.id} className={`title-layer title-layer-${l.id}`}>
          <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
            {i === 0 && <Defs />}
            {l.draw()}
          </svg>
        </div>
      ))}
    </div>
  );
});

import { useEffect, useState } from 'react';
import { useGame, passDuration, skipPassing } from '../store/game';
import { seCompute } from './se';

/** 計算を終えたあと、覆いがうすれて消えるまで（ミリ秒。styles.css の .passing-leave と同じ長さ） */
const LEAVE_MS = 220;

function reduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/** 止まった薄い数式（読む文は置かない。飾りの計算） */
const FORMULAS: { x: number; y: number; t: string }[] = [
  { x: 170, y: 90, t: 'P(t+1) = P(t)(1 + b − d)' },
  { x: 36, y: 146, t: 'x(t+1) = F( x(t), L )' },
  { x: 240, y: 146, t: 'Σ food − Σ need' },
  { x: 214, y: 196, t: 'L = WORLD.txt' },
  { x: 22, y: 234, t: 'dT/dt ∝ ln(CO₂/C₀)' },
];

/**
 * 計算の演出（約1.2秒・何も起きなかった年は約0.4秒）：悪魔が1年ぶん計算する。動くのは2つだけ。
 * 年の数字は縦のモーションブラーで回り、世界の絵は早回しで、雲と人が横のモーションブラーを引いて流れる。
 * 数式は止まった薄い文字。動きを減らす設定・情景を動かす OFF では、ぶれも流れも出さず、数字が入れ替わるだけ。
 * タップすれば、すぐに結果を開く
 */
export function Passing() {
  const current = useGame((s) => s.passing);
  const motion = useGame((s) => s.settings.motion);
  // 計算を終えたら、覆いをぷつりと消さずに、うすれさせて世界（か結果の画面）へつなぐ
  const [leaving, setLeaving] = useState<{ from: number; to: number } | null>(null);
  const [last, setLast] = useState(current);
  if (current && current !== last) setLast(current);
  if (!current && last) {
    setLast(null);
    if (motion && !reduced()) setLeaving(last);
  }
  useEffect(() => {
    if (current) seCompute();
  }, [current]);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);
  const passing = current ?? leaving;
  if (!passing) return null;
  const total = passDuration(passing.to - passing.from);
  return (
    <div
      className={['passing', motion ? '' : 'passing-still', current ? '' : 'passing-leave'].filter(Boolean).join(' ')}
      data-testid={current ? 'passing' : undefined}
      role={current ? 'status' : undefined}
      aria-hidden={current ? undefined : true}
      aria-label={current ? `YEAR ${passing.from} から ${passing.to} へ` : undefined}
      onClick={current ? skipPassing : undefined}
      style={{ ['--pass' as string]: `${total}ms` }}
    >
      <svg className="passing-art" viewBox="0 0 390 520" aria-hidden="true">
        <defs>
          {/* 縦のモーションブラー（年の数字）と横のモーションブラー（流れる世界） */}
          <filter id="pass-blur-y" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="0 6" />
          </filter>
          <filter id="pass-blur-x" x="-60%" y="-20%" width="220%" height="140%">
            <feGaussianBlur stdDeviation="6 0" />
          </filter>
        </defs>
        {FORMULAS.map((f) => (
          <text key={f.t} x={f.x} y={f.y} className="pass-formula">
            {f.t}
          </text>
        ))}
        <circle cx={195} cy={330} r={150} className="pass-ring" />
        <circle cx={195} cy={330} r={112} className="pass-ring pass-ring-dot" />
        <line x1={45} y1={330} x2={345} y2={330} className="pass-ring" />
        <line x1={195} y1={180} x2={195} y2={480} className="pass-ring" />
        <text x={195} y={262} className="pass-label">
          YEAR
        </text>
        <g className="pass-roll">
          <text x={195} y={340} className="pass-year pass-year-out" filter="url(#pass-blur-y)">
            {passing.from}
          </text>
          <text x={195} y={340} className="pass-year pass-year-in" filter="url(#pass-blur-y)">
            {passing.to}
          </text>
        </g>
        <text x={195} y={384} className="pass-from-to">
          {passing.from} → {passing.to}
        </text>
      </svg>
      <p className="passing-text">世界が決まりどおりに計算されている</p>
      <p className="passing-skip">タップで飛ばす</p>
      {/* 早回しの世界：雲・人・影が、横のぶれを引いて流れる */}
      <svg className="passing-world" viewBox="0 0 390 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d="M0 60 Q 100 36 200 46 T 390 30 L390 150 L0 150 Z" className="pw-land" />
        <path d="M170 104 L170 70 L186 56 L202 70 L202 104 M156 104 L156 80 L168 80 L168 104 M206 104 L206 84 L218 84 L218 104" className="pw-town" />
        <g className="pw-flow" filter="url(#pass-blur-x)">
          <ellipse cx={70} cy={18} rx={34} ry={6} className="pw-cloud" />
          <ellipse cx={300} cy={10} rx={30} ry={5} className="pw-cloud" />
          <rect x={110} y={118} width={30} height={3} className="pw-shadow" />
          <rect x={240} y={120} width={26} height={3} className="pw-shadow" />
          <rect x={320} y={134} width={22} height={2} className="pw-shadow" />
        </g>
      </svg>
    </div>
  );
}

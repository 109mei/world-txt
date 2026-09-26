import type { SceneView } from '../../store/scene';
import { BAD, dur, delay, GROUND, H, HORIZON, INK, m, Motif, PAPER, PLAZA, rnd, SILVER_DIM, strokeOf, W } from './common';

/** 世界のほころび：格子・空の亀裂・揺らぎ・ほどけていく世界・止まった時間・逆さの時間・糸・心の暗さ */
export function Overlay({ v }: { v: SceneView }) {
  const glitch = Math.max(m(v, 'glitch'), v.coherence < 0.5 ? (0.5 - v.coherence) * 2 : 0);
  const voidK = m(v, 'void');
  const gloom = Math.max(0, (0.45 - v.mind) * 1.2);
  return (
    <g>
      {m(v, 'strings') > 0 && (
        <Motif v={v} id="strings">
          {[130, 156, 182, 208, 234, 260].map((x, i) => (
            <line
              key={x}
              className="sc-sway"
              x1={x + (i % 2) * 4}
              y1={-2}
              x2={x}
              y2={PLAZA - 12}
              stroke={strokeOf(v, 'strings', SILVER_DIM)}
              strokeWidth={0.4}
              opacity={0.3 + 0.5 * m(v, 'strings')}
              style={{ ...dur(4 + i * 0.3), ...delay(i * 0.5) }}
            />
          ))}
        </Motif>
      )}
      {m(v, 'grid') > 0 && (
        <Motif v={v} id="grid">
          <g stroke={strokeOf(v, 'grid', SILVER_DIM)} strokeWidth={0.3} opacity={0.35 * m(v, 'grid')}>
            {Array.from({ length: 13 }, (_, i) => (
              <line key={`v${i}`} x1={i * 32} y1={0} x2={i * 32} y2={H} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 30} x2={W} y2={i * 30} />
            ))}
          </g>
        </Motif>
      )}
      {m(v, 'skyCrack') > 0 && (
        <Motif v={v} id="skyCrack">
          <path className="sc-pulse" d="M120 0 L132 18 L124 30 L146 52 L138 66 L160 90" fill="none" stroke={strokeOf(v, 'skyCrack', PAPER)} strokeWidth={1.2} style={dur(2.2)} />
          <path d="M120 0 L132 18 L124 30 L146 52 L138 66 L160 90" fill="none" stroke={INK} strokeWidth={4} opacity={0.15} />
        </Motif>
      )}
      {glitch > 0.08 && (
        <Motif v={v} id="glitch">
          <g opacity={0.3 * glitch}>
            {Array.from({ length: Math.round(3 + 6 * glitch) }, (_, i) => {
              const y = rnd(v.seed, 3000 + i) * H;
              const w = 40 + rnd(v.seed, 3100 + i) * 140;
              const x = rnd(v.seed, 3200 + i) * (W - w);
              return <rect key={i} className="sc-glitch-bar" x={x} y={y} width={w} height={1 + (i % 3)} fill={i % 2 ? INK : PAPER} style={{ ...dur(1.8 + (i % 4) * 0.4), ...delay(i * 0.3) }} />;
            })}
          </g>
        </Motif>
      )}
      {voidK > 0 && (
        <Motif v={v} id="void">
          <defs>
            <radialGradient id="sc-void" cx="0.5" cy="0.55" r="0.75">
              <stop offset="0.25" stopColor="var(--sc-shade)" stopOpacity="0" />
              <stop offset="1" stopColor="var(--sc-shade)" stopOpacity="1" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="var(--sc-shade)" opacity={0.3 * voidK} />
          <rect width={W} height={H} fill="url(#sc-void)" opacity={0.5 + 0.5 * voidK} />
          {/* 世界のかけらが、ほどけて宙へ散っていく */}
          {Array.from({ length: 16 }, (_, i) => (
            <g key={`f${i}`} transform={`translate(${rnd(v.seed, 3500 + i) * W} ${GROUND + rnd(v.seed, 3600 + i) * 30})`}>
              <rect className="sc-bubble" x={-1.2} y={-1.2} width={2.4} height={2.4} fill={i % 3 === 0 ? INK : PAPER} opacity={0.7 * voidK} style={{ ...dur(5 + (i % 4)), ...delay(i * 0.7) }} />
            </g>
          ))}
          {/* ほどけた大地の向こうに、星が透けて見える */}
          {Array.from({ length: 14 }, (_, i) => (
            <circle
              key={i}
              className="sc-twinkle"
              cx={rnd(v.seed, 3300 + i) * W}
              cy={GROUND + rnd(v.seed, 3400 + i) * (H - GROUND)}
              r={0.6}
              fill={PAPER}
              opacity={0.8 * voidK}
              style={{ ...dur(2 + (i % 3)), ...delay(i * 0.4) }}
            />
          ))}
        </Motif>
      )}
      {m(v, 'frozen') > 0.3 && (
        <Motif v={v} id="frozen">
          <rect width={W} height={H} fill="var(--sc-frost)" opacity={0.08 + 0.08 * m(v, 'frozen')} />
        </Motif>
      )}
      {m(v, 'reverse') > 0.3 && (
        <Motif v={v} id="reverse">
          <rect width={W} height={H} fill="var(--sc-sepia)" opacity={0.08 + 0.06 * m(v, 'reverse')} />
        </Motif>
      )}
      {m(v, 'loop') > 0.3 && (
        <Motif v={v} id="loop">
          <g transform="translate(330 44)" opacity={0.6 * m(v, 'loop')}>
            <g className="sc-spin-slow" style={dur(10)}>
              <path d="M-24 0 A24 24 0 1 1 0 24" fill="none" stroke={strokeOf(v, 'loop')} strokeWidth={0.9} />
              <path d="M0 24 l-4 -3 M0 24 l-3 4" stroke={strokeOf(v, 'loop')} strokeWidth={0.9} />
            </g>
          </g>
        </Motif>
      )}
      {gloom > 0.05 && <rect width={W} height={H} fill="var(--sc-shade)" opacity={Math.min(0.35, gloom)} />}
      {/* 写本の挿し絵のふち */}
      <rect width={W} height={H} fill="url(#sc-vignette)" pointerEvents="none" />
      {v.ended === 'failed' && <rect width={W} height={H} fill="var(--sc-shade)" opacity={0.42} />}
      {v.ended === 'failed' && <line x1={0} y1={HORIZON + 30} x2={W} y2={HORIZON + 30} stroke={BAD} strokeWidth={0.4} opacity={0.4} />}
      {v.ended === 'cleared' && <ellipse cx={W / 2} cy={GROUND} rx={190} ry={34} fill="var(--sc-paper)" opacity={0.08} />}
    </g>
  );
}

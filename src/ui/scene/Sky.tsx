import type { SceneView } from '../../store/scene';
import { dur, delay, HORIZON, INK, m, Motif, PAPER, rnd, SILVER, SILVER_DIM, strokeOf, W } from './common';

/** 空の暗さ：太陽のない空・夜の明けない空は暗く、夜の来ない空は明るい */
export function skyTone(v: SceneView): 'day' | 'night' | 'dark' {
  if (m(v, 'eternalDay') > 0.3) return 'day';
  if (m(v, 'noSun') > 0.3 || m(v, 'eternalNight') > 0.3 || m(v, 'sunHole') > 0.3) return 'dark';
  return 'night';
}

const SKY: Record<ReturnType<typeof skyTone>, [string, string]> = {
  night: ['#0b0c10', '#1b1c23'],
  day: ['#2b2f39', '#565b67'],
  dark: ['#020203', '#07080a'],
};

/** 空の色・星・オーロラ・天の光・虹 */
export function SkyBack({ v }: { v: SceneView }) {
  const tone = skyTone(v);
  const [top, bottom] = SKY[tone];
  const stars = tone === 'day' ? 0 : Math.round(26 * (1 - 0.7 * m(v, 'starsDim')) + 20 * m(v, 'starsMore'));
  const starAlpha = tone === 'dark' ? 0.95 : 0.5;
  const half = m(v, 'halfNight');
  return (
    <g>
      <defs>
        <linearGradient id={`sc-sky-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <linearGradient id="sc-ozone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8b2ff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#c8b2ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sc-half" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#020203" stopOpacity="0.96" />
          <stop offset="0.46" stopColor="#020203" stopOpacity="0.9" />
          <stop offset="0.56" stopColor="#020203" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sc-glow">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-glow-ink">
          <stop offset="0" stopColor="#a6cdff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a6cdff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={HORIZON + 30} fill={`url(#sc-sky-${tone})`} />
      {m(v, 'ozone') > 0 && (
        <Motif v={v} id="ozone">
          <rect width={W} height={HORIZON} fill="url(#sc-ozone)" opacity={m(v, 'ozone')} />
        </Motif>
      )}
      {half > 0 && (
        <Motif v={v} id="halfNight">
          <rect width={W} height={HORIZON + 30} fill="url(#sc-half)" opacity={half} />
          <line x1={W * 0.5} y1={0} x2={W * 0.5} y2={HORIZON} stroke={strokeOf(v, 'halfNight', SILVER_DIM)} strokeDasharray="2 4" strokeWidth={0.6} />
        </Motif>
      )}
      {/* 星：夜の空で瞬く。昼と夜に分かれた世界では、夜の側にだけ */}
      {Array.from({ length: stars }, (_, i) => {
        const x = rnd(v.seed, i * 3) * (half > 0.3 ? W * 0.5 : W);
        const y = rnd(v.seed, i * 3 + 1) * (HORIZON - 30);
        const r = 0.4 + rnd(v.seed, i * 3 + 2) * 0.8;
        // 瞬くのは三つに一つ（動くものを減らして、電池を使いすぎない）
        return i % 3 === 0 ? (
          <circle key={i} className="sc-twinkle" cx={x} cy={y} r={r} fill={PAPER} style={{ ...dur(2.4 + (i % 5) * 0.6), ...delay(i * 0.37) }} />
        ) : (
          <circle key={i} cx={x} cy={y} r={r} fill={PAPER} opacity={starAlpha} />
        );
      })}
      {m(v, 'starsMore') > 0.2 && tone !== 'day' && (
        <Motif v={v} id="starsMore">
          <path d="M-10 40 C 90 10, 200 70, 400 18" fill="none" stroke={strokeOf(v, 'starsMore', SILVER_DIM)} strokeWidth={10} opacity={0.12 * m(v, 'starsMore')} strokeLinecap="round" />
        </Motif>
      )}
      {m(v, 'aurora') > 0 && (
        <Motif v={v} id="aurora">
          {/* 動き（明滅）は内側に、濃さは外側に持たせる（アニメーションの濃さが属性の濃さを上書きしないように） */}
          {[0, 1, 2].map((k) => (
            <g key={k} opacity={m(v, 'aurora') * (0.45 - k * 0.1)}>
              <path
                className="sc-aurora"
                d={`M-20 ${14 + k * 9} C 60 ${2 + k * 9}, 120 ${30 + k * 9}, 200 ${12 + k * 9} S 330 ${26 + k * 8}, 410 ${10 + k * 9}`}
                fill="none"
                stroke={strokeOf(v, 'aurora', 'rgba(163,220,191,0.7)')}
                strokeWidth={5 - k}
                style={{ ...dur(7 + k * 2), ...delay(k * 1.3) }}
              />
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'godLight') > 0 && (
        <Motif v={v} id="godLight">
          <g opacity={m(v, 'godLight') * 0.8}>
            {[-60, -30, 0, 30, 60].map((a, k) => (
              <path
                key={a}
                className="sc-ray"
                d={`M${195 + a * 0.2} -10 L${195 + a * 2.2 - 16} ${HORIZON + 20} L${195 + a * 2.2 + 16} ${HORIZON + 20} Z`}
                fill="url(#sc-ray)"
                style={{ ...dur(5), ...delay(k * 0.8) }}
              />
            ))}
          </g>
        </Motif>
      )}
      {m(v, 'rainbow') > 0 && (
        <Motif v={v} id="rainbow">
          {[0, 1, 2, 3].map((k) => (
            <path
              key={k}
              d={`M${30 + k * 3} ${HORIZON + 22} A ${170 - k * 3} ${120 - k * 3} 0 0 1 ${370 - k * 3} ${HORIZON + 22}`}
              fill="none"
              stroke={k === 1 ? strokeOf(v, 'rainbow') : SILVER}
              strokeWidth={2}
              opacity={m(v, 'rainbow') * (0.34 - k * 0.06)}
            />
          ))}
        </Motif>
      )}
    </g>
  );
}

/** 太陽・月・ブラックホール・空の時計・空の目 */
export function Celestial({ v }: { v: SceneView }) {
  const hole = m(v, 'sunHole');
  const hidden = m(v, 'noSun') > 0.3 || m(v, 'eternalNight') > 0.3 || hole > 0.3;
  const size = 1 + 0.7 * m(v, 'sunNear') + 0.25 * m(v, 'sunBright') + 0.25 * m(v, 'eternalDay') - 0.55 * m(v, 'sunFar') - 0.2 * m(v, 'sunDim');
  const sunFill = m(v, 'sunDim') > 0.3 ? '#b9bcc4' : PAPER;
  const sunCls = m(v, 'sunFlicker') > 0.3 ? 'sc-flicker-slow' : undefined;
  const sunId = m(v, 'sunNear') > 0 ? 'sunNear' : m(v, 'sunFar') > 0 ? 'sunFar' : m(v, 'sunBright') > 0 ? 'sunBright' : m(v, 'sunDim') > 0 ? 'sunDim' : 'sunFlicker';
  const glowInk = v.inked.includes(sunId) && m(v, sunId) > 0;
  const moonBig = m(v, 'eternalNight') > 0.3;
  const bh = m(v, 'blackHole');
  const clock = m(v, 'clock');
  const eye = m(v, 'eye');
  return (
    <g>
      {!hidden && (
        <Motif v={v} id={sunId}>
          <g className={sunCls} style={dur(2.2)}>
            <circle cx={330} cy={44} r={34 * size} fill={glowInk ? 'url(#sc-glow-ink)' : 'url(#sc-glow)'} opacity={m(v, 'sunDim') > 0.3 ? 0.5 : 1} />
            <circle cx={330} cy={44} r={11 * size} fill={sunFill} />
          </g>
        </Motif>
      )}
      {hole > 0 && (
        <Motif v={v} id="sunHole">
          <g transform="translate(330 44)">
            <ellipse rx={26} ry={7} fill="none" stroke={strokeOf(v, 'sunHole', PAPER)} strokeWidth={1.6} opacity={0.8} className="sc-spin-slow" style={dur(30)} />
          </g>
          <circle cx={330} cy={44} r={11} fill="#000000" stroke={strokeOf(v, 'sunHole', SILVER)} strokeWidth={0.8} />
        </Motif>
      )}
      {m(v, 'twoSuns') > 0 && !hidden && (
        <Motif v={v} id="twoSuns">
          <circle cx={364} cy={76} r={22} fill={v.inked.includes('twoSuns') ? 'url(#sc-glow-ink)' : 'url(#sc-glow)'} />
          <circle cx={364} cy={76} r={7} fill={PAPER} />
        </Motif>
      )}
      {m(v, 'noMoon') < 0.5 && (
        <path d={moonBig ? 'M318 26 A18 18 0 1 0 318 62 A20 20 0 0 1 318 26 Z' : 'M54 22 A9 9 0 1 0 54 40 A10 10 0 0 1 54 22 Z'} fill="#d8dbe2" opacity={moonBig ? 0.92 : 0.5} />
      )}
      {bh > 0 && (
        <Motif v={v} id="blackHole">
          <g transform={`translate(92 58) scale(${0.35 + 0.65 * bh})`}>
            <ellipse rx={30} ry={8} fill="none" stroke={strokeOf(v, 'blackHole', PAPER)} strokeWidth={1.4} opacity={0.75} className="sc-spin-slow" style={dur(40)} />
            <circle r={24} fill="none" stroke={SILVER_DIM} strokeWidth={0.6} strokeDasharray="1 3" />
            <circle r={11} fill="#000000" stroke={strokeOf(v, 'blackHole', SILVER)} strokeWidth={0.8} />
          </g>
        </Motif>
      )}
      {clock > 0 && (
        <Motif v={v} id="clock">
          <g transform="translate(150 44)" opacity={0.25 + 0.5 * clock}>
            <circle r={21} fill="none" stroke={strokeOf(v, 'clock')} strokeWidth={0.8} />
            <circle r={17} fill="none" stroke={SILVER_DIM} strokeWidth={0.4} />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1={Math.sin(a) * 17} y1={-Math.cos(a) * 17} x2={Math.sin(a) * 20} y2={-Math.cos(a) * 20} stroke={SILVER} strokeWidth={0.7} />;
            })}
            <line className="sc-hand" x1={0} y1={0} x2={0} y2={-14} stroke={strokeOf(v, 'clock')} strokeWidth={0.9} style={dur(12)} />
            <line className="sc-hand" x1={0} y1={0} x2={0} y2={-9} stroke={strokeOf(v, 'clock')} strokeWidth={1.3} style={dur(144)} />
          </g>
        </Motif>
      )}
      {eye > 0 && (
        <Motif v={v} id="eye">
          <g transform="translate(200 30)" opacity={0.4 + 0.5 * eye}>
            <path d="M-32 0 Q 0 -16 32 0 Q 0 16 -32 0 Z" fill="#050506" stroke={strokeOf(v, 'eye')} strokeWidth={0.9} />
            <g className="sc-look" style={dur(9)}>
              <circle r={7} fill="none" stroke={strokeOf(v, 'eye')} strokeWidth={0.9} />
              <circle r={3} fill={v.inked.includes('eye') ? INK : SILVER} />
            </g>
          </g>
        </Motif>
      )}
    </g>
  );
}

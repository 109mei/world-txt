import type { SceneView } from '../../store/scene';
import { DARK, dur, delay, Ghost, GROUND, H, HORIZON, m, Motif, PAPER, SHORE, SILVER, SILVER_DIM, strokeOf, W } from './common';
import { Person } from './People';

/** 海：波・船・氷・塩の浜・泡・海底の町・海の上の畑。海面が上がれば町の端が沈み、海が消えれば海底が現れる */
export function Sea({ v }: { v: SceneView }) {
  const gone = m(v, 'noSea');
  const high = m(v, 'seaHigh');
  // 海が干上がり始めた世界では、水面が下がり、岸が沖へ退く
  const level = HORIZON + 4 - 10 * high + 16 * gone;
  const shoreTop = SHORE - 14 * high + 12 * gone;
  const land = m(v, 'moreLand');
  const ice = m(v, 'ice');
  const fresh = m(v, 'freshSea');
  const ships = gone > 0.5 ? 0 : Math.round(1 + 2 * v.logistics);
  const seaFill = fresh > 0.3 ? 'var(--sc-sea-fresh)' : 'var(--sc-sea)';
  // 絵が二つ並んでも混ざらないよう、海の色ごとに別の名前にする
  const seaKind = fresh > 0.3 ? 'fresh' : 'salt';
  if (gone > 0.5) {
    return (
      <g>
        <Motif v={v} id="noSea">
          <path d={`M${SHORE - 4} ${GROUND} L${W} ${HORIZON + 2} L${W} ${H} L${SHORE + 6} ${H} Z`} fill="var(--sc-dry)" stroke={strokeOf(v, 'noSea', SILVER_DIM)} strokeWidth={0.8} />
          <path d={`M300 200 l10 -5 l-4 5 l12 1 M330 186 l-6 5 l10 2 M356 204 l8 -5 M320 172 l12 2`} fill="none" stroke={SILVER_DIM} strokeWidth={0.7} />
          <g transform="translate(338 196) rotate(-12)">
            <path d="M-12 0 L12 0 L8 5 L-8 5 Z M0 0 L0 -12 M0 -12 L7 -4" fill={DARK} stroke={strokeOf(v, 'noSea')} strokeWidth={0.8} />
          </g>
        </Motif>
        {/* 海が干上がった年は、水が引いていき、海の底が現れる（去年の海は、海の底の現れ方の濃さを受けないよう、外に置く） */}
        <Ghost v={v} when="noSea" kind="drain">
          <path d={`M${SHORE - 6} ${GROUND} L${W} ${HORIZON + 4} L${W} ${H} L${SHORE + 8} ${H} Z`} fill="var(--sc-sea)" stroke={SILVER_DIM} strokeWidth={0.8} />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M${SHORE + 14 + k * 6} ${HORIZON + 16 + k * 14} q 6 -2.4 12 0 t 12 0 t 12 0 t 12 0 t 12 0`} fill="none" stroke={PAPER} strokeWidth={0.6} opacity={0.28} />
          ))}
        </Ghost>
      </g>
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id={`sc-sea-${seaKind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={seaFill} />
          <stop offset="1" stopColor="var(--sc-sea-deep)" />
        </linearGradient>
      </defs>
      <Motif v={v} id={high > 0 ? 'seaHigh' : 'freshSea'}>
        <path
          d={`M${shoreTop - 6} ${GROUND} L${W} ${level} L${W} ${H} L${shoreTop + 8} ${H} Z`}
          fill={`url(#sc-sea-${seaKind})`}
          stroke={high > 0 ? strokeOf(v, 'seaHigh') : fresh > 0 ? strokeOf(v, 'freshSea') : SILVER_DIM}
          strokeWidth={0.8}
        />
        <line x1={shoreTop} y1={level} x2={W} y2={level} stroke={SILVER_DIM} strokeWidth={0.5} />
        {high > 0.3 && (
          <path d={`M${shoreTop - 30} ${GROUND + 18} Q ${shoreTop - 16} ${GROUND + 12} ${shoreTop} ${GROUND + 8}`} fill="none" stroke={strokeOf(v, 'seaHigh')} strokeWidth={1} opacity={0.8} />
        )}
        {/* 波 */}
        {ice < 0.6 &&
          [0, 1, 2, 3].map((k) => (
            <path
              key={k}
              className="sc-wave"
              d={`M${shoreTop + 14 + k * 6} ${level + 12 + k * 14} q 6 -2.4 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0`}
              fill="none"
              stroke={fresh > 0.3 ? strokeOf(v, 'freshSea', PAPER) : PAPER}
              strokeWidth={0.6}
              opacity={0.28}
              style={{ ...dur(4 + k), ...delay(k * 0.9) }}
            />
          ))}
      </Motif>
      {ice > 0.3 && (
        <Motif v={v} id="ice">
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${shoreTop + 20 + k * 22} ${level + 10 + (k % 2) * 16} l14 -3 l8 5 l-12 4 z`} fill={PAPER} opacity={0.45 * ice} stroke={SILVER} strokeWidth={0.4} />
          ))}
        </Motif>
      )}
      {m(v, 'saltSea') > 0 && (
        <Motif v={v} id="saltSea">
          <path d={`M${shoreTop - 4} ${GROUND + 2} L${shoreTop + 10} ${H}`} stroke={strokeOf(v, 'saltSea', PAPER)} strokeWidth={3} opacity={0.5 * m(v, 'saltSea')} />
          {[0, 1, 2, 3, 4].map((k) => (
            <circle key={k} cx={shoreTop + 2 + k * 2.4} cy={GROUND + 8 + k * 9} r={1} fill={PAPER} opacity={0.7} />
          ))}
        </Motif>
      )}
      {m(v, 'seaBubbles') > 0 && (
        <Motif v={v} id="seaBubbles">
          {Array.from({ length: 8 }, (_, i) => (
            <circle
              key={i}
              className="sc-bubble"
              cx={300 + i * 11}
              cy={H - 4}
              r={1 + (i % 3) * 0.6}
              fill="none"
              stroke={strokeOf(v, 'seaBubbles', PAPER)}
              strokeWidth={0.5}
              style={{ ...dur(4 + (i % 3)), ...delay(i * 0.6) }}
            />
          ))}
        </Motif>
      )}
      {m(v, 'seaCity') > 0 && (
        <Motif v={v} id="seaCity">
          {[312, 342, 368].map((x, i) => (
            <g key={x} transform={`translate(${x} ${H - 8 - (i % 2) * 6})`}>
              <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="rgb(var(--ink-rgb) / 0.08)" stroke={strokeOf(v, 'seaCity')} strokeWidth={0.8} />
              <rect x={-3} y={-5} width={2} height={3} fill={PAPER} opacity={0.8} />
              <rect x={1.5} y={-4} width={2} height={3} fill={PAPER} opacity={0.6} />
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'divers') > 0 && (
        <Motif v={v} id="divers">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${306 + i * 24} ${192 + (i % 2) * 8})`}>
              <g className="sc-swim" style={{ ...dur(6 + i), ...delay(i * 1.5) }}>
                <g transform="rotate(-80)">
                  <Person color={strokeOf(v, 'divers')} arms="up" coat={false} />
                </g>
              </g>
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'seaFields') > 0 && (
        <Motif v={v} id="seaFields">
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${308 + k * 36} ${level + 16 + k * 10})`}>
              <rect x={-12} y={-1} width={24} height={2.4} fill="var(--sc-fill)" stroke={strokeOf(v, 'seaFields')} strokeWidth={0.6} />
              {Array.from({ length: 6 }, (_, i) => (
                <line key={i} x1={-10 + i * 4} y1={-1} x2={-10 + i * 4} y2={-5} stroke={strokeOf(v, 'seaFields')} strokeWidth={0.7} />
              ))}
            </g>
          ))}
        </Motif>
      )}
      {land > 0 && (
        <Motif v={v} id="moreLand">
          <path d={`M318 ${level + 18} Q 340 ${level + 4 - 6 * land} 372 ${level + 16} Z`} fill="var(--sc-fill)" stroke={strokeOf(v, 'moreLand')} strokeWidth={0.8} />
          <path d={`M344 ${level + 8} L347 ${level + 1} L350 ${level + 8} Z`} fill={DARK} stroke={strokeOf(v, 'moreLand')} strokeWidth={0.6} />
        </Motif>
      )}
      {/* 港：岸壁と杭、荷を積むクレーン。物流が盛んなら荷を吊る */}
      {ice < 0.6 && (
        <g>
          <path d={`M${shoreTop - 2} ${GROUND - 2} L${shoreTop + 18} ${GROUND - 2} M${shoreTop + 4} ${GROUND - 2} L${shoreTop + 4} ${GROUND + 3} M${shoreTop + 10} ${GROUND - 2} L${shoreTop + 10} ${GROUND + 3} M${shoreTop + 16} ${GROUND - 2} L${shoreTop + 16} ${GROUND + 3}`} fill="none" stroke={SILVER} strokeWidth={0.9} />
          <path
            d={`M${shoreTop + 8} ${GROUND - 2} L${shoreTop + 8} ${GROUND - 27} M${shoreTop + 3} ${GROUND - 24} L${shoreTop + 24} ${GROUND - 24} M${shoreTop + 8} ${GROUND - 27} L${shoreTop + 24} ${GROUND - 24} M${shoreTop + 8} ${GROUND - 27} L${shoreTop + 3} ${GROUND - 24} M${shoreTop + 6} ${GROUND - 2} L${shoreTop + 8} ${GROUND - 6} L${shoreTop + 10} ${GROUND - 2}`}
            fill="none"
            stroke={SILVER_DIM}
            strokeWidth={0.7}
          />
          <line x1={shoreTop + 22} y1={GROUND - 24} x2={shoreTop + 22} y2={GROUND - 15} stroke={SILVER_DIM} strokeWidth={0.4} />
          {v.logistics > 0.3 && <rect x={shoreTop + 20} y={GROUND - 15} width={4} height={3} fill={DARK} stroke={SILVER} strokeWidth={0.5} />}
        </g>
      )}
      {/* 船：物流が盛んなほど多い。遠い（上の）船ほど小さい */}
      {Array.from({ length: ice > 0.6 ? 0 : ships }, (_, i) => (
        <g key={i} transform={`translate(${shoreTop + 26 + i * 30} ${level + 9 + i * 12}) scale(${0.8 + 0.15 * i})`}>
          <g className="sc-sail" style={{ ...dur(16 + i * 5), ...delay(i * 4) }}>
            <path d="M-8 0 L8 0 L5 3.5 L-5 3.5 Z" fill={DARK} stroke={SILVER} strokeWidth={0.7} />
            <path d="M0 0 L0 -9 L6 -2 Z" fill="var(--sc-fill)" stroke={SILVER} strokeWidth={0.6} />
            {v.fossil > 0.5 && <circle cx={-3} cy={-4} r={1.4} fill={SILVER_DIM} className="sc-smoke" />}
          </g>
        </g>
      ))}
    </g>
  );
}

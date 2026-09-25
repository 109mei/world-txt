import type { SceneView } from '../../store/scene';
import { BAD, DARK, dur, delay, Ghost, GOOD, GROUND, INK, m, Motif, PAPER, PLAZA, ROAD, rnd, SHORE, SILVER, SILVER_DIM, SILVER_FAINT, strokeOf, WARN } from './common';

/** 町の塔（左の端・幅・高さ・尖塔） */
type Tower = { x: number; w: number; h: number; spire: boolean };
const TOWERS: Tower[] = [
  { x: 130, w: 12, h: 30, spire: false },
  { x: 144, w: 12, h: 42, spire: true },
  { x: 158, w: 14, h: 54, spire: false },
  { x: 174, w: 18, h: 78, spire: true },
  { x: 194, w: 14, h: 58, spire: true },
  { x: 210, w: 12, h: 46, spire: false },
  { x: 224, w: 14, h: 36, spire: true },
  { x: 240, w: 10, h: 26, spire: false },
];
/** 巨大な都市で増える塔 */
const MEGA: { x: number; w: number; h: number; spire: boolean }[] = [
  { x: 166, w: 8, h: 96, spire: true },
  { x: 204, w: 8, h: 88, spire: false },
  { x: 250, w: 10, h: 64, spire: true },
];

function towerScale(v: SceneView): number {
  let s = 0.45 + 0.55 * v.civ;
  s *= 1 + 0.5 * m(v, 'megacity');
  s *= 1 - 0.4 * m(v, 'heavy');
  return s;
}

/** 並行世界：町の向こうに、もう一つの町がかすむ */
export function Parallel({ v }: { v: SceneView }) {
  if (m(v, 'parallel') <= 0) return null;
  const s = towerScale(v);
  return (
    <Motif v={v} id="parallel">
      <g transform="translate(48 -10)" opacity={0.25 + 0.3 * m(v, 'parallel')}>
        {TOWERS.map((t, i) => (
          <rect key={i} x={t.x} y={GROUND - t.h * s} width={t.w} height={t.h * s} fill="none" stroke={strokeOf(v, 'parallel')} strokeWidth={0.6} strokeDasharray="2 2" />
        ))}
      </g>
    </Motif>
  );
}

/** 町：塔と窓・工場・原子炉・送電線・油井・学校・病院・研究所・祠・機械の塔・像・旗・壁 */
export function City({ v }: { v: SceneView }) {
  const failed = v.ended === 'failed';
  const villages = m(v, 'villages') > 0.5;
  const s = towerScale(v);
  const ruined = v.civ < 0.35 || m(v, 'ruins') > 0.5;
  const towers = villages ? [] : [...TOWERS, ...(m(v, 'megacity') > 0.3 ? MEGA : [])];
  const dark = m(v, 'noPower');
  let light = failed ? 0 : Math.max(0, Math.min(1, 0.15 + 0.85 * (v.energy * 0.6 + v.people * 0.4))) * (1 - dark) * (1 - 0.9 * m(v, 'noPeople'));
  if (m(v, 'sleepless') > 0.3) light = Math.max(light, 0.95 * (1 - dark));
  const lift = m(v, 'float') > 0.5 ? -6 : 0;
  const color = (i: number) => (m(v, 'megacity') > 0 && i >= TOWERS.length ? strokeOf(v, 'megacity') : m(v, 'heavy') > 0 ? strokeOf(v, 'heavy') : SILVER);
  const windows: { x: number; y: number; key: string; mega: boolean }[] = [];
  towers.forEach((t, ti) => {
    const top = GROUND - t.h * s;
    const cols = t.w >= 14 ? [t.x + 3, t.x + t.w - 5] : [t.x + t.w / 2 - 1];
    for (let y = GROUND - 9; y > top + 5; y -= 7) for (const x of cols) windows.push({ x, y, key: `${ti}-${x}-${y}`, mega: ti >= TOWERS.length });
  });
  const order = windows.map((w, i) => ({ w, o: rnd(v.seed, 2000 + i) })).sort((a, b) => a.o - b.o);
  const lit = Math.round(order.length * light);
  const tower = (t: Tower, i: number) => {
    const top = GROUND - t.h * s;
    const roof = ruined
      ? `L${t.x + t.w} ${top + 4} L${t.x + t.w * 0.7} ${top} L${t.x + t.w * 0.45} ${top + 6} L${t.x + t.w * 0.2} ${top + 1} L${t.x} ${top + 5}`
      : t.spire
        ? `L${t.x + t.w} ${top} L${t.x + t.w / 2} ${top - t.w * 0.9} L${t.x} ${top}`
        : `L${t.x + t.w} ${top} L${t.x} ${top}`;
    return <path key={i} d={`M${t.x} ${GROUND} L${t.x + t.w} ${GROUND} ${roof} Z`} fill="#121318" stroke={ruined && m(v, 'ruins') > 0 ? strokeOf(v, 'ruins') : color(i)} strokeWidth={0.8} />;
  };
  const windowRects = (mega: boolean) =>
    order.map(({ w }, i) =>
      w.mega !== mega ? null : (
        <rect
          key={w.key}
          x={w.x}
          y={w.y}
          width={2}
          height={3}
          fill={i < lit ? '#f4f1e6' : '#23252b'}
          opacity={i < lit ? 0.9 : 1}
          className={i < lit && m(v, 'sleepless') > 0.3 && i % 7 === 0 ? 'sc-twinkle' : undefined}
        />
      ),
    );
  return (
    <g transform={`translate(0 ${lift})`}>
      <Plant v={v} />
      {villages ? (
        <Motif v={v} id="villages">
          {[122, 150, 186, 214, 246].map((x, i) => (
            <g key={x} transform={`translate(${x} ${GROUND - (i % 2) * 3})`}>
              <path d="M-7 0 L-7 -7 L0 -13 L7 -7 L7 0 Z" fill={DARK} stroke={strokeOf(v, 'villages')} strokeWidth={0.8} />
              <rect x={-1.5} y={-5} width={3} height={5} fill={light > 0.2 ? '#f4f1e6' : '#23252b'} opacity={0.8} />
            </g>
          ))}
        </Motif>
      ) : (
        <>
          {/* 巨大な塔は、もとの町とは別に描く（書き換えた年に、巨大な塔だけが地面から伸びていく） */}
          {towers.length > TOWERS.length && (
            <Motif v={v} id="megacity">
              {towers.slice(TOWERS.length).map((t, i) => tower(t, TOWERS.length + i))}
              {windowRects(true)}
            </Motif>
          )}
          <Motif v={v} id={m(v, 'heavy') > 0 ? 'heavy' : 'ruins'}>
            {towers.slice(0, TOWERS.length).map((t, i) => tower(t, i))}
            {windowRects(false)}
            {m(v, 'ruins') > 0 &&
              towers.slice(0, 6).map((t, i) => <path key={`v${i}`} d={`M${t.x + 1} ${GROUND} q 3 -8 -1 -16 q 4 -6 1 -12`} fill="none" stroke={GOOD} strokeWidth={0.6} opacity={0.6 * m(v, 'ruins')} />)}
          </Motif>
          {/* 電気が消えた年は、灯っていた窓が明滅して消えていく */}
          {dark > 0.5 && (
            <Ghost v={v} when="noPower" kind="flickerOut">
              {order.slice(0, Math.round(order.length * 0.6)).map(({ w }) => (
                <rect key={w.key} x={w.x} y={w.y} width={2} height={3} fill="#f4f1e6" opacity={0.9} />
              ))}
            </Ghost>
          )}
        </>
      )}
      {m(v, 'noPower') > 0 && (
        <Motif v={v} id="noPower">
          <path d="M118 150 L118 164 M112 152 L124 152" stroke={strokeOf(v, 'noPower', SILVER_DIM)} strokeWidth={0.7} />
        </Motif>
      )}
      {/* 村に戻り始めた世界では、町のはずれに小屋が建つ */}
      {!villages && m(v, 'villages') > 0 && (
        <Motif v={v} id="villages">
          {[118, 276].map((x) => (
            <g key={x} transform={`translate(${x} ${GROUND})`}>
              <path d="M-6 0 L-6 -6 L0 -11 L6 -6 L6 0 Z" fill={DARK} stroke={strokeOf(v, 'villages')} strokeWidth={0.8} />
              <rect x={-1.5} y={-4.5} width={3} height={4.5} fill={light > 0.2 ? '#f4f1e6' : '#23252b'} opacity={0.8} />
            </g>
          ))}
        </Motif>
      )}
      <Landmarks v={v} s={s} villages={villages} />
      <Borders v={v} s={s} villages={villages} />
      <Industry v={v} s={s} />
    </g>
  );
}

/** 発電：原子炉・核融合・尽きない電池・無から生まれる光・送電線 */
function Plant({ v }: { v: SceneView }) {
  const reactor = m(v, 'noReactor') < 0.6;
  const wireless = m(v, 'wireless') > 0.4;
  return (
    <g>
      {reactor && (
        <Motif v={v} id={m(v, 'reactor') > 0 ? 'reactor' : 'noReactor'}>
          <path
            d={`M100 ${GROUND} Q 104 ${GROUND - 12} 101 ${GROUND - 22} L115 ${GROUND - 22} Q 112 ${GROUND - 12} 116 ${GROUND} Z`}
            fill="#15161b"
            stroke={m(v, 'reactor') > 0 ? strokeOf(v, 'reactor') : SILVER}
            strokeWidth={0.8}
          />
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              className="sc-smoke"
              cx={108 + k * 2}
              cy={GROUND - 26 - k * 5}
              r={3 + k * 1.5 + 2 * m(v, 'reactor')}
              fill="#c9ced8"
              opacity={0.5}
              style={{ ...dur(5), ...delay(k * 1.4) }}
            />
          ))}
        </Motif>
      )}
      {m(v, 'noReactor') > 0 && (
        <Motif v={v} id="noReactor">
          <path d={`M100 ${GROUND} L101 ${GROUND - 6} L115 ${GROUND - 6} L116 ${GROUND}`} fill="#15161b" stroke={strokeOf(v, 'noReactor', SILVER_DIM)} strokeWidth={0.7} strokeDasharray="2 1.5" />
        </Motif>
      )}
      {m(v, 'fusion') > 0 && (
        <Motif v={v} id="fusion">
          <g transform={`translate(92 ${GROUND - 14})`}>
            <ellipse rx={9} ry={4} fill="none" stroke={strokeOf(v, 'fusion')} strokeWidth={1.4} />
            <circle className="sc-pulse" r={2.6} fill={PAPER} style={dur(1.6)} />
            <circle r={12} fill="url(#sc-glow-ink)" opacity={0.6} />
          </g>
        </Motif>
      )}
      {m(v, 'battery') > 0 && (
        <Motif v={v} id="battery">
          <g transform={`translate(256 ${GROUND})`}>
            <rect x={-4} y={-26} width={8} height={26} rx={2} fill="#15161b" stroke={strokeOf(v, 'battery')} strokeWidth={0.8} />
            <rect x={-2} y={-29} width={4} height={3} fill={strokeOf(v, 'battery')} />
            <g opacity={0.5}>
              <rect className="sc-pulse" x={-2.4} y={-22} width={4.8} height={18} fill={strokeOf(v, 'battery', GOOD)} style={dur(2)} />
            </g>
          </g>
        </Motif>
      )}
      {m(v, 'freeEnergy') > 0 && (
        <Motif v={v} id="freeEnergy">
          {[150, 190, 230].map((x, i) => (
            <g key={x} transform={`translate(${x} ${GROUND - 94 + (i % 2) * 8})`}>
              <g className="sc-hover" style={{ ...dur(4 + i), ...delay(i) }}>
                <circle r={7} fill="url(#sc-glow-ink)" />
                <circle r={2} fill={PAPER} />
              </g>
            </g>
          ))}
        </Motif>
      )}
      {/* 送電線（導線なしで届く世界では、光る塔だけ） */}
      {wireless ? (
        <Motif v={v} id="wireless">
          <g transform={`translate(120 ${GROUND})`}>
            <path d="M-3 0 L0 -26 L3 0 Z M-2 -10 L2 -10 M-1.5 -18 L1.5 -18" fill="none" stroke={strokeOf(v, 'wireless')} strokeWidth={0.8} />
            <circle className="sc-pulse" cx={0} cy={-28} r={3} fill="none" stroke={strokeOf(v, 'wireless')} strokeWidth={0.7} style={dur(1.4)} />
            <circle className="sc-pulse" cx={0} cy={-28} r={7} fill="none" stroke={strokeOf(v, 'wireless')} strokeWidth={0.4} style={{ ...dur(1.4), ...delay(0.5) }} />
          </g>
        </Motif>
      ) : (
        // 導線のない送電が広まり始めた世界では、送電線が途切れがちになる
        <g stroke={m(v, 'noPower') > 0.5 ? SILVER_FAINT : SILVER_DIM} strokeWidth={0.6} fill="none" strokeDasharray={m(v, 'wireless') > 0 ? '3 2' : undefined}>
          <path d={`M110 ${GROUND - 20} L120 ${GROUND - 20} M115 ${GROUND - 20} L118 ${GROUND} M115 ${GROUND - 20} L112 ${GROUND}`} />
          <path d={`M110 ${GROUND - 18} Q 124 ${GROUND - 12} 134 ${GROUND - 20}`} />
        </g>
      )}
    </g>
  );
}

/** 学校・病院・研究所・祠・機械の塔・螺旋・像・カメラ・電波塔・競技場・灯籠・市場 */
function Landmarks({ v, s, villages }: { v: SceneView; s: number; villages: boolean }) {
  const tall = TOWERS[3]!;
  const antennaTop = GROUND - tall.h * s - tall.w * 0.9;
  const scienceGlow = Math.max(m(v, 'lab'), v.science > 0.75 ? 0.4 : 0);
  return (
    <g>
      {/* 電波塔：いちばん高い塔の上（塔のない村の世界にはない） */}
      <Motif v={v} id="screensOff" className={villages ? 'sc-none' : undefined}>
        <line
          x1={tall.x + tall.w / 2}
          y1={antennaTop}
          x2={tall.x + tall.w / 2}
          y2={antennaTop - 10}
          stroke={m(v, 'screensOff') > 0.3 ? strokeOf(v, 'screensOff', SILVER_DIM) : SILVER}
          strokeWidth={0.7}
          strokeDasharray={m(v, 'screensOff') > 0.3 ? '1.5 1.5' : undefined}
        />
        {m(v, 'screensOff') < 0.3 && <circle className="sc-blink" cx={tall.x + tall.w / 2} cy={antennaTop - 10} r={1} fill={BAD} style={dur(1.6)} />}
      </Motif>
      {/* 学校 */}
      <Motif v={v} id="noSchool">
        <g transform={`translate(146 ${GROUND})`}>
          <path d="M-7 0 L-7 -9 L7 -9 L7 0 M-8 -9 L0 -14 L8 -9 M0 -14 L0 -18" fill={DARK} stroke={m(v, 'noSchool') > 0 ? strokeOf(v, 'noSchool') : SILVER} strokeWidth={0.7} />
          <circle cx={0} cy={-16} r={1.2} fill={m(v, 'noSchool') > 0.3 ? 'none' : WARN} stroke={SILVER} strokeWidth={0.4} />
          {m(v, 'noSchool') > 0.3 && <line x1={-3} y1={-19} x2={3} y2={-13} stroke={strokeOf(v, 'noSchool')} strokeWidth={0.6} />}
        </g>
      </Motif>
      {/* 病院 */}
      <Motif v={v} id={m(v, 'cureAll') > 0 ? 'cureAll' : 'noMedicine'}>
        <g transform={`translate(214 ${GROUND})`}>
          <rect
            x={-8}
            y={-12}
            width={16}
            height={12}
            fill={DARK}
            stroke={m(v, 'cureAll') > 0 ? strokeOf(v, 'cureAll') : m(v, 'noMedicine') > 0 ? strokeOf(v, 'noMedicine') : SILVER}
            strokeWidth={0.7}
          />
          <path d="M-1 -10 L1 -10 L1 -8 L3 -8 L3 -6 L1 -6 L1 -4 L-1 -4 L-1 -6 L-3 -6 L-3 -8 L-1 -8 Z" fill={m(v, 'noMedicine') > 0.3 ? '#23252b' : BAD} opacity={0.9} />
          {m(v, 'cureAll') > 0 && <circle className="sc-pulse" cx={0} cy={-7} r={8} fill="url(#sc-glow-ink)" style={dur(2.4)} />}
        </g>
      </Motif>
      {/* 研究所（天文台の丸屋根） */}
      <Motif v={v} id={m(v, 'labDark') > 0 ? 'labDark' : 'lab'}>
        <g transform={`translate(246 ${GROUND})`}>
          <path d="M-8 0 L-8 -6 A8 8 0 0 1 8 -6 L8 0 Z" fill={DARK} stroke={m(v, 'lab') > 0 ? strokeOf(v, 'lab') : m(v, 'labDark') > 0 ? strokeOf(v, 'labDark') : SILVER} strokeWidth={0.7} />
          <path d="M0 -14 L5 -20" stroke={SILVER} strokeWidth={1} />
          {m(v, 'labDark') < 0.5 && scienceGlow > 0 && (
            <g opacity={scienceGlow}>
              <circle className="sc-pulse" cx={0} cy={-8} r={6} fill="url(#sc-glow-ink)" style={dur(3)} />
            </g>
          )}
        </g>
      </Motif>
      {/* 祠 */}
      <Motif v={v} id={m(v, 'noTemple') > 0 ? 'noTemple' : 'temple'}>
        <g transform={`translate(124 ${GROUND})`}>
          <path
            d="M-5 0 L-5 -7 L5 -7 L5 0 M-7 -7 L0 -11 L7 -7"
            fill={DARK}
            stroke={m(v, 'temple') > 0 ? strokeOf(v, 'temple') : m(v, 'noTemple') > 0 ? strokeOf(v, 'noTemple', SILVER_DIM) : SILVER_DIM}
            strokeWidth={0.7}
          />
          <circle cx={0} cy={-4} r={1.2} fill={m(v, 'noTemple') > 0.3 ? '#23252b' : WARN} opacity={0.9} className={m(v, 'temple') > 0 ? 'sc-pulse' : undefined} style={dur(2.8)} />
        </g>
      </Motif>
      {m(v, 'aiCore') > 0 && (
        <Motif v={v} id="aiCore">
          <g transform={`translate(234 ${GROUND})`}>
            <path d="M-5 0 L-3 -62 L3 -62 L5 0 Z" fill="#0b0c10" stroke={strokeOf(v, 'aiCore')} strokeWidth={0.9} />
            {[10, 22, 34, 46].map((y, k) => (
              <line key={y} className="sc-pulse" x1={-3} y1={-y} x2={3} y2={-y} stroke={strokeOf(v, 'aiCore', INK)} strokeWidth={0.8} style={{ ...dur(2), ...delay(k * 0.4) }} />
            ))}
            <circle cx={0} cy={-62} r={10 * m(v, 'aiCore')} fill="url(#sc-glow-ink)" />
          </g>
        </Motif>
      )}
      {m(v, 'dna') > 0 && (
        <Motif v={v} id="dna">
          <g transform="translate(262 118)">
            <g className="sc-spin-slow" style={dur(12)}>
              <path d="M-4 -12 C 4 -8, -4 -4, 4 0 C -4 4, 4 8, -4 12 M4 -12 C -4 -8, 4 -4, -4 0 C 4 4, -4 8, 4 12" fill="none" stroke={strokeOf(v, 'dna')} strokeWidth={0.8} />
            </g>
          </g>
        </Motif>
      )}
      {m(v, 'statue') > 0 && (
        <Motif v={v} id="statue">
          <g transform={`translate(196 ${GROUND + 6}) scale(3.4)`}>
            <path d="M-3 0 L3 0 L3 -1.6 L-3 -1.6 Z" fill={DARK} stroke={strokeOf(v, 'statue')} strokeWidth={0.3} />
            <g transform="translate(0 -1.6)">
              <circle cx={0} cy={-9.6} r={1.7} fill={DARK} stroke={strokeOf(v, 'statue')} strokeWidth={0.3} />
              <path d="M0 -7.9 L0 -3.2 L-1.5 0 M0 -3.2 L1.5 0 M0 -7 L2 -10.4 M0 -7 L-1.8 -4 M-2 -3.3 L0 -7.6 L2 -3.3 Z" fill={DARK} stroke={strokeOf(v, 'statue')} strokeWidth={0.35} />
            </g>
          </g>
        </Motif>
      )}
      {m(v, 'cameras') > 0 && (
        <Motif v={v} id="cameras">
          {[148, 180, 212, 236].map((x, i) => (
            <g key={x} transform={`translate(${x} ${GROUND - 20 - (i % 2) * 10})`}>
              <rect x={-2.4} y={-1.4} width={4.8} height={2.8} fill={DARK} stroke={strokeOf(v, 'cameras')} strokeWidth={0.5} />
              <circle className="sc-blink" cx={1.4} cy={0} r={0.7} fill={BAD} style={{ ...dur(1.8), ...delay(i * 0.4) }} />
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'stadium') > 0 && (
        <Motif v={v} id="stadium">
          <g transform={`translate(160 ${GROUND + 5})`}>
            <ellipse rx={22} ry={6} fill="#14151a" stroke={strokeOf(v, 'stadium')} strokeWidth={0.9} />
            <ellipse rx={15} ry={3.2} fill="none" stroke={SILVER_DIM} strokeWidth={0.5} />
            {[-12, -4, 4, 12].map((x, k) => (
              <line key={x} className="sc-twinkle" x1={x} y1={-6} x2={x} y2={-10} stroke={PAPER} strokeWidth={0.6} style={{ ...dur(1.4), ...delay(k * 0.3) }} />
            ))}
          </g>
        </Motif>
      )}
      <Market v={v} />
      {(m(v, 'lanterns') > 0 || v.society > 0.8) && (
        <Motif v={v} id="lanterns">
          <path d={`M126 ${GROUND + 4} Q 190 ${GROUND + 14} 256 ${GROUND + 4}`} fill="none" stroke={SILVER_DIM} strokeWidth={0.4} />
          {Array.from({ length: 9 }, (_, i) => {
            const t = (i + 1) / 10;
            const x = 126 + 130 * t;
            const y = GROUND + 4 + 10 * 4 * t * (1 - t);
            return <circle key={i} className="sc-twinkle" cx={x} cy={y + 1.6} r={1.3} fill={strokeOf(v, 'lanterns', WARN)} opacity={0.9} style={{ ...dur(2.4), ...delay(i * 0.3) }} />;
          })}
        </Motif>
      )}
      {m(v, 'crime') > 0 && (
        <Motif v={v} id="crime">
          {/* 路地の暗がりに潜む影と、割れた窓 */}
          {[128, 166, 238, 262].map((x, i) => (
            <g key={x} transform={`translate(${x} ${GROUND + 4}) scale(1.4)`}>
              <g className="sc-sway" style={{ ...dur(3 + i), ...delay(i) }}>
                <path d="M-2.4 0 L-2.2 -8 Q 0 -12 2.2 -8 L2.4 0 Z" fill="#000" stroke={strokeOf(v, 'crime', SILVER_DIM)} strokeWidth={0.5} />
                <circle cx={-0.8} cy={-8.2} r={0.45} fill={BAD} />
                <circle cx={0.8} cy={-8.2} r={0.45} fill={BAD} />
              </g>
            </g>
          ))}
          <path d="M180 142 l3 3 l-2 2 l3 3 M212 150 l-2 3 l2 1" fill="none" stroke={BAD} strokeWidth={0.6} opacity={0.8} />
        </Motif>
      )}
    </g>
  );
}

/** 市場：にぎわう・空の・閉ざされた店、物々交換、金貨、光る支払い端末 */
function Market({ v }: { v: SceneView }) {
  const busy = m(v, 'marketBusy');
  const empty = Math.max(m(v, 'marketEmpty'), v.food < 0.3 ? 0.6 : 0);
  const closed = m(v, 'marketClosed');
  const stalls = [150, 176, 228, 252];
  const id = closed > 0 ? 'marketClosed' : busy > 0 ? 'marketBusy' : 'marketEmpty';
  const goods = closed > 0.5 ? 0 : Math.round(3 * (1 - empty) + 2 * busy);
  const barter = m(v, 'noMoney') > 0.3 || !v.money;
  return (
    <g>
      <Motif v={v} id={id}>
        {stalls.slice(0, busy > 0.5 ? 4 : 3).map((x, i) => (
          <g key={x} transform={`translate(${x} ${PLAZA - 8})`}>
            <path d="M-7 -6 L7 -6 L6 -9 L-6 -9 Z" fill="#1a1b21" stroke={i === 3 || busy > 0 || empty > 0 || closed > 0 ? strokeOf(v, id) : SILVER} strokeWidth={0.6} />
            <path d="M-6 -6 L-6 0 M6 -6 L6 0 M-7 0 L7 0" fill="none" stroke={SILVER_DIM} strokeWidth={0.6} />
            {Array.from({ length: goods }, (_, k) => (
              <circle key={k} cx={-4 + k * 2} cy={-1.4} r={1} fill={barter ? '#d8c79c' : PAPER} opacity={0.8} />
            ))}
            {closed > 0.5 && <path d="M-5 -5 L5 -1 M5 -5 L-5 -1" stroke={strokeOf(v, 'marketClosed')} strokeWidth={0.6} />}
          </g>
        ))}
      </Motif>
      {/* 物々交換：籠と袋を取り替える */}
      {barter && (
        <Motif v={v} id="noMoney">
          <g transform={`translate(202 ${PLAZA - 24})`}>
            <path d="M-12 2 Q -8 7 -4 2 L-5 -1 L-11 -1 Z" fill="#2a261c" stroke={strokeOf(v, 'noMoney')} strokeWidth={0.6} />
            <path d="M5 3 Q 4 -3 8 -4 Q 12 -3 11 3 Z" fill="#2a261c" stroke={strokeOf(v, 'noMoney')} strokeWidth={0.6} />
            <path className="sc-pulse" d="M-3 -4 L3 -4 M1 -6 L3 -4 L1 -2 M3 0 L-3 0 M-1 -2 L-3 0 L-1 2" fill="none" stroke={strokeOf(v, 'noMoney')} strokeWidth={0.6} style={dur(1.8)} />
          </g>
        </Motif>
      )}
      {/* 金貨の山 */}
      {m(v, 'coins') > 0 && (
        <Motif v={v} id="coins">
          {[stalls[0]!, stalls[2]!].map((x, i) => (
            <g key={x} transform={`translate(${x + 9} ${PLAZA - 9})`}>
              {[0, 1, 2].map((k) => (
                <ellipse key={k} cx={0} cy={-k * 1.3} rx={2.2} ry={0.9} fill={WARN} stroke={strokeOf(v, 'coins', DARK)} strokeWidth={0.3} />
              ))}
              <path className="sc-twinkle" d="M2 -6 l0.6 -1.6 l0.6 1.6 l1.6 0.6 l-1.6 0.6 l-0.6 1.6 l-0.6 -1.6 l-1.6 -0.6 z" fill={PAPER} style={{ ...dur(1.6), ...delay(i) }} />
            </g>
          ))}
        </Motif>
      )}
      {/* 光る支払い端末 */}
      {m(v, 'cashless') > 0 && (
        <Motif v={v} id="cashless">
          {stalls.slice(0, 3).map((x, i) => (
            <g key={x} transform={`translate(${x + 8} ${PLAZA - 10})`}>
              <rect x={-1.8} y={-3} width={3.6} height={4.6} rx={0.6} fill="#0f141c" stroke={strokeOf(v, 'cashless', INK)} strokeWidth={0.5} />
              <path
                className="sc-pulse"
                d="M-1.6 -5 Q 0 -6.4 1.6 -5 M-2.8 -6.4 Q 0 -8.6 2.8 -6.4"
                fill="none"
                stroke={strokeOf(v, 'cashless', INK)}
                strokeWidth={0.5}
                style={{ ...dur(1.4), ...delay(i * 0.4) }}
              />
            </g>
          ))}
        </Motif>
      )}
      {/* 金のきらめき：塔の壁と、店先の金の延べ棒 */}
      {m(v, 'gold') > 0 && (
        <Motif v={v} id="gold">
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} className="sc-twinkle" cx={134 + i * 10} cy={GROUND - 10 - (i % 3) * 14} r={1.5} fill={WARN} style={{ ...dur(1.5), ...delay(i * 0.35) }} />
          ))}
          <g transform={`translate(${stalls[1]!} ${PLAZA - 12})`}>
            <path d="M-5 0 L-4 -2 L0 -2 L1 0 Z M1 0 L2 -2 L6 -2 L7 0 Z M-2 -2 L-1 -4 L3 -4 L4 -2 Z" fill={WARN} stroke={strokeOf(v, 'gold', DARK)} strokeWidth={0.3} />
          </g>
        </Motif>
      )}
    </g>
  );
}

/** 国境：ふだんは門と柱。緊張が高いと壁と見張りの塔、国境のない世界では何もない。旗の数も変わる */
/** 旗を立てる所：塔の先（村の世界では家の屋根） */
const FLAG_TOWERS = [3, 1, 4, 6, 2, 5, 0, 7];
const HUTS = [122, 150, 186, 214, 246];
function flagAnchor(i: number, s: number, villages: boolean): [number, number] {
  if (villages) return [HUTS[i % HUTS.length]!, GROUND - 13 - (i % 2) * 3];
  const t = TOWERS[FLAG_TOWERS[i % FLAG_TOWERS.length]!]!;
  return [t.x + t.w / 2, GROUND - t.h * s - (t.spire ? t.w * 0.9 : 0)];
}

function Borders({ v, s, villages }: { v: SceneView; s: number; villages: boolean }) {
  const none = m(v, 'noBorders');
  const walls = Math.max(m(v, 'walls'), v.peace < 0.35 ? (0.35 - v.peace) * 3 : 0) * (1 - none);
  const flags = m(v, 'oneFlag') > 0.3 ? 0 : 2 + Math.round(6 * m(v, 'flags'));
  const flagColors = [SILVER, PAPER, SILVER_DIM];
  return (
    <g>
      {none < 0.6 &&
        [114, 280].map((x) => (
          <g key={x} transform={`translate(${x} ${GROUND})`}>
            <line x1={0} y1={0} x2={0} y2={-8 - 16 * walls} stroke={walls > 0.2 ? strokeOf(v, 'walls') : SILVER_DIM} strokeWidth={1.2 + 2 * walls} />
            {walls > 0.3 && <path d={`M-3 ${-24 * walls} L3 ${-24 * walls} L3 ${-24 * walls - 5} L-3 ${-24 * walls - 5} Z`} fill={DARK} stroke={strokeOf(v, 'walls')} strokeWidth={0.6} />}
          </g>
        ))}
      {none > 0 && (
        <Motif v={v} id="noBorders">
          <path d={`M110 ${GROUND + 1} L118 ${GROUND - 4} M276 ${GROUND + 1} L284 ${GROUND - 4}`} stroke={strokeOf(v, 'noBorders', SILVER_DIM)} strokeWidth={0.8} strokeDasharray="2 2" />
        </Motif>
      )}
      <Motif v={v} id={m(v, 'oneFlag') > 0 ? 'oneFlag' : 'flags'}>
        {Array.from({ length: flags }, (_, i) => {
          const [x, y] = flagAnchor(i, s, villages);
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <line x1={0} y1={0} x2={0} y2={-8} stroke={SILVER} strokeWidth={0.5} />
              <path
                className="sc-flag"
                d="M0 -8 L6 -6.5 L0 -5 Z"
                fill={m(v, 'flags') > 0 && i >= 2 ? strokeOf(v, 'flags') : flagColors[i % flagColors.length]}
                style={{ ...dur(1.4), ...delay(i * 0.3) }}
              />
            </g>
          );
        })}
        {m(v, 'oneFlag') > 0 && (
          <g transform={`translate(${flagAnchor(0, s, villages).join(' ')})`}>
            <line x1={0} y1={0} x2={0} y2={-16} stroke={SILVER} strokeWidth={0.7} />
            <path className="sc-flag" d="M0 -16 L16 -13 L0 -9 Z" fill={strokeOf(v, 'oneFlag')} style={dur(1.8)} />
            <circle cx={6} cy={-12.6} r={1.4} fill="none" stroke={DARK} strokeWidth={0.5} />
          </g>
        )}
      </Motif>
    </g>
  );
}

/** 工場と煙・油井・道と車・瞬間移動の輪・置かれた武器 */
function Industry({ v, s }: { v: SceneView; s: number }) {
  const idle = m(v, 'factoryIdle');
  const steam = m(v, 'steam');
  const smoke = Math.max(0, Math.min(1, v.industry * 0.5 + v.war * 0.3 + 0.3 * m(v, 'smog'))) * (1 - idle);
  const smokeFill = steam > 0.3 ? '#e4e6ea' : v.war > 0 ? '#5a5d64' : '#8e9299';
  const pumpDry = m(v, 'oilDry');
  const gush = m(v, 'oilGush');
  const cars = Math.round(1 + 3 * v.logistics);
  const auto = m(v, 'autoCars') > 0;
  const slide = m(v, 'slide') > 0.3;
  const chimneyTop = GROUND - 44 * Math.max(0.6, s);
  return (
    <g>
      <Motif v={v} id={idle > 0 ? 'factoryIdle' : 'steam'}>
        <path
          d={`M258 ${GROUND} L258 ${GROUND - 14} L264 ${GROUND - 18} L270 ${GROUND - 14} L270 ${GROUND} Z M266 ${GROUND - 14} L266 ${chimneyTop} L270 ${chimneyTop} L270 ${GROUND - 14}`}
          fill="#121318"
          stroke={idle > 0 ? strokeOf(v, 'factoryIdle') : SILVER}
          strokeWidth={0.8}
        />
        {smoke > 0.05 &&
          [0, 1, 2, 3].map((k) => (
            <circle
              key={k}
              className="sc-smoke"
              cx={268 + k * 3}
              cy={chimneyTop - 5 - k * 7}
              r={3 + k * 2}
              fill={steam > 0.3 ? smokeFill : smokeFill}
              stroke={steam > 0.3 && k === 0 ? strokeOf(v, 'steam', 'none') : 'none'}
              strokeWidth={0.5}
              opacity={smoke}
              style={{ ...dur(5), ...delay(k * 1.2) }}
            />
          ))}
      </Motif>
      {/* 油井 */}
      <Motif v={v} id={gush > 0 ? 'oilGush' : 'oilDry'}>
        <g transform={`translate(${SHORE - 8} ${GROUND + 2})`}>
          <path d="M-5 0 L0 -8 L5 0" fill="none" stroke={pumpDry > 0.3 ? strokeOf(v, 'oilDry', SILVER_DIM) : SILVER} strokeWidth={0.7} />
          <g transform="translate(0 -8)">
            <g className={pumpDry > 0.5 || v.fossil < 0.05 ? undefined : 'sc-nod'} style={dur(2.6)}>
              <path d="M-7 1 L7 -1 M7 -1 L8 3" stroke={pumpDry > 0.3 ? strokeOf(v, 'oilDry', SILVER_DIM) : SILVER} strokeWidth={1} fill="none" />
            </g>
          </g>
          {gush > 0 && (
            <g className="sc-spout" style={dur(1.4)}>
              <path d="M0 -9 Q -6 -26 -10 -14 M0 -9 Q 6 -28 11 -15 M0 -9 L0 -30" fill="none" stroke="#050506" strokeWidth={2.4} />
              <path d="M0 -9 Q -6 -26 -10 -14 M0 -9 Q 6 -28 11 -15 M0 -9 L0 -30" fill="none" stroke={strokeOf(v, 'oilGush')} strokeWidth={0.7} strokeDasharray="2 1.5" />
              {[-10, 11, 0].map((x, k) => (
                <circle key={k} cx={x} cy={k === 2 ? -31 : -13} r={1.2} fill="#050506" stroke={strokeOf(v, 'oilGush')} strokeWidth={0.4} />
              ))}
            </g>
          )}
        </g>
      </Motif>
      {/* 道と車 */}
      <line x1={112} y1={ROAD + 4} x2={SHORE} y2={ROAD + 4} stroke={SILVER_FAINT} strokeWidth={0.6} />
      <Motif v={v} id={auto ? 'autoCars' : 'slide'}>
        {Array.from({ length: cars }, (_, i) => (
          <g key={i} transform={`translate(${120 + i * 40} ${ROAD + 3})`}>
            <g
              className={slide ? 'sc-slide' : 'sc-drive'}
              style={{
                ...dur(9 + i * 3),
                ...delay(i * 3),
                ['--dx' as string]: '120px',
              }}
            >
              <path d="M-6 0 L-6 -3 L-3 -6 L3 -6 L6 -3 L6 0 Z" fill="#15161b" stroke={auto ? strokeOf(v, 'autoCars') : SILVER} strokeWidth={0.7} />
              {auto && <circle cx={7} cy={-2} r={1.2} fill={INK} opacity={0.8} />}
              {slide && <line x1={-16} y1={-1} x2={-8} y2={-1} stroke={strokeOf(v, 'slide')} strokeWidth={0.6} />}
            </g>
          </g>
        ))}
      </Motif>
      {m(v, 'portals') > 0 && (
        <Motif v={v} id="portals">
          {[150, 250].map((x, i) => (
            <g key={x} transform={`translate(${x} ${PLAZA + 4})`}>
              <ellipse className="sc-pulse" rx={7} ry={2.4} fill="none" stroke={strokeOf(v, 'portals')} strokeWidth={0.9} style={{ ...dur(1.6), ...delay(i * 0.8) }} />
              <ellipse rx={4} ry={1.2} fill={strokeOf(v, 'portals')} opacity={0.3} />
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'noWeapons') > 0 && (
        <Motif v={v} id="noWeapons">
          <g transform={`translate(190 ${PLAZA + 9})`}>
            <path d="M-8 0 L8 -3 M-7 -3 L8 0 M-6 -1.5 L7 -1.5" stroke={strokeOf(v, 'noWeapons', SILVER_DIM)} strokeWidth={0.8} />
            <circle cx={0} cy={-4} r={1} fill={BAD} opacity={0.7} />
            <line x1={0} y1={-3} x2={0} y2={-1} stroke={GOOD} strokeWidth={0.5} />
          </g>
        </Motif>
      )}
    </g>
  );
}

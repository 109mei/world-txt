import type { ReactNode } from 'react';
import type { SceneMotif } from '../../data/schema';
import type { SceneView } from '../../store/scene';
import { BAD, DARK, dur, delay, Ghost, GOOD, GROUND, INK, m, Motif, PAPER, PLAZA, rnd, SHORE, SILVER, strokeOf, WARN } from './common';

type Arms = 'down' | 'up' | 'forward' | 'raise' | 'wide';

/** 人の形（足もとが原点、高さ約11）。姿と持ち物で描き分ける */
export function Person({
  color = SILVER,
  arms = 'down',
  coat = true,
  bent = false,
  head,
  children,
}: {
  color?: string;
  arms?: Arms;
  coat?: boolean;
  bent?: boolean;
  head?: ReactNode;
  children?: ReactNode;
}) {
  const hx = bent ? 1.4 : 0;
  const armPath: Record<Arms, string> = {
    down: 'M0 -7 L-1.8 -4 M0 -7 L1.8 -4',
    up: 'M0 -7 L-2.2 -10.2 M0 -7 L2.2 -10.2',
    forward: 'M0 -7 L3.2 -7.2 M0 -7 L3 -6',
    raise: 'M0 -7 L2 -10.4 M0 -7 L-1.8 -4',
    wide: 'M0 -7 L-3 -6 M0 -7 L3 -6',
  };
  return (
    <g>
      <circle cx={hx} cy={-9.6} r={1.7} fill={DARK} stroke={color} strokeWidth={0.7} />
      <path d={`M${hx * 0.6} -7.9 L0 -3.2 L-1.5 0 M0 -3.2 L1.5 0 ${armPath[arms]}`} fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" />
      {coat && <path d="M-2 -3.3 L0 -7.6 L2 -3.3 Z" fill={DARK} stroke={color} strokeWidth={0.6} />}
      {head}
      {children}
    </g>
  );
}

/** 一人ひとりの姿を変える要素（その割合の人が、その姿になる） */
const LOOKS: SceneMotif[] = [
  'zombies',
  'cyborgs',
  'beasts',
  'cannibal',
  'green',
  'invisible',
  'blink',
  'halo',
  'joy',
  'blank',
  'canes',
  'signs',
  'masks',
  'genius',
  'forget',
  'thoughts',
  'speech',
  'bandage',
  'grazers',
  'elders',
  'young',
  'fading',
];

function lookOf(v: SceneView, i: number): SceneMotif | null {
  let best: SceneMotif | null = null;
  let bestV = 0;
  for (const [k, id] of LOOKS.entries()) {
    const val = m(v, id);
    if (val <= 0) continue;
    // その要素の強さの割合の人が、その姿になる（強い要素を先に）
    if (rnd(v.seed, 900 + i * 31 + k) < val * 0.9 && val > bestV) {
      best = id;
      bestV = val;
    }
  }
  return best;
}

/**
 * 広場の人それぞれの姿。いくつもの姿が重なっても埋もれないよう、まずどの姿にも一人ずつ（その年に現れたもの・
 * 書き換えから来たものを先に、広場に散らして）割り当て、残りの人は強さの割合で決める
 */
function looksOf(v: SceneView, walkers: number): (SceneMotif | null)[] {
  const weight = (id: SceneMotif) => (v.fresh.includes(id) ? 4 : 0) + (v.inked.includes(id) ? 2 : 0) + m(v, id);
  const present = LOOKS.filter((id) => m(v, id) > 0).sort((a, b) => weight(b) - weight(a));
  const out = Array.from({ length: walkers }, (_, i) => lookOf(v, i));
  const shown = present.slice(0, walkers);
  shown.forEach((id, k) => {
    out[Math.min(walkers - 1, Math.floor(((k + 0.5) * walkers) / shown.length))] = id;
  });
  return out;
}

/** 頭の上の印（ひらめき・忘れる・心の声・言葉・眠り） */
function headMark(id: SceneMotif | null, color: string): ReactNode {
  switch (id) {
    case 'genius':
      return (
        // ひらめきの電球（頭と見分けがつくよう、光る球と口金と光の筋で描く）
        <g transform="translate(0 -15.8)">
          <g opacity={0.25}>
            <circle r={3.4} fill={WARN} className="sc-twinkle" />
          </g>
          <path d="M-1.3 0.3 A1.6 1.6 0 1 1 1.3 0.3 L0.8 1.4 L-0.8 1.4 Z" fill={PAPER} stroke={color} strokeWidth={0.3} />
          <line x1={-0.7} y1={2} x2={0.7} y2={2} stroke={color} strokeWidth={0.4} />
          <path d="M-2.8 -1.4 l-1 -0.6 M2.8 -1.4 l1 -0.6 M0 -2.6 l0 -1.1" stroke={PAPER} strokeWidth={0.4} />
        </g>
      );
    case 'forget':
      return (
        <text x={0} y={-13} fontSize={4.5} textAnchor="middle" fill={color} fontFamily="serif">
          ?
        </text>
      );
    case 'thoughts':
      return (
        <g transform="translate(2.5 -15)">
          <ellipse rx={3.4} ry={2.2} fill="none" stroke={color} strokeWidth={0.5} />
          <circle cx={-2.6} cy={3} r={0.5} fill={color} />
        </g>
      );
    case 'speech':
      return <path d="M-1 -16 h6 v3.4 h-3.6 l-1.6 1.6 v-1.6 h-0.8 z" fill="none" stroke={color} strokeWidth={0.5} />;
    case 'halo':
      return <ellipse cx={0} cy={-12.4} rx={2.4} ry={0.7} fill="none" stroke={WARN} strokeWidth={0.6} opacity={0.9} />;
    case 'masks':
      return <rect x={-1.3} y={-9.4} width={2.6} height={1.2} fill={PAPER} opacity={0.8} />;
    case 'bandage':
      return <path d="M-1.8 -10.4 L1.8 -9 M-1.2 -5.6 L1.4 -5.6" stroke={PAPER} strokeWidth={0.7} opacity={0.85} />;
    case 'blank':
      return <line x1={-0.9} y1={-9.2} x2={0.9} y2={-9.2} stroke={color} strokeWidth={0.4} />;
    case 'joy':
      return <path d="M-0.9 -9.3 Q 0 -8.4 0.9 -9.3" fill="none" stroke={color} strokeWidth={0.4} />;
    case 'signs':
      return <path d="M2.6 -11 l1.2 -1.4 M3.4 -10.2 l1.6 -0.6" stroke={color} strokeWidth={0.5} />;
    default:
      return null;
  }
}

/** 見た目の要素に合わせた、一人の姿 */
/** tint：人々の体そのものを書き換えた世界（小さな人・巨人・重い体・すべる人）では、全員をインクで描く */
function Figure({ v, look, i, tint = SILVER }: { v: SceneView; look: SceneMotif | null; i: number; tint?: string }) {
  const base = tint;
  const color = look ? strokeOf(v, look, base) : base;
  const naked = m(v, 'naked') > 0 && rnd(v.seed, 1300 + i) < m(v, 'naked');
  const coat = !naked && look !== 'beasts' && look !== 'cyborgs';
  const nakedColor = naked ? strokeOf(v, 'naked') : color;
  switch (look) {
    case 'zombies':
      return (
        <g className="sc-sway" style={dur(2.4)}>
          <Person color={color} arms="forward" bent coat={coat} head={<circle cx={1.9} cy={-9.8} r={0.4} fill={GOOD} />} />
        </g>
      );
    case 'cyborgs':
      return (
        <g>
          <rect x={-1.7} y={-11.3} width={3.4} height={3.2} fill={DARK} stroke={color} strokeWidth={0.7} />
          <path d="M0 -8 L0 -3.2 L-1.5 0 M0 -3.2 L1.5 0 M0 -7 L-2 -4 M0 -7 L2 -4" fill="none" stroke={color} strokeWidth={1} />
          <circle cx={0.8} cy={-9.8} r={0.45} fill={INK} />
        </g>
      );
    case 'beasts':
      return (
        <g>
          <path d="M-4 -3 Q 0 -5.4 4 -3 L4.8 0 M-4 -3 L-4.6 0 M2 -3 L2.4 0 M-2 -3 L-2.2 0" fill="none" stroke={color} strokeWidth={0.8} />
          <circle cx={5} cy={-4.4} r={1.5} fill={DARK} stroke={color} strokeWidth={0.7} />
        </g>
      );
    case 'cannibal':
      return <Person color={BAD} arms="raise" coat={coat} head={<circle cx={0.7} cy={-9.8} r={0.4} fill={BAD} />} />;
    case 'green':
      return <Person color={strokeOf(v, 'green', GOOD)} arms="up" coat={coat} head={<path d="M0 -11.3 q 2 -2 3 -0.4" fill="none" stroke={GOOD} strokeWidth={0.6} />} />;
    case 'invisible':
      return (
        <g strokeDasharray="1 1.2" opacity={0.55}>
          <Person color={color} coat={false} />
        </g>
      );
    case 'blink':
      return (
        <g className="sc-blink" style={{ ...dur(3), ...delay(i * 0.7) }}>
          <Person color={color} coat={coat} />
          <circle cx={0} cy={-5} r={6} fill="none" stroke={INK} strokeWidth={0.4} opacity={0.5} />
        </g>
      );
    case 'elders':
      return (
        <Person color={color} bent coat={coat}>
          <line x1={2.6} y1={-5} x2={3.2} y2={0} stroke={color} strokeWidth={0.6} />
        </Person>
      );
    case 'canes':
      return (
        <Person color={color} arms="forward" coat={coat}>
          <line x1={3.2} y1={-7} x2={5.4} y2={0} stroke={PAPER} strokeWidth={0.5} />
        </Person>
      );
    case 'young':
      return (
        <g transform="scale(0.72)">
          <Person color={color} arms="up" coat={coat} />
        </g>
      );
    case 'grazers':
      return (
        <g transform="rotate(35 0 -3)">
          <Person color={color} arms="forward" coat={coat} />
        </g>
      );
    case 'fading':
      return (
        <g className="sc-fall-over" style={{ ...dur(6), ...delay(i * 1.3) }} opacity={0.7}>
          <Person color={color} coat={coat} />
        </g>
      );
    case 'joy':
      return (
        <g className="sc-hop" style={{ ...dur(1.1), ...delay(i * 0.3) }}>
          <Person color={color} arms="up" coat={coat} head={headMark('joy', color)} />
        </g>
      );
    default:
      return <Person color={naked ? nakedColor : color} coat={coat} arms={look === 'signs' ? 'raise' : 'down'} head={headMark(look, color)} />;
  }
}

/** 人々：広場を歩く人、子ども、寄り添う二人、列、群衆、兵士、横たわる人、屋根の上の人、ロボット */
export function People({ v }: { v: SceneView }) {
  const none = m(v, 'noPeople');
  const count = Math.round((4 + 10 * Math.min(1.3, v.pop) * (0.4 + 0.6 * v.people)) * (1 - none));
  const size = m(v, 'giant') > 0.3 ? 2.1 : m(v, 'tiny') > 0.3 ? 0.55 : 1;
  const heavy = m(v, 'heavy') > 0.3;
  const spread = m(v, 'apart') > 0.3 ? 1.35 : 1;
  const walkers = Math.min(16, m(v, 'giant') > 0.3 ? Math.ceil(count / 3) : m(v, 'tiny') > 0.3 ? count + 5 : count);
  const kids = none > 0.5 ? 0 : Math.round((2 + 6 * m(v, 'babies')) * (1 - m(v, 'noChildren')) * (m(v, 'young') > 0.3 ? 2 : 1));
  const sizeId: SceneMotif | null = m(v, 'giant') > 0.3 ? 'giant' : m(v, 'tiny') > 0.3 ? 'tiny' : m(v, 'heavy') > 0.3 ? 'heavy' : m(v, 'slide') > 0.3 ? 'slide' : null;
  const walkCls = m(v, 'slide') > 0.3 ? 'sc-slide' : m(v, 'clones') > 0.5 ? '' : 'sc-walk';
  const linked = m(v, 'linked') > 0;
  const heads: [number, number][] = [];
  const rows: ReactNode[] = [];
  const looks = looksOf(v, walkers);
  for (let i = 0; i < walkers; i++) {
    // 離れて立つ世界では間隔を広げる（広場の外、海へははみ出さない）
    const x = Math.min(SHORE - 10, Math.max(112, 118 + ((i + 0.5) / Math.max(1, walkers)) * 160 * spread - (spread - 1) * 40 + (rnd(v.seed, 1000 + i) - 0.5) * 6));
    const y = PLAZA + (i % 2) * 3;
    const look = looks[i] ?? null;
    const range = 6 + rnd(v.seed, 1100 + i) * 14;
    if (linked) heads.push([x, y - 9.6 * size]);
    rows.push(
      <g key={`w${i}`} transform={`translate(${x.toFixed(1)} ${y}) scale(${size} ${heavy ? size * 0.8 : size})`}>
        <g
          className={walkCls}
          style={{
            ...dur(8 + rnd(v.seed, 1200 + i) * 10),
            ...delay(i * 1.7),
            ['--dx' as string]: `${range.toFixed(0)}px`,
          }}
        >
          {look ? (
            <Motif v={v} id={look}>
              <Figure v={v} look={look} i={i} tint={sizeId ? strokeOf(v, sizeId) : SILVER} />
            </Motif>
          ) : (
            <Figure v={v} look={look} i={i} tint={sizeId ? strokeOf(v, sizeId) : SILVER} />
          )}
        </g>
      </g>,
    );
  }
  return (
    <g>
      {sizeId ? (
        <Motif v={v} id={sizeId}>
          {rows}
        </Motif>
      ) : (
        rows
      )}
      {/* 人がいなくなった年は、広場の人々が薄れて消えていく */}
      {none > 0.5 && (
        <Ghost v={v} when="noPeople" kind="fade">
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i} transform={`translate(${128 + i * 17} ${PLAZA + (i % 2) * 3})`}>
              <Person />
            </g>
          ))}
        </Ghost>
      )}
      {linked && heads.length > 1 && (
        <Motif v={v} id="linked">
          <path
            className="sc-pulse"
            d={heads.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(y - 3).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={strokeOf(v, 'linked', INK)}
            strokeWidth={0.5}
            opacity={0.7 * m(v, 'linked')}
            style={dur(2.6)}
          />
        </Motif>
      )}
      {kids > 0 && (
        <Motif v={v} id={m(v, 'babies') > 0 ? 'babies' : m(v, 'young') > 0 ? 'young' : 'babies'}>
          {Array.from({ length: Math.min(12, kids) }, (_, i) => (
            <g key={i} transform={`translate(${128 + i * 13 + (i % 2) * 4} ${PLAZA + 6}) scale(0.62)`}>
              <g className="sc-hop" style={{ ...dur(1.4 + (i % 3) * 0.3), ...delay(i * 0.5) }}>
                <Person color={m(v, 'babies') > 0 ? strokeOf(v, 'babies') : SILVER} arms="up" coat={m(v, 'naked') < 0.5} />
              </g>
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'clones') > 0 && (
        <Motif v={v} id="clones">
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i} transform={`translate(${196 + i * 9} ${PLAZA + 10}) scale(0.8)`}>
              <Person color={strokeOf(v, 'clones')} />
            </g>
          ))}
        </Motif>
      )}
      <Pairs v={v} />
      <Groups v={v} />
      <Machines v={v} />
    </g>
  );
}

/** 寄り添う二人・握手・殴り合い */
function Pairs({ v }: { v: SceneView }) {
  const spots = [132, 176, 222, 258];
  const pair = (id: SceneMotif, k: number, a: Arms, b: Arms, extra?: ReactNode) => (
    <g key={`${id}${k}`} transform={`translate(${spots[k % spots.length]! + (id === 'fight' ? 6 : 0)} ${PLAZA + 1})`}>
      <g transform="translate(-2.4 0)">
        <Person color={strokeOf(v, id)} arms={a} />
      </g>
      <g transform="translate(2.4 0)">
        <Person color={strokeOf(v, id)} arms={b} />
      </g>
      {extra}
    </g>
  );
  const n = (id: SceneMotif) => Math.round(1 + 2 * m(v, id));
  return (
    <g>
      {m(v, 'couples') > 0 && (
        <Motif v={v} id="couples">
          {Array.from({ length: n('couples') }, (_, k) =>
            pair('couples', k, 'wide', 'wide', <path d="M-1 -13 q 1 -1.4 2 0 q 1 -1.4 2 0 l-2 2.2 z" transform="translate(-1 0)" fill={BAD} opacity={0.7} />),
          )}
        </Motif>
      )}
      {m(v, 'handshake') > 0 && (
        <Motif v={v} id="handshake">
          {Array.from({ length: n('handshake') }, (_, k) => pair('handshake', k + 1, 'wide', 'wide'))}
        </Motif>
      )}
      {m(v, 'fight') > 0 && (
        <Motif v={v} id="fight">
          {Array.from({ length: n('fight') }, (_, k) => (
            <g key={k} className="sc-scuffle" style={{ ...dur(0.8), ...delay(k * 0.3) }}>
              {pair('fight', k + 2, 'raise', 'forward', <path d="M0 -8 l1.4 -1.4 M1 -6 l1.8 0.4" stroke={BAD} strokeWidth={0.6} />)}
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

/** 列・群衆と松明・兵士・横たわる人・眠る人・屋根の上の人・倒れた人 */
function Groups({ v }: { v: SceneView }) {
  const crowd = Math.max(m(v, 'crowd'), v.society < 0.35 ? (0.35 - v.society) * 2.5 : 0);
  const soldiers = Math.max(m(v, 'soldiers'), v.war > 0 ? 0.8 : 0, v.peace < 0.3 ? (0.3 - v.peace) * 2 : 0);
  return (
    <g>
      {m(v, 'queue') > 0 && (
        <Motif v={v} id="queue">
          {Array.from({ length: 3 + Math.round(5 * m(v, 'queue')) }, (_, i) => (
            <g key={i} transform={`translate(${212 - i * 6} ${PLAZA - 6}) scale(0.85)`}>
              <Person color={strokeOf(v, 'queue')} />
            </g>
          ))}
        </Motif>
      )}
      {crowd > 0.05 && (
        <Motif v={v} id="crowd">
          {Array.from({ length: 4 + Math.round(8 * crowd) }, (_, i) => (
            <g key={i} transform={`translate(${160 + (i % 6) * 7 + (i > 5 ? 3 : 0)} ${PLAZA - 4 - (i > 5 ? 4 : 0)}) scale(0.8)`}>
              <Person color={strokeOf(v, 'crowd')} arms={i % 3 === 0 ? 'raise' : 'down'}>
                {i % 3 === 0 && <path className="sc-flame" d="M2 -11 q -1.2 -2 0 -3.6 q 1.2 1.6 0 3.6 z" fill={WARN} style={{ ...dur(0.7), ...delay(i * 0.2) }} />}
              </Person>
            </g>
          ))}
        </Motif>
      )}
      {soldiers > 0.05 && (
        <Motif v={v} id="soldiers">
          {Array.from({ length: 2 + Math.round(6 * soldiers) }, (_, i) => (
            <g key={i} transform={`translate(${i % 2 === 0 ? 104 + i * 3 : 272 + i * 2} ${PLAZA - 2}) scale(0.9)`}>
              <g className="sc-march" style={{ ...dur(1.2), ...delay(i * 0.2) }}>
                <Person color={strokeOf(v, 'soldiers')} arms="raise">
                  {m(v, 'noWeapons') < 0.5 && <line x1={2} y1={-10.4} x2={2.6} y2={-15} stroke={SILVER} strokeWidth={0.6} />}
                </Person>
              </g>
            </g>
          ))}
        </Motif>
      )}
      {/* 眠る人（寝息が立ちのぼる）と、倒れて横たわる人。両方あれば、横たわる人は一段手前に並べる */}
      {(['sleepers', 'lying'] as const).map((id, row) =>
        m(v, id) > 0 ? (
          <Motif key={id} v={v} id={id}>
            {Array.from({ length: 2 + Math.round(4 * m(v, id)) }, (_, i) => (
              <g key={i} transform={`translate(${140 + i * 22 + (row === 1 && m(v, 'sleepers') > 0 ? 11 : 0)} ${PLAZA + 8 + (row === 1 && m(v, 'sleepers') > 0 ? 5 : 0)}) rotate(-90)`}>
                <Person color={strokeOf(v, id)} />
                {id === 'sleepers' && m(v, 'sleepers') > 0.3 && (
                  <g transform="rotate(90 -4 -12)">
                    <text className="sc-zzz" x={-4} y={-12} fontSize={4} fill={SILVER} style={{ ...dur(2.6), ...delay(i * 0.6) }}>
                      z
                    </text>
                  </g>
                )}
              </g>
            ))}
          </Motif>
        ) : null,
      )}
      {m(v, 'daring') > 0 && (
        <Motif v={v} id="daring">
          {[172, 198, 231].slice(0, 1 + Math.round(2 * m(v, 'daring'))).map((x, i) => (
            <g key={x} transform={`translate(${x} ${GROUND - 64 + i * 14}) scale(0.8)`}>
              <g className="sc-walk" style={{ ...dur(5), ['--dx' as string]: '4px' }}>
                <Person color={strokeOf(v, 'daring')} arms="wide" />
              </g>
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

/** ロボット・牙をむく機械 */
function Machines({ v }: { v: SceneView }) {
  const robots = m(v, 'robots');
  const revolt = m(v, 'robotRevolt');
  if (robots <= 0 && revolt <= 0) return null;
  const id: SceneMotif = revolt > 0 ? 'robotRevolt' : 'robots';
  const n = Math.round(2 + 4 * Math.max(robots, revolt));
  const color = strokeOf(v, id);
  return (
    <Motif v={v} id={id}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${126 + i * 27} ${PLAZA + 4})`}>
          <g
            className="sc-walk"
            style={{
              ...dur(10 + i * 2),
              ...delay(i * 2),
              ['--dx' as string]: '10px',
            }}
          >
            <rect x={-2.2} y={-12} width={4.4} height={3.6} rx={0.6} fill={DARK} stroke={color} strokeWidth={0.7} />
            <circle cx={-0.9} cy={-10.2} r={0.5} fill={revolt > 0 ? BAD : INK} />
            <circle cx={0.9} cy={-10.2} r={0.5} fill={revolt > 0 ? BAD : INK} />
            <rect x={-2.6} y={-7.8} width={5.2} height={5} fill={DARK} stroke={color} strokeWidth={0.7} />
            <path d="M-1.4 -2.8 L-1.6 0 M1.4 -2.8 L1.6 0 M-2.6 -7 L-4 -4 M2.6 -7 L4 -4" stroke={color} strokeWidth={0.8} />
            <line x1={0} y1={-12} x2={0} y2={-13.6} stroke={color} strokeWidth={0.5} />
            {revolt > 0 && <path className="sc-twinkle" d="M5 -7 l2 -1 l-1 2 z" fill={WARN} style={dur(0.6)} />}
          </g>
        </g>
      ))}
    </Motif>
  );
}

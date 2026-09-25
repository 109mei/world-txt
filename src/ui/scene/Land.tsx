import type { ReactNode } from 'react';
import type { SpecimenMode, SpecimenShape } from '../../data/schema';
import type { SceneView } from '../../store/scene';
import { SvgIcon } from '../icons';
import { BAD, DARK, dur, delay, GOOD, GROUND, H, HORIZON, INK, m, Motif, PAPER, PLAZA, SHORE, SILVER, SILVER_DIM, SILVER_FAINT, strokeOf, WARN } from './common';
import { Person } from './People';

/** 遠い山並みと火山 */
export function Mountains({ v }: { v: SceneView }) {
  const erupt = m(v, 'volcano');
  return (
    <g>
      <path
        d={`M-10 ${HORIZON} L18 132 L34 138 L48 112 L62 136 L84 128 L110 140 L140 132 L170 142 L210 134 L250 144 L${SHORE + 6} ${HORIZON} Z`}
        fill="#0f1015"
        stroke={SILVER_FAINT}
        strokeWidth={0.7}
      />
      {m(v, 'ice') > 0.2 && (
        <Motif v={v} id="ice">
          <path d="M40 124 L48 112 L56 124 L52 122 L48 126 L44 122 Z M14 136 L18 132 L23 135 Z" fill={PAPER} opacity={0.4 + 0.5 * m(v, 'ice')} />
        </Motif>
      )}
      {erupt > 0 && (
        <Motif v={v} id="volcano">
          <path d="M44 114 L48 112 L52 114" stroke={BAD} strokeWidth={1.4} fill="none" />
          <path d="M48 113 q -3 8 -8 18 M48 113 q 2 9 6 16" stroke={BAD} strokeWidth={0.9} fill="none" opacity={0.8} />
          {[0, 1, 2, 3].map((k) => (
            <circle key={k} className="sc-plume" cx={48 + k * 4} cy={104 - k * 9} r={5 + k * 3} fill="#6b6a70" opacity={0.5 * erupt} style={{ ...dur(4), ...delay(k * 0.8) }} />
          ))}
        </Motif>
      )}
    </g>
  );
}

/** 丘の木（x, y） */
const TREES: [number, number][] = [
  [10, 160],
  [22, 157],
  [34, 156],
  [46, 158],
  [58, 155],
  [70, 157],
  [82, 159],
  [94, 161],
  [106, 163],
  [16, 168],
  [40, 166],
  [64, 165],
  [88, 168],
  [28, 172],
  [52, 171],
  [76, 173],
  [100, 172],
  [118, 168],
];

function tree(x: number, y: number, key: string, color: string, fill = DARK, sway = false, s = 1) {
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={sway ? 'sc-bend' : undefined}>
        <path d="M0 -13 L5 0 L-5 0 Z" fill={fill} stroke={color} strokeWidth={0.7} />
        <line x1={0} y1={0} x2={0} y2={2} stroke={color} strokeWidth={0.7} />
      </g>
    </g>
  );
}

/** 丘・森・風車・獣・恐竜・獣の王 */
export function Hills({ v }: { v: SceneView }) {
  const noForest = m(v, 'noForest');
  const withered = m(v, 'withered');
  const burning = m(v, 'wildfire');
  const n = Math.round(TREES.length * Math.min(1, v.eco * 1.1 + 0.5 * m(v, 'forest')) * (1 - noForest));
  const windy = m(v, 'wind') > 0.3;
  const trunkColor = withered > 0.3 ? '#8a7d64' : SILVER;
  const mills = Math.max(1, Math.round(1 + 3 * v.renew + 2 * m(v, 'wind')));
  const millStill = m(v, 'still') > 0.5;
  return (
    <g>
      <path d={`M-10 ${GROUND - 12} C 30 146, 80 150, 130 ${GROUND - 2} L${SHORE - 6} ${GROUND} L${SHORE + 8} ${H} L-10 ${H} Z`} fill="#0c0d11" stroke={SILVER_DIM} strokeWidth={0.8} />
      <line x1={112} y1={PLAZA + 3} x2={SHORE - 2} y2={PLAZA + 3} stroke={SILVER_FAINT} strokeWidth={0.5} />
      {m(v, 'desert') > 0 && (
        <Motif v={v} id="desert">
          {/* 砂丘が畑を呑んでいく（縁はなだらかに地面へ下りる） */}
          <g opacity={0.6 + 0.4 * m(v, 'desert')} fill="#1d1a14" stroke={strokeOf(v, 'desert', 'rgba(234,208,143,0.45)')} strokeWidth={0.8}>
            <path d={`M-12 ${H} C 4 ${GROUND - 10}, 40 ${GROUND - 18}, 74 ${H} Z`} />
            <path d={`M36 ${H} C 58 ${GROUND - 2}, 92 ${GROUND - 8}, 128 ${H} Z`} />
            <path d={`M96 ${H} C 110 ${GROUND + 10}, 132 ${GROUND + 8}, 156 ${H} Z`} />
            <path d={`M10 ${GROUND + 12} q 14 -4 28 0 M58 ${GROUND + 18} q 12 -3 24 0 M104 ${GROUND + 26} q 10 -3 20 0`} fill="none" strokeWidth={0.5} />
          </g>
        </Motif>
      )}
      {m(v, 'greenDesert') > 0 && (
        <Motif v={v} id="greenDesert">
          {Array.from({ length: Math.round(6 + 10 * m(v, 'greenDesert')) }, (_, i) => (
            <path key={i} d={`M${6 + i * 7} ${GROUND + 4 + (i % 3) * 4} q 2 -5 4 0 q 1 -4 3 0`} fill="none" stroke={strokeOf(v, 'greenDesert', GOOD)} strokeWidth={0.7} />
          ))}
        </Motif>
      )}
      {/* 森：生態系が豊かなほど多い。書き換えで茂る・消える・枯れる・燃える */}
      <Motif v={v} id={m(v, 'forest') > 0 ? 'forest' : 'withered'}>
        {TREES.slice(0, n).map(([x, y], i) =>
          tree(
            x,
            y,
            `t${i}`,
            m(v, 'forest') > 0 && i >= Math.round(TREES.length * v.eco) ? strokeOf(v, 'forest') : trunkColor,
            withered > 0.5 ? '#16140f' : DARK,
            windy,
            m(v, 'tallCrops') > 0.5 ? 1.2 : 1,
          ),
        )}
      </Motif>
      {noForest > 0 && (
        <Motif v={v} id="noForest">
          {TREES.slice(n, n + 10).map(([x, y], i) => (
            <path key={i} d={`M${x - 2} ${y} L${x - 2} ${y - 3} L${x + 2} ${y - 3} L${x + 2} ${y}`} fill={DARK} stroke={strokeOf(v, 'noForest', SILVER_DIM)} strokeWidth={0.6} />
          ))}
        </Motif>
      )}
      {burning > 0 && (
        <Motif v={v} id="wildfire">
          {TREES.slice(0, Math.max(3, Math.round(n * 0.6))).map(([x, y], i) => (
            <path key={i} className="sc-flame" d={`M${x} ${y - 2} q -3 -6 0 -12 q 3 6 0 12 z`} fill={BAD} opacity={0.8 * burning} style={{ ...dur(0.8), ...delay(i * 0.23) }} />
          ))}
        </Motif>
      )}
      {m(v, 'glowPlants') > 0 && (
        <Motif v={v} id="glowPlants">
          {TREES.slice(0, n).map(([x, y], i) => (
            <g key={i} opacity={0.2}>
              <circle className="sc-twinkle" cx={x} cy={y - 6} r={4} fill={strokeOf(v, 'glowPlants', GOOD)} style={{ ...dur(3), ...delay(i * 0.4) }} />
            </g>
          ))}
        </Motif>
      )}
      {/* 風車：再生可能エネルギーが多いほど増える。風が止まれば止まる */}
      <Motif v={v} id={millStill ? 'still' : 'wind'}>
        {Array.from({ length: Math.min(4, mills) }, (_, i) => {
          const x = 24 + i * 26;
          const y = 150 - (i % 2) * 3;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <line x1={0} y1={0} x2={0} y2={-16} stroke={SILVER} strokeWidth={0.8} />
              <g transform="translate(0 -16)">
                <g className={millStill ? undefined : 'sc-spin'} style={dur(windy ? 1.2 : 3.4)}>
                  {[0, 120, 240].map((a) => (
                    <line key={a} x1={0} y1={0} x2={0} y2={-7} stroke={millStill ? strokeOf(v, 'still', SILVER_DIM) : SILVER} strokeWidth={0.8} transform={`rotate(${a})`} />
                  ))}
                </g>
              </g>
            </g>
          );
        })}
      </Motif>
      {v.renew > 0.35 && (
        <g>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${8 + i * 12} ${GROUND + 6} l8 -4 l2 3 l-8 4 z`} fill="#1a2233" stroke={SILVER_DIM} strokeWidth={0.5} />
          ))}
        </g>
      )}
      <Beasts v={v} />
    </g>
  );
}

/** 獣・家畜・恐竜・よみがえった生き物・獣の王・人と動物の会話 */
function Beasts({ v }: { v: SceneView }) {
  const wild = Math.round((1 + 3 * v.eco) * (1 - m(v, 'noAnimals')) + 4 * m(v, 'animals'));
  const cows = m(v, 'noLivestock') > 0.5 || m(v, 'noAnimals') > 0.5 ? 0 : 2;
  const deer = (x: number, y: number, key: string, color: string) => (
    <g key={key} transform={`translate(${x} ${y})`}>
      <g className="sc-graze" style={{ ...dur(4 + (x % 3)), ...delay(x * 0.1) }}>
        <path d="M-4 -3 Q 0 -5 4 -3 L4 0 M-3 -3 L-3 0 M3 -3 L3 0 M4 -3 L6 -6 M6 -6 L5.5 -8 M6 -6 L7 -8" fill="none" stroke={color} strokeWidth={0.7} />
      </g>
    </g>
  );
  return (
    <g>
      {wild > 0 && (
        <Motif v={v} id="animals">
          {Array.from({ length: Math.min(9, wild) }, (_, i) => deer(12 + i * 12 + (i % 2) * 3, 178 + (i % 3) * 3, `d${i}`, i >= 4 ? strokeOf(v, 'animals') : SILVER))}
        </Motif>
      )}
      {cows > 0 && (
        <g>
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${74 + i * 16} 183)`}>
              <rect x={-4} y={-5} width={8} height={4} rx={1} fill={PAPER} stroke={SILVER} strokeWidth={0.5} opacity={0.85} />
              <path d="M-3 -1 L-3 1 M3 -1 L3 1 M4 -5 L6 -6" stroke={SILVER} strokeWidth={0.6} />
            </g>
          ))}
        </g>
      )}
      {m(v, 'noLivestock') > 0 && (
        <Motif v={v} id="noLivestock">
          <path d="M66 184 L66 176 M100 184 L100 176 M66 178 L100 178" fill="none" stroke={strokeOf(v, 'noLivestock', SILVER_DIM)} strokeWidth={0.6} strokeDasharray="2 2" />
        </Motif>
      )}
      {m(v, 'dinosaurs') > 0 && (
        <Motif v={v} id="dinosaurs">
          <g transform="translate(34 158)">
            <g className="sc-graze" style={dur(7)}>
              <path d="M-14 0 Q -10 -12 4 -10 Q 10 -10 12 -4 L16 -2 M-8 -6 L-8 0 M6 -6 L6 0 M4 -10 Q 8 -30 16 -32 L20 -30" fill={DARK} stroke={strokeOf(v, 'dinosaurs')} strokeWidth={0.9} />
            </g>
          </g>
          <g transform="translate(96 176)">
            <path d="M-6 0 L-4 -5 L2 -6 L6 -9 L8 -8 L5 -5 L4 0 M2 -6 L-2 -4" fill="none" stroke={strokeOf(v, 'dinosaurs')} strokeWidth={0.8} />
          </g>
        </Motif>
      )}
      {m(v, 'mammoth') > 0 && (
        <Motif v={v} id="mammoth">
          <g transform="translate(58 170)">
            <path d="M-9 0 L-9 -7 Q -8 -13 0 -13 Q 8 -13 9 -7 L9 0 M9 -7 Q 13 -6 12 0 M11 -8 Q 15 -9 16 -6" fill={DARK} stroke={strokeOf(v, 'mammoth')} strokeWidth={0.9} />
          </g>
        </Motif>
      )}
      {m(v, 'animalKing') > 0 && (
        <Motif v={v} id="animalKing">
          <g transform="translate(70 150)">
            <path d="M-6 0 Q -6 -6 0 -7 Q 6 -6 6 0 M6 -3 Q 10 -9 13 -7 Q 14 -3 10 -2" fill={DARK} stroke={strokeOf(v, 'animalKing')} strokeWidth={0.9} />
            <path d="M8 -12 L9 -9 L10.5 -12 L12 -9 L13 -12 L13 -8 L8 -8 Z" fill={WARN} opacity={0.9} />
          </g>
        </Motif>
      )}
      {m(v, 'talk') > 0 && (
        <Motif v={v} id="talk">
          <g transform={`translate(112 ${PLAZA - 2}) scale(0.9)`}>
            <Person color={strokeOf(v, 'talk')} arms="forward" />
          </g>
          <path className="sc-pulse" d="M92 170 h10 v5 h-6 l-2 2 v-2 h-2 z M104 176 h10 v5 h-2 v2 l-2 -2 h-6 z" fill="none" stroke={strokeOf(v, 'talk')} strokeWidth={0.6} style={dur(2)} />
        </Motif>
      )}
    </g>
  );
}

/** 畑・蔵・墓標・石碑 */
export function Fields({ v }: { v: SceneView }) {
  const barren = m(v, 'barren');
  const harvest = m(v, 'harvest');
  const tall = m(v, 'tallCrops');
  const withered = m(v, 'withered');
  const density = Math.max(0.12, Math.min(1, 0.25 + 0.75 * v.food - 0.8 * barren));
  const h = (1.5 + 4 * v.food) * (1 + 0.8 * tall) * (1 - 0.5 * withered);
  const color = harvest > 0.3 ? strokeOf(v, 'harvest', WARN) : withered > 0.3 ? '#8a7d64' : tall > 0.3 ? strokeOf(v, 'tallCrops') : '#d8dbe2';
  const rows = [188, 195, 202, 209, 216];
  const extra = m(v, 'fieldsEverywhere');
  const gravesN = Math.round(4 * m(v, 'graves') + (v.people < 0.4 ? (0.4 - v.people) * 10 : 0));
  return (
    <g>
      <Motif v={v} id={harvest > 0 ? 'harvest' : tall > 0 ? 'tallCrops' : barren > 0 ? 'barren' : 'withered'}>
        {rows.map((y, r) => (
          <g key={y}>
            <line x1={2} y1={y + 0.5} x2={110} y2={y + 0.5} stroke={SILVER_FAINT} strokeWidth={0.5} />
            {Array.from({ length: 19 }, (_, k) => {
              const x = 4 + k * 5.6 + (r % 2) * 2.8;
              if (k / 19 >= density) return null;
              const lean = withered > 0.3 ? 1.6 : m(v, 'wind') > 0.3 ? 1.2 : 0;
              return (
                <line key={k} className={lean === 0 && tall > 0.3 ? 'sc-bend' : undefined} x1={x} y1={y} x2={x + lean} y2={y - h} stroke={color} strokeWidth={0.8} opacity={0.35 + 0.5 * v.food} />
              );
            })}
          </g>
        ))}
      </Motif>
      {extra > 0 && (
        <Motif v={v} id="fieldsEverywhere">
          {[152, 158, 164].map((y) =>
            Array.from({ length: 12 }, (_, k) => <line key={`${y}-${k}`} x1={8 + k * 9} y1={y} x2={8 + k * 9} y2={y - 3 * extra} stroke={strokeOf(v, 'fieldsEverywhere')} strokeWidth={0.7} />),
          )}
          {[128, 150, 172, 196, 220, 244].map((x) => (
            <path key={x} d={`M${x} ${GROUND - 36 - (x % 3) * 8} l6 0`} stroke={strokeOf(v, 'fieldsEverywhere')} strokeWidth={1.2} />
          ))}
        </Motif>
      )}
      {m(v, 'granary') > 0 && (
        <Motif v={v} id="granary">
          {Array.from({ length: 1 + Math.round(2 * m(v, 'granary')) }, (_, i) => (
            <g key={i} transform={`translate(${14 + i * 18} 184)`}>
              <path d="M-6 0 L-6 -7 L0 -12 L6 -7 L6 0 Z" fill={DARK} stroke={strokeOf(v, 'granary')} strokeWidth={0.8} />
              <path d="M-2 0 L-2 -4 L2 -4 L2 0" fill="none" stroke={strokeOf(v, 'granary')} strokeWidth={0.6} />
              <ellipse cx={8} cy={-1.5} rx={2} ry={1.5} fill="#d8c79c" opacity={0.8} />
            </g>
          ))}
        </Motif>
      )}
      {gravesN > 0 && (
        <Motif v={v} id="graves">
          {Array.from({ length: Math.min(8, gravesN) }, (_, i) => (
            <g key={i} transform={`translate(${96 + (i % 4) * 6} ${206 + Math.floor(i / 4) * 7})`}>
              <path d="M-1.6 0 L-1.6 -4 Q 0 -6 1.6 -4 L1.6 0 Z" fill={DARK} stroke={strokeOf(v, 'graves', SILVER_DIM)} strokeWidth={0.6} />
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

/** 川：水が乏しいとひび割れ、湧き水があれば泉が噴く */
export function River({ v }: { v: SceneView }) {
  const dry = Math.max(m(v, 'drought'), v.water < 0.3 ? 1 : 0);
  const springs = m(v, 'springs');
  return (
    <g>
      {dry < 0.6 ? (
        <g>
          <path d={`M112 ${H - 6} C 170 ${H - 12}, 220 ${H - 2}, ${SHORE + 4} ${H - 10} L${SHORE + 10} ${H} L112 ${H} Z`} fill="url(#sc-water)" opacity={(0.4 + 0.6 * v.water) * (1 - dry)} />
          {[140, 190, 240].map((x, k) => (
            <line key={x} className="sc-flow" x1={x} y1={H - 4} x2={x + 12} y2={H - 4} stroke={PAPER} strokeWidth={0.7} opacity={0.4 * v.water} style={{ ...dur(4), ...delay(k) }} />
          ))}
        </g>
      ) : (
        <Motif v={v} id="drought">
          <path
            d={`M120 ${H - 4} l10 -5 l-4 4 l12 1 M170 ${H - 6} l-6 4 l10 1 M214 ${H - 3} l8 -4 l-6 -1 M250 ${H - 5} l10 3`}
            fill="none"
            stroke={strokeOf(v, 'drought', 'rgba(216,219,226,0.45)')}
            strokeWidth={0.8}
          />
          <path d={`M4 ${H - 2} l9 -4 l-3 4 M40 ${H - 3} l6 -3 M70 ${H - 2} l-5 -3 l8 0`} fill="none" stroke={strokeOf(v, 'drought', SILVER_DIM)} strokeWidth={0.6} />
        </Motif>
      )}
      {springs > 0 && (
        <Motif v={v} id="springs">
          {[130, 176, 226].slice(0, 1 + Math.round(2 * springs)).map((x, k) => (
            <g key={x} transform={`translate(${x} ${H - 8})`}>
              <path
                className="sc-spout"
                d="M0 0 Q -3 -8 -6 -2 M0 0 Q 3 -8 6 -2 M0 0 L0 -9"
                fill="none"
                stroke={strokeOf(v, 'springs', PAPER)}
                strokeWidth={0.7}
                style={{ ...dur(1.6), ...delay(k * 0.4) }}
              />
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

/** 絵にしにくい決まりを刻んだ石碑（手前の左に並ぶ） */
export function Steles({ v }: { v: SceneView }) {
  if (v.steles.length === 0) return null;
  return (
    <g>
      {v.steles.slice(0, 7).map((s, i) => (
        <g key={s.key} className={s.fresh ? 'sc-appear' : undefined} data-stele={s.key}>
          <g transform={`translate(${8 + i * 15} ${H - 1})`}>
            <path d="M-6 0 L-6 -14 Q 0 -19 6 -14 L6 0 Z" fill="#14151a" stroke={INK} strokeWidth={0.8} />
            <g transform="translate(-4.5 -13)" style={{ color: 'var(--ink)' }}>
              <SvgIcon name={s.icon} size={9} />
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- 言葉の絵（「猫がいなくなる」など）

function shapePath(shape: SpecimenShape): ReactNode {
  switch (shape) {
    case 'animal':
      return <path d="M-8 2 Q -2 -4 6 -2 L9 -6 L10 -3 L8 -1 L8 3 M-6 2 L-6 6 M5 2 L5 6 M-8 2 L-10 -1" fill="none" />;
    case 'plant':
      return <path d="M0 6 L0 -4 M0 0 Q -5 -2 -6 -6 Q -1 -6 0 -1 M0 -2 Q 5 -4 6 -8 Q 1 -8 0 -3 M-2 -6 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0" fill="none" />;
    case 'food':
      return <path d="M-8 2 Q -8 -5 0 -5 Q 8 -5 8 2 Z M-6 -1 L-4 -3 M-1 -1 L1 -3 M4 -1 L6 -3" fill="none" />;
    case 'drink':
      return <path d="M-5 -6 L5 -6 L3 6 L-3 6 Z M-4 -2 L4 -2" fill="none" />;
    case 'machine':
      return <path d="M0 -7 L2 -5 L5 -5 L5 -2 L7 0 L5 2 L5 5 L2 5 L0 7 L-2 5 L-5 5 L-5 2 L-7 0 L-5 -2 L-5 -5 L-2 -5 Z M-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0" fill="none" />;
    case 'disease':
      return <path d="M-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M0 -4 L0 -7 M0 4 L0 7 M-4 0 L-7 0 M4 0 L7 0 M-3 -3 L-5 -5 M3 3 L5 5 M3 -3 L5 -5 M-3 3 L-5 5" fill="none" />;
    case 'matter':
      return <path d="M-7 3 L-4 -5 L6 -5 L7 3 Z M-4 -5 L-2 3 M6 -5 L3 3" fill="none" />;
    case 'star':
      return <path d="M0 -7 L2 -2 L7 -2 L3 1 L4.5 6 L0 3 L-4.5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="none" />;
    case 'weather':
      return <path d="M-8 2 Q -8 -3 -3 -3 Q -2 -7 2 -6 Q 7 -6 7 -1 Q 9 2 6 3 Z M-4 5 L-5 8 M0 5 L-1 8 M4 5 L3 8" fill="none" />;
    case 'place':
      return <path d="M-9 4 Q -6 -2 -2 1 Q 1 -6 5 -1 Q 9 -2 9 4 Z M-2 1 L-2 -6 L2 -4 L-2 -3" fill="none" />;
    case 'job':
      return <path d="M-3 -7 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M-1 -5 L-1 2 L-3 7 M-1 2 L1 7 M-1 -3 L4 -5 M4 -8 L4 -2" fill="none" />;
    case 'feeling':
      return <path d="M0 6 L-6 -1 Q -8 -6 -3 -7 Q 0 -7 0 -4 Q 0 -7 3 -7 Q 8 -6 6 -1 Z" fill="none" />;
    case 'body':
      return <path d="M-3 6 L-3 -2 L-5 -5 M-3 -2 L-1 -7 M-3 -2 L1 -7 L1 -2 M1 -2 L3 -6 M1 -2 L4 -3 L3 6 Z" fill="none" />;
    case 'clothes':
      return <path d="M-3 -7 L-8 -4 L-6 0 L-4 -1 L-4 7 L4 7 L4 -1 L6 0 L8 -4 L3 -7 Q 0 -4 -3 -7 Z" fill="none" />;
    case 'culture':
      return <path d="M-6 -6 L6 -6 L6 6 L-6 6 Z M-6 -6 Q 0 -2 6 -6 M-3 0 L3 0 M-3 3 L2 3" fill="none" />;
    case 'study':
      return <path d="M0 -4 Q -4 -7 -8 -5 L-8 5 Q -4 3 0 6 Q 4 3 8 5 L8 -5 Q 4 -7 0 -4 Z M0 -4 L0 6" fill="none" />;
    case 'system':
      return <path d="M-7 -6 L7 -6 L7 4 Q 7 7 4 7 L-7 7 Z M-4 -3 L4 -3 M-4 0 L4 0 M-4 3 L1 3" fill="none" />;
    case 'person':
      return <path d="M-2 -7 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M0 -5 L0 2 L-3 7 M0 2 L3 7 M0 -3 L-4 0 M0 -3 L4 0" fill="none" />;
    default:
      return <path d="M-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M-2 -2 L2 -2 L2 2 L-2 2 Z" fill="none" />;
  }
}

function specimenBody(shape: SpecimenShape, mode: SpecimenMode): ReactNode {
  const body = shapePath(shape);
  switch (mode) {
    case 'gone':
      return (
        <g>
          <g opacity={0.35} strokeDasharray="1.5 1.5">
            {body}
          </g>
          <line x1={-10} y1={8} x2={10} y2={-8} strokeWidth={0.9} />
        </g>
      );
    case 'more':
      return (
        <g>
          <g transform="translate(-9 3) scale(0.7)">{body}</g>
          <g transform="translate(9 3) scale(0.7)">{body}</g>
          {body}
        </g>
      );
    case 'rule':
      return (
        <g transform="scale(1.35)">
          {body}
          <path d="M-4 -12 L-3 -9 L-1 -12 L0 -9 L1 -12 L3 -9 L4 -12 L4 -8 L-4 -8 Z" fill={WARN} stroke="none" />
        </g>
      );
    default:
      return (
        <g>
          <circle r={12} fill="url(#sc-glow-ink)" stroke="none" />
          {body}
          <path className="sc-twinkle" d="M10 -8 l1 -3 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 z" fill={PAPER} stroke="none" />
        </g>
      );
  }
}

/** 言葉そのものを、小さな絵と名前で空に描く（写本の余白の絵のように） */
export function Specimens({ v }: { v: SceneView }) {
  if (v.specimens.length === 0) return null;
  const slots = [70, 150, 232, 312];
  return (
    <g>
      {v.specimens.slice(0, 4).map((s, i) => (
        <g key={s.key} className={s.fresh ? 'sc-appear' : undefined} data-specimen={s.key}>
          <g transform={`translate(${slots[i]} ${98 + (i % 2) * 12})`}>
            <g className="sc-hover" style={{ ...dur(6 + i), ...delay(i * 1.2) }}>
              <g stroke={INK} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
                {specimenBody(s.shape, s.mode)}
              </g>
              <text y={20} fontSize={7} textAnchor="middle" fill={INK} fontFamily="'Shippori Mincho', serif" letterSpacing={0.5}>
                {s.label.length > 8 ? `${s.label.slice(0, 7)}…` : s.label}
              </text>
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

import type { ReactNode } from 'react';
import type { SceneView } from '../../store/scene';
import { BAD, dur, delay, Ghost, H, HORIZON, INK, m, Motif, PAPER, rnd, SILVER_DIM, strokeOf, W, WARN } from './common';
import { Person } from './People';

/** 雲の形（左上を基準にした雲の輪郭） */
function cloudPath(w: number): string {
  const h = w * 0.28;
  return `M0 ${h} C ${w * 0.05} ${h * 0.35}, ${w * 0.25} ${h * 0.2}, ${w * 0.32} ${h * 0.45} C ${w * 0.4} 0, ${w * 0.7} 0, ${w * 0.72} ${h * 0.45} C ${w * 0.85} ${h * 0.25}, ${w} ${h * 0.5}, ${w} ${h} Z`;
}

/** 雲・嵐（遠い山より手前、空を行くものより奥） */
export function Clouds({ v }: { v: SceneView }) {
  const none = m(v, 'noClouds');
  const count = Math.max(0, Math.round((3 + 5 * m(v, 'clouds') + 3 * m(v, 'storm') + 2 * m(v, 'rain') - 3 * none) * (none > 0.8 ? 0 : 1)));
  const dark = m(v, 'storm') > 0.3 || m(v, 'acidRain') > 0.3;
  const id = m(v, 'storm') > 0 ? 'storm' : 'clouds';
  const cloud = (i: number, stroke: string) => {
    const w = 40 + rnd(v.seed, 100 + i) * 50;
    const y = 16 + rnd(v.seed, 120 + i) * 70;
    const x = rnd(v.seed, 140 + i) * W;
    return (
      <g key={i} transform={`translate(${x} ${y})`}>
        <g className="sc-drift" style={{ ...dur(60 + (i % 4) * 14), ...delay(i * 9) }}>
          <path d={cloudPath(w)} fill={dark ? 'var(--sc-cloud-dark)' : 'var(--sc-cloud)'} stroke={stroke} strokeWidth={0.7} opacity={0.9} />
        </g>
      </g>
    );
  };
  return (
    <Motif v={v} id={id}>
      {Array.from({ length: count }, (_, i) => cloud(i, i < 2 && (v.inked.includes('clouds') || v.inked.includes('storm')) ? INK : SILVER_DIM))}
      {/* 雲が消えた年は、空の雲がほどけて消えていく */}
      {none > 0.8 && (
        <Ghost v={v} when="noClouds" kind="fade">
          {Array.from({ length: 3 }, (_, i) => cloud(i, SILVER_DIM))}
        </Ghost>
      )}
      {m(v, 'storm') > 0.3 &&
        [70, 250].map((x, k) => (
          <path
            key={x}
            className="sc-lightning"
            d={`M${x} 40 l-6 16 l6 0 l-8 20`}
            fill="none"
            stroke={strokeOf(v, 'storm', PAPER)}
            strokeWidth={1.1}
            style={{ ...dur(5 + k * 2), ...delay(k * 1.7) }}
          />
        ))}
    </Motif>
  );
}

/** 空を飛ぶ人の、止まった姿での横の位置（空に散らばる） */
function x0(i: number): number {
  return 24 + ((i * 97) % 8) * 44;
}

/** 空を行くもの：隕石・宇宙人の船・ロケット・空を飛ぶ人・鳥・幽霊・夢・紙・お金・食べ物・石・花粉・光 */
export function SkyTraffic({ v }: { v: SceneView }) {
  return (
    <g>
      {m(v, 'meteors') > 0 && (
        <Motif v={v} id="meteors">
          {Array.from({ length: 1 + Math.round(3 * m(v, 'meteors')) }, (_, i) => (
            <g key={i} transform={`translate(${20 + i * 70} ${-10 + (i % 2) * 14})`}>
              <g className="sc-meteor" style={{ ...dur(3.2 + i * 0.7), ...delay(i * 1.1) }}>
                <line x1={0} y1={0} x2={34} y2={20} stroke={strokeOf(v, 'meteors', PAPER)} strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
                <circle cx={34} cy={20} r={2.6} fill={PAPER} />
                <circle cx={34} cy={20} r={5} fill={WARN} opacity={0.25} />
              </g>
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'meteorMiss') > 0 && (
        <Motif v={v} id="meteorMiss">
          <path d="M40 30 Q 200 70 370 20" fill="none" stroke={strokeOf(v, 'meteorMiss', SILVER_DIM)} strokeDasharray="2 4" strokeWidth={0.8} />
          <g transform="translate(0 38)">
            <g className="sc-glide" style={dur(10)}>
              <line x1={-22} y1={-4} x2={0} y2={0} stroke={PAPER} strokeWidth={1.2} opacity={0.6} strokeLinecap="round" />
              <circle r={2.6} fill={PAPER} />
            </g>
          </g>
        </Motif>
      )}
      {m(v, 'ufo') > 0 && (
        <Motif v={v} id="ufo">
          <g transform="translate(212 46)">
            <g className="sc-hover" style={dur(4)}>
              <g opacity={0.14 * m(v, 'ufo')}>
                <path d="M-8 60 L-3 6 L3 6 L8 60 Z" className="sc-beam" fill={v.inked.includes('ufo') ? INK : PAPER} />
              </g>
              <ellipse rx={20} ry={5} fill="var(--sc-fill)" stroke={strokeOf(v, 'ufo')} strokeWidth={1} />
              <path d="M-8 -2 Q 0 -12 8 -2" fill="var(--sc-fill)" stroke={strokeOf(v, 'ufo')} strokeWidth={0.9} />
              {[-12, -4, 4, 12].map((x, k) => (
                <circle key={x} className="sc-twinkle" cx={x} cy={1.5} r={1} fill={PAPER} style={{ ...dur(1.2), ...delay(k * 0.3) }} />
              ))}
            </g>
          </g>
          {m(v, 'ufo') > 0.6 && <ellipse cx={110} cy={30} rx={9} ry={2.4} fill="var(--sc-fill)" stroke={strokeOf(v, 'ufo')} strokeWidth={0.7} className="sc-hover" style={dur(5)} />}
        </Motif>
      )}
      {m(v, 'rockets') > 0 && (
        <Motif v={v} id="rockets">
          {Array.from({ length: 1 + Math.round(2 * m(v, 'rockets')) }, (_, i) => (
            <g key={i} transform={`translate(${246 + i * 16} ${GROUND_ROCKET})`}>
              <g className="sc-launch" style={{ ...dur(7 + i * 2), ...delay(i * 2.6) }}>
                <path d="M0 -12 L3 -6 L3 4 L-3 4 L-3 -6 Z" fill="var(--sc-fill)" stroke={strokeOf(v, 'rockets')} strokeWidth={0.8} />
                <path d="M-2 5 L0 12 L2 5 Z" fill={WARN} opacity={0.8} />
                <line x1={0} y1={12} x2={0} y2={60} stroke={SILVER_DIM} strokeWidth={2.4} opacity={0.35} />
              </g>
            </g>
          ))}
          <circle cx={250} cy={16} r={5} fill="none" stroke={strokeOf(v, 'rockets', SILVER_DIM)} strokeWidth={0.6} />
          <ellipse cx={250} cy={16} rx={9} ry={2} fill="none" stroke={SILVER_DIM} strokeWidth={0.5} />
        </Motif>
      )}
      {(m(v, 'flyers') > 0 || m(v, 'float') > 0.3) && (
        <Motif v={v} id={m(v, 'flyers') > 0 ? 'flyers' : 'float'}>
          {Array.from(
            {
              length: Math.round(2 + 6 * Math.max(m(v, 'flyers'), m(v, 'float') * 0.6)),
            },
            (_, i) => {
              const y = 58 + rnd(v.seed, 200 + i) * 60;
              const color = strokeOf(v, m(v, 'flyers') > 0 ? 'flyers' : 'float');
              return (
                <g key={i} transform={`translate(${x0(i)} ${y})`}>
                  {/* 飛ぶ人は空に散らばる（動きの始まりをずらして、同じ所に固まらないように。止まった姿でも散らばって見える） */}
                  <g className="sc-glide" style={{ ...dur(22 + (i % 4) * 6), ...delay(((i + 0.5) / 8) * (22 + (i % 4) * 6)), ['--x0' as string]: `${x0(i)}px` }}>
                    <g transform="rotate(-70) scale(1.4)">
                      <Person color={color} arms="up" />
                    </g>
                    {m(v, 'lightTrails') > 0.3 && <line x1={-24} y1={-3} x2={-4} y2={-3} stroke={INK} strokeWidth={0.8} opacity={0.5} />}
                  </g>
                </g>
              );
            },
          )}
        </Motif>
      )}
      {m(v, 'float') > 0 && (
        <Motif v={v} id="float">
          {/* 宙に浮いた家・車・水のしずく */}
          {[
            [70, 96, 'house'],
            [150, 84, 'car'],
            [300, 104, 'drop'],
            [110, 120, 'drop'],
          ].map(([x, y, kind], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className="sc-hover" style={{ ...dur(5 + i), ...delay(i * 1.4) }} opacity={0.3 + 0.7 * m(v, 'float')}>
                {kind === 'house' && <path d="M-6 0 L-6 -7 L0 -12 L6 -7 L6 0 Z" fill="var(--sc-fill)" stroke={strokeOf(v, 'float')} strokeWidth={0.7} />}
                {kind === 'car' && <path d="M-7 0 L-7 -3 L-4 -6 L4 -6 L7 -3 L7 0 Z" fill="var(--sc-fill)" stroke={strokeOf(v, 'float')} strokeWidth={0.7} />}
                {kind === 'drop' && <path d="M0 -6 Q 4 -1 0 1 Q -4 -1 0 -6 Z" fill="none" stroke={strokeOf(v, 'float')} strokeWidth={0.7} />}
              </g>
            </g>
          ))}
        </Motif>
      )}
      <Birds v={v} />
      {m(v, 'ghosts') > 0 && (
        <Motif v={v} id="ghosts">
          {Array.from({ length: 2 + Math.round(4 * m(v, 'ghosts')) }, (_, i) => (
            <g key={i} transform={`translate(${60 + i * 56} ${110 + (i % 3) * 14})`}>
              <g className="sc-wisp" style={{ ...dur(7 + i), ...delay(i * 1.8) }}>
                <path d="M-4 6 Q -5 -4 0 -6 Q 5 -4 4 6 Q 2 3 0 6 Q -2 3 -4 6 Z" fill={v.inked.includes('ghosts') ? INK : PAPER} opacity={0.22} />
                <circle cx={-1.4} cy={-2} r={0.6} fill="var(--sc-void)" opacity={0.5} />
                <circle cx={1.4} cy={-2} r={0.6} fill="var(--sc-void)" opacity={0.5} />
              </g>
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'dreams') > 0 && (
        <Motif v={v} id="dreams">
          {Array.from({ length: 3 + Math.round(4 * m(v, 'dreams')) }, (_, i) => (
            <g key={i} transform={`translate(${128 + i * 20} ${132 - (i % 2) * 10})`}>
              <g className="sc-bubble" style={{ ...dur(8 + (i % 3) * 2), ...delay(i * 1.3) }}>
                <circle r={5 + (i % 3) * 1.5} fill="rgb(var(--ink-rgb) / 0.06)" stroke={strokeOf(v, 'dreams')} strokeWidth={0.7} opacity={0.8} />
                {i % 2 === 0 ? (
                  <path d="M-2 1 A2.6 2.6 0 1 0 1 -2 A2 2 0 1 1 -2 1 Z" fill={strokeOf(v, 'dreams')} opacity={0.7} />
                ) : (
                  <path d="M0 -2.4 L0.7 -0.7 L2.4 0 L0.7 0.7 L0 2.4 L-0.7 0.7 L-2.4 0 L-0.7 -0.7 Z" fill={strokeOf(v, 'dreams')} opacity={0.7} />
                )}
              </g>
            </g>
          ))}
        </Motif>
      )}
      <Falling v={v} />
      {m(v, 'sparkles') > 0 && (
        <Motif v={v} id="sparkles">
          {Array.from({ length: 6 + Math.round(10 * m(v, 'sparkles')) }, (_, i) => {
            const x = 20 + rnd(v.seed, 300 + i) * 350;
            const y = 40 + rnd(v.seed, 320 + i) * 150;
            return (
              <path
                key={i}
                className="sc-twinkle"
                d={`M${x} ${y - 3} L${x + 0.8} ${y - 0.8} L${x + 3} ${y} L${x + 0.8} ${y + 0.8} L${x} ${y + 3} L${x - 0.8} ${y + 0.8} L${x - 3} ${y} L${x - 0.8} ${y - 0.8} Z`}
                fill={strokeOf(v, 'sparkles', PAPER)}
                style={{ ...dur(1.6 + (i % 4) * 0.5), ...delay(i * 0.41) }}
              />
            );
          })}
        </Motif>
      )}
      {m(v, 'lightTrails') > 0 && (
        <Motif v={v} id="lightTrails">
          {[40, 80, 120].map((y, k) => (
            <g key={y} transform={`translate(0 ${y})`}>
              <g className="sc-glide" style={{ ...dur(9 + k * 3), ...delay(k * 2) }}>
                <line x1={-60} y1={0} x2={0} y2={0} stroke={strokeOf(v, 'lightTrails', PAPER)} strokeWidth={0.8} opacity={0.5} />
                <circle r={1.4} fill={PAPER} />
              </g>
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

const GROUND_ROCKET = 168;

/** 鳥・鳩・不吉な鳥 */
function Birds({ v }: { v: SceneView }) {
  const base = v.eco * (1 - m(v, 'noAnimals'));
  const flock = Math.round(2 * base + 5 * m(v, 'birds'));
  const doves = Math.round(5 * m(v, 'doves'));
  const crows = Math.round(6 * m(v, 'crows'));
  const bird = (key: string, x: number, y: number, color: string, i: number, size = 1) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${size})`}>
      <g className="sc-flap" style={{ ...dur(0.8 + (i % 3) * 0.2), ...delay(i * 0.3) }}>
        <path d="M-4 0 Q -2 -2.5 0 0 Q 2 -2.5 4 0" fill="none" stroke={color} strokeWidth={0.9} />
      </g>
    </g>
  );
  return (
    <g>
      {flock > 0 && (
        <Motif v={v} id="birds">
          <g className="sc-drift" style={dur(40)}>
            {Array.from({ length: flock }, (_, i) => bird(`b${i}`, 60 + i * 11 + (i % 2) * 4, 88 + (i % 3) * 5, strokeOf(v, 'birds'), i))}
          </g>
        </Motif>
      )}
      {doves > 0 && (
        <Motif v={v} id="doves">
          {Array.from({ length: doves }, (_, i) => bird(`d${i}`, 150 + i * 16, 104 - (i % 2) * 8, strokeOf(v, 'doves', PAPER), i, 1.3))}
        </Motif>
      )}
      {crows > 0 && (
        <Motif v={v} id="crows">
          {Array.from({ length: crows }, (_, i) => (
            <g key={i} transform={`translate(${30 + i * 18} ${120 - (i % 2) * 9})`}>
              <g className="sc-flap" style={{ ...dur(0.6), ...delay(i * 0.2) }}>
                <path d="M-5 0 Q -2 -3 0 0 Q 2 -3 5 0 Q 2 -1 0 1 Q -2 -1 -5 0 Z" fill="var(--sc-oil)" stroke={strokeOf(v, 'crows', SILVER_DIM)} strokeWidth={0.6} />
              </g>
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

/** 空から降るもの：金貨・紙幣・紙・食べ物・白い石・花粉・灰 */
function Falling({ v }: { v: SceneView }) {
  const items: {
    id: 'moneyRain' | 'paperMoney' | 'papers' | 'manna' | 'stones' | 'pollenWind';
    draw: (color: string) => ReactNode;
  }[] = [
    {
      id: 'moneyRain',
      draw: (c) => <ellipse rx={2} ry={1.2} fill={WARN} stroke={c} strokeWidth={0.4} />,
    },
    {
      id: 'paperMoney',
      draw: (c) => <rect x={-3} y={-1.6} width={6} height={3.2} fill="var(--sc-paper)" stroke={c} strokeWidth={0.4} opacity={0.8} />,
    },
    {
      id: 'papers',
      draw: (c) => <path d="M-2.5 -3 L2.5 -3 L2.5 3 L-2.5 3 Z M-1.5 -1.5 L1.5 -1.5 M-1.5 0 L1.5 0" fill="var(--sc-paper)" stroke={c} strokeWidth={0.4} opacity={0.8} />,
    },
    {
      id: 'manna',
      draw: (c) => <ellipse rx={2.6} ry={1.6} fill="var(--sc-grain)" stroke={c} strokeWidth={0.4} />,
    },
    {
      id: 'stones',
      draw: (c) => <circle r={1.3} fill={PAPER} stroke={c} strokeWidth={0.3} />,
    },
    {
      id: 'pollenWind',
      draw: () => <circle r={1.4} fill={WARN} opacity={0.8} />,
    },
  ];
  return (
    <g>
      {items.map(({ id, draw }) => {
        const k = m(v, id);
        if (k <= 0) return null;
        const n = Math.round(6 + 12 * k);
        const color = strokeOf(v, id);
        const cls = id === 'pollenWind' ? 'sc-blow' : 'sc-flutter';
        return (
          <Motif key={id} v={v} id={id}>
            {Array.from({ length: n }, (_, i) => (
              // 止まった姿でも空に散らばって見えるよう、高さ（--y0）をずらして置き、動きはそこから測る
              <g key={i} transform={`translate(${10 + rnd(v.seed, 400 + i) * 370} ${Math.round(rnd(v.seed, 440 + i) * 190)})`}>
                <g
                  className={cls}
                  style={{
                    ...dur(6 + (i % 5)),
                    ...delay(i * 0.9 + rnd(v.seed, 420 + i) * 5),
                    ['--y0' as string]: `${Math.round(rnd(v.seed, 440 + i) * 190)}px`,
                  }}
                >
                  {draw(color)}
                </g>
              </g>
            ))}
          </Motif>
        );
      })}
    </g>
  );
}

/** 手前の天気：雨・雪・陽炎・風・汚れた空気・瘴気・霧 */
export function Weather({ v }: { v: SceneView }) {
  const rain = Math.max(m(v, 'rain'), m(v, 'acidRain'), m(v, 'storm') * 0.8);
  // 書き換えから来た雪・陽炎は、寒さ・暑さから来るものに重ねて描く（どちらか強いほうだけにすると、書いたものが見えなくなる）
  const snow = Math.min(1.8, m(v, 'snow') + (v.heat < -0.25 ? -v.heat : 0));
  const haze = Math.min(1, m(v, 'heatHaze') + (v.heat > 0.25 ? v.heat * 0.8 : 0));
  const fog = Math.max(0, Math.min(1, (0.55 - v.health) * 0.9));
  const acid = m(v, 'acidRain') > 0.3;
  return (
    <g>
      {rain > 0 && (
        <Motif v={v} id={m(v, 'acidRain') > 0 ? 'acidRain' : m(v, 'rain') > 0 ? 'rain' : 'storm'}>
          {Array.from({ length: Math.round(20 + 50 * rain) }, (_, i) => {
            const x = rnd(v.seed, 500 + i) * (W + 40) - 20;
            const y = rnd(v.seed, 560 + i) * H;
            return (
              <line
                key={i}
                className="sc-rain"
                x1={x}
                y1={y}
                x2={x - 3}
                y2={y + 9}
                stroke={acid ? 'rgb(var(--good-rgb) / 0.55)' : 'rgb(var(--sc-line-rgb) / 0.4)'}
                strokeWidth={0.6}
                style={{ ...dur(0.7 + (i % 4) * 0.12), ...delay(i * 0.07) }}
              />
            );
          })}
        </Motif>
      )}
      {snow > 0.05 && (
        <Motif v={v} id="snow">
          {Array.from({ length: Math.round(12 + 30 * snow) }, (_, i) => (
            <circle
              key={i}
              className="sc-snow"
              cx={rnd(v.seed, 600 + i) * W}
              cy={rnd(v.seed, 640 + i) * H - 20}
              r={0.7 + (i % 3) * 0.35}
              fill="var(--sc-snow)"
              opacity={Math.min(0.95, 0.35 + 0.5 * snow)}
              style={{ ...dur(6 + (i % 5)), ...delay(i * 0.6) }}
            />
          ))}
        </Motif>
      )}
      {haze > 0.1 && (
        <Motif v={v} id="heatHaze">
          {[HORIZON - 4, HORIZON + 8, HORIZON + 20].map((y, i) => (
            <path
              key={y}
              className="sc-shimmer"
              d={`M-20 ${y} q 16 -4 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0`}
              fill="none"
              stroke={v.inked.includes('heatHaze') ? INK : WARN}
              strokeWidth={0.8}
              opacity={haze * 0.4 * (1 - i * 0.25)}
              style={{ ...dur(3 + i), ...delay(i) }}
            />
          ))}
        </Motif>
      )}
      {m(v, 'wind') > 0 && (
        <Motif v={v} id="wind">
          {Array.from({ length: Math.round(4 + 6 * m(v, 'wind')) }, (_, i) => (
            <path
              key={i}
              className="sc-gust"
              d={`M0 ${40 + i * 16} q 20 -6 40 0 t 40 0`}
              fill="none"
              stroke={strokeOf(v, 'wind', SILVER_DIM)}
              strokeWidth={0.8}
              strokeLinecap="round"
              style={{ ...dur(2.4 + (i % 3) * 0.6), ...delay(i * 0.5) }}
            />
          ))}
        </Motif>
      )}
      {m(v, 'smog') > 0 && (
        <Motif v={v} id="smog">
          <defs>
            <linearGradient id="sc-smog" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--sc-dust-edge)" stopOpacity="0" />
              <stop offset="0.55" stopColor="var(--sc-dust)" stopOpacity="1" />
              <stop offset="1" stopColor="var(--sc-dust-edge)" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <rect x={0} y={HORIZON - 70} width={W} height={H - HORIZON + 70} fill="url(#sc-smog)" opacity={0.3 * m(v, 'smog')} />
        </Motif>
      )}
      {m(v, 'miasma') > 0 && (
        <Motif v={v} id="miasma">
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i} transform={`translate(${120 + i * 34} ${170 - (i % 2) * 12})`}>
              <g className="sc-wisp" style={{ ...dur(9 + i), ...delay(i * 2) }}>
                <ellipse rx={22} ry={8} fill={v.inked.includes('miasma') ? INK : 'var(--sc-miasma)'} opacity={0.24 * m(v, 'miasma')} />
                {[0, 1, 2, 3, 4].map((k) => (
                  <circle key={k} cx={-12 + k * 6} cy={-3 + (k % 2) * 4} r={1.1} fill="none" stroke="var(--sc-miasma-bubble)" strokeWidth={0.5} opacity={0.8 * m(v, 'miasma')} />
                ))}
              </g>
            </g>
          ))}
        </Motif>
      )}
      {fog > 0.08 && <ellipse className="sc-fogdrift" cx={186} cy={GROUND_FOG} rx={170} ry={18} fill="var(--sc-fog)" opacity={fog * 0.45} filter="url(#sc-soft)" style={dur(14)} />}
      {m(v, 'insects') > 0 && (
        <Motif v={v} id="insects">
          {Array.from({ length: Math.round(8 + 14 * m(v, 'insects')) }, (_, i) => (
            <circle
              key={i}
              className="sc-buzz"
              cx={30 + (i % 7) * 12 + rnd(v.seed, 700 + i) * 10}
              cy={180 + (i % 4) * 5}
              r={0.7}
              fill={strokeOf(v, 'insects', PAPER)}
              style={{ ...dur(1.1 + (i % 4) * 0.3), ...delay(i * 0.2) }}
            />
          ))}
        </Motif>
      )}
      {(m(v, 'bees') > 0 || m(v, 'noBees') > 0) && (
        <Motif v={v} id={m(v, 'bees') > 0 ? 'bees' : 'noBees'}>
          {/* 畑の端の花。ハチがいなければ、花はうなだれ、実を結ばない */}
          {[14, 30, 46, 62, 78].map((x, i) => {
            const droop = m(v, 'noBees') > 0.3;
            return (
              <g key={x} transform={`translate(${x} ${184 - (i % 2) * 2})`}>
                <path d={droop ? 'M0 0 Q 0 -4 2 -5' : 'M0 0 L0 -5'} fill="none" stroke={SILVER_DIM} strokeWidth={0.5} />
                <circle cx={droop ? 2.4 : 0} cy={droop ? -4.4 : -6} r={1.3} fill={droop ? 'var(--sc-dead)' : strokeOf(v, 'bees', PAPER)} opacity={droop ? 0.8 : 0.9} />
              </g>
            );
          })}
          {m(v, 'bees') > 0 &&
            Array.from({ length: 3 + Math.round(4 * m(v, 'bees')) }, (_, i) => (
              <g key={i} transform={`translate(${18 + i * 11} ${176 + (i % 2) * 3})`}>
                <g className="sc-buzz" style={{ ...dur(0.9 + (i % 3) * 0.3), ...delay(i * 0.2) }}>
                  <ellipse rx={1.2} ry={0.8} fill={WARN} />
                  <ellipse cx={-0.3} cy={-1} rx={0.9} ry={0.5} fill={PAPER} opacity={0.7} />
                </g>
              </g>
            ))}
        </Motif>
      )}
      {m(v, 'rats') > 0 && (
        <Motif v={v} id="rats">
          {Array.from({ length: 3 + Math.round(5 * m(v, 'rats')) }, (_, i) => (
            <g key={i} transform={`translate(${120 + i * 18} ${PLAZA_RAT + (i % 2) * 3})`}>
              <g className="sc-drive" style={{ ...dur(4 + (i % 3)), ...delay(i * 0.8), ['--dx' as string]: '40px' }}>
                <path d="M-2.5 0 Q 0 -2.4 2.5 0 Z M2.5 0 L3.4 -0.6 M-2.5 -0.2 Q -4.5 -0.6 -5 0.8" fill="var(--sc-rat)" stroke={strokeOf(v, 'rats', SILVER_DIM)} strokeWidth={0.4} />
              </g>
            </g>
          ))}
        </Motif>
      )}
      {m(v, 'noInsects') > 0 && (
        <Motif v={v} id="noInsects">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${40 + i * 30} ${176 - i * 4})`}>
              <g className="sc-flutter-slow" style={{ ...dur(5 + i), ...delay(i * 1.5) }}>
                <path d="M0 0 Q -3 -3 -3 0 Q -3 3 0 0 Q 3 -3 3 0 Q 3 3 0 0 Z" fill={strokeOf(v, 'noInsects', PAPER)} opacity={0.7} />
              </g>
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

const GROUND_FOG = 178;
const PLAZA_RAT = 200;

/** 大地の揺れ・戦火・きのこ雲・光の炸裂（いちばん手前） */
export function Disaster({ v }: { v: SceneView }) {
  const war = v.war;
  return (
    <g>
      {war > 0 && (
        <g>
          <ellipse cx={196} cy={176} rx={90} ry={12} fill={BAD} opacity={0.14 + 0.1 * war} />
          {[150, 176, 204, 230, 256].map((x, i) => (
            <path key={x} className="sc-flame" d={`M${x} 176 q -4 -8 0 -15 q 4 7 0 15 z`} fill={BAD} opacity={0.85} style={{ ...dur(0.9), ...delay(i * 0.3) }} />
          ))}
        </g>
      )}
      {m(v, 'mushroom') > 0 && (
        <Motif v={v} id="mushroom">
          <g transform="translate(66 146)" opacity={0.5 + 0.5 * m(v, 'mushroom')}>
            <g className="sc-swell" style={dur(6)}>
              <path d="M-4 0 L-3 -30 L3 -30 L4 0 Z" fill="var(--sc-ash-stem)" opacity={0.8} />
              <ellipse cx={0} cy={-36} rx={20} ry={11} fill="var(--sc-ash-cap)" stroke={strokeOf(v, 'mushroom')} strokeWidth={0.7} />
              <ellipse cx={0} cy={-30} rx={13} ry={4} fill="var(--sc-ash-dark)" />
              <ellipse cx={0} cy={0} rx={18} ry={3} fill={WARN} opacity={0.35} />
            </g>
          </g>
        </Motif>
      )}
      {m(v, 'flash') > 0 && (
        <Motif v={v} id="flash">
          {[
            [90, 70],
            [260, 90],
            [180, 40],
          ].map(([x, y], i) => (
            // 止まった姿（動きを減らす設定）は、淡い光の輪と明るい点。動くときは、光が弾けて消える
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle className="sc-burst" r={10} fill={v.inked.includes('flash') ? INK : PAPER} opacity={0.18} style={{ ...dur(3.6), ...delay(i * 1.2) }} />
              <circle className="sc-twinkle" r={1.8} fill={PAPER} style={{ ...dur(1.2), ...delay(i * 0.4) }} />
            </g>
          ))}
        </Motif>
      )}
    </g>
  );
}

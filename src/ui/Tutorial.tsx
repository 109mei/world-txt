import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { gameData } from '../data';
import { Icon, TrendArrow } from './icons';

/**
 * あそびかた（タイトルから開く）：ゲームの流れを5枚で短く見せる。
 * 世界は文章 → 兆しを読む → 書き換える → 時間を進める → 世界を救うと筆の位が上がる
 */

interface Step {
  title: string;
  text: string;
  art: ReactNode;
}

const STEPS: Step[] = [
  {
    title: '世界は文章でできている',
    text: 'WORLD.txt の一行一行がこの世界の決まり。いま人類文明は危機にある。',
    art: (
      <div className="tut-file">
        <div className="tut-comment"># 人間</div>
        <div className="tut-line">
          <span className="tut-no">01</span> 人間は毎日食事を必要とする。
        </div>
        <div className="tut-comment"># 太陽</div>
        <div className="tut-line">
          <span className="tut-no">14</span> 太陽は地球を照らす。
        </div>
      </div>
    ),
  },
  {
    title: '兆しを読む',
    text: '「世界」のタブで、悪くなっている所と起きかけていること（兆し）を読む。それが書き換える所の手がかりになる。',
    art: (
      <div className="tut-signs">
        <div className="tut-tile">
          <Icon name="food" size={16} />
          <span className="tut-tile-label">食料が</span>
          <b className="tone-bad">深刻</b>
          <TrendArrow trend="down2" />
        </div>
        <div className="tut-sign">
          <span className="tut-sign-label">
            <Icon name="water" size={14} /> 起きかけていること
          </span>
          <span className="tut-sign-text">雨の少ない季節が続き、川の水位が下がっている</span>
        </div>
      </div>
    ),
  },
  {
    title: '書き換える',
    text: '「法則」のタブで行をタップし、自由な文章で書き換える。消すことも新しい一文を書き足すこともできる。',
    art: (
      <div className="tut-file">
        <div className="tut-line">
          <span className="tut-no">01</span> 人間は<s className="tut-strike">毎日</s>
          <span className="tut-ink">数日に一度</span>食事を必要とする。
        </div>
        <div className="tut-line tut-added">
          <span className="tut-no">41</span> <span className="tut-ink">人間は空を飛べる。</span>
        </div>
      </div>
    ),
  },
  {
    title: '時間を進める',
    text: '「1年進める」で時間が流れ、書いた一文がその年に世界の姿になる。何が起きるかは進めてはじめてわかる。',
    art: (
      <div className="tut-time">
        <span className="tut-play">
          <Play size={15} strokeWidth={1.5} /> 1年
        </span>
        <span className="tut-year">
          YEAR <b>0</b> → <b>1</b>
        </span>
        <p className="tut-news">人々が空を飛び始めた。道より空を行く人が増えていく</p>
      </div>
    ),
  },
  {
    title: '世界を救う',
    text: '決められた年まで文明を保てば世界を救える。救うたびに筆の位が上がり、書き換えられる行・書き足せる行・書ける物が広がる。最後はすべてが自由になる。',
    art: (
      <div className="tut-pen">
        {gameData.access.ranks.map((r, i) => (
          <div key={r.name} className={i === 0 ? 'tut-rank on' : 'tut-rank'}>
            <span className="tut-rank-bar" />
            <span className="tut-rank-name">{r.name}</span>
          </div>
        ))}
      </div>
    ),
  },
];

/** onDone：最後の「はじめる」（世界を選ぶ画面へ進む） */
export function Tutorial({ onClose, onDone = onClose }: { onClose: () => void; onDone?: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i]!;
  const lastStep = i === STEPS.length - 1;
  // Esc で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="tutorial" role="dialog" aria-modal="true" aria-label="あそびかた" data-testid="tutorial">
      <div className="tut-card" key={i}>
        <div className="tut-head">
          <span className="tut-count">
            {i + 1} / {STEPS.length}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="とじる" data-testid="tutorial-close">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <h3 className="tut-title">{step.title}</h3>
        <div className="tut-art">{step.art}</div>
        <p className="tut-text">{step.text}</p>
        <div className="tut-dots" aria-hidden="true">
          {STEPS.map((s, k) => (
            <span key={s.title} className={k === i ? 'on' : undefined} />
          ))}
        </div>
        <div className="tut-actions">
          <button className="btn" onClick={() => setI(i - 1)} disabled={i === 0} data-testid="tutorial-prev">
            <ChevronLeft size={16} strokeWidth={1.5} /> もどる
          </button>
          {lastStep ? (
            <button className="btn btn-primary" onClick={onDone} data-testid="tutorial-done">
              はじめる
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setI(i + 1)} data-testid="tutorial-next">
              つぎへ <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

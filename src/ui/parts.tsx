import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { CauseRef, NewsItem } from '../core';
import type { Tone } from '../data/schema';
import type { LawLine, LimitView } from '../store/view';
import { Icon, TrendArrow } from './icons';
import type { Trend } from '../core';

/**
 * 世界の終わりまでの1行：終わりの線つきの帯と、線までの近さの言葉。
 * 帯の左の斜線が「終わり」、赤い線を越えると世界が終わる。onClick があればボタンになる
 */
export function LimitRow({ limit: l, onClick, testId }: { limit: LimitView; onClick?: () => void; testId?: string }) {
  const body = (
    <>
      <span className="limit-label">
        <Icon name={l.icon} size={14} /> {l.label}
      </span>
      <span className="limit-track" aria-hidden>
        <span className="limit-zone" style={{ width: `${l.line * 100}%` }} />
        <span className={`limit-fill tone-bg-${l.tone}`} style={{ width: `${l.pos * 100}%` }} />
        <span className="limit-line" style={{ left: `${l.line * 100}%` }} />
      </span>
      <span className={`limit-word tone-${l.tone}`}>
        {l.word}
        <TrendArrow trend={l.trend} />
      </span>
      <span className="limit-foot">
        <span className="limit-note">{l.note}</span>
        {l.countdown !== null ? (
          <span className="limit-when tone-critical" data-testid="limit-countdown">
            あと{l.countdown}年で終わる
          </span>
        ) : l.eta !== null ? (
          <span className="limit-when tone-warn" data-testid="limit-eta">
            このままなら約{l.eta}年
          </span>
        ) : null}
      </span>
    </>
  );
  const cls = `limit limit-${l.tone}`;
  return onClick ? (
    <button className={cls} onClick={onClick} data-testid={testId} data-word={l.word}>
      {body}
    </button>
  ) : (
    <div className={cls} data-testid={testId} data-word={l.word}>
      {body}
    </div>
  );
}

/** 両端に言葉のあるメーター（例：余裕 ━━━╸━━ 限界）。pos は 0〜1 */
export function Meter({ ends, pos, word, tone, trend, label, testId }: { ends: [string, string]; pos: number; word: string; tone: Tone; trend?: Trend; label?: ReactNode; testId?: string }) {
  return (
    <div className="meter" data-testid={testId}>
      {label && <div className="meter-label">{label}</div>}
      <div className="meter-row">
        <span className="meter-end">{ends[0]}</span>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${pos * 100}%` }} />
          <div className={`meter-mark tone-bg-${tone}`} style={{ left: `${pos * 100}%` }} />
        </div>
        <span className="meter-end">{ends[1]}</span>
      </div>
      <div className="meter-word" style={{ paddingLeft: `calc(${pos * 100}% - 1.5em)` }}>
        <span className={`tone-${tone}`}>▲ {word}</span>
        {trend && <TrendArrow trend={trend} />}
      </div>
    </div>
  );
}

/**
 * 画面のキーボードに隠れている高さ（px）。
 * iPhone の Safari はキーボードを出しても画面の高さが変わらないので、見えている範囲（visualViewport）から求める
 */
function useKeyboardInset(): { inset: number; visible: number } {
  const [state, setState] = useState({ inset: 0, visible: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setState({ inset: inset > 40 ? inset : 0, visible: Math.round(vv.height) });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return state;
}

/** 下から出る画面。footer は読み進めても隠れない（いちばん下に留まる） */
export function Sheet({ title, onClose, children, testId, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; testId?: string; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const kb = useKeyboardInset();
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // キーボードが出ているあいだは、シートをキーボードの上に載せる
  const layerStyle = kb.inset > 0 ? { paddingBottom: kb.inset } : undefined;
  const sheetStyle = kb.inset > 0 ? { maxHeight: Math.max(200, kb.visible - 12) } : undefined;
  return (
    <div className="sheet-layer" onClick={onClose} style={layerStyle}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-testid={testId} tabIndex={-1} ref={ref} style={sheetStyle}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる" data-testid="sheet-close">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** WORLD.txt の文章。書き換えた行はインクの色、消した行は打ち消し線、読み取れなかった行は薄い色 */
export function LawText({ line }: { line: Pick<LawLine, 'text' | 'state' | 'understood'> }) {
  const cls = ['law-text', `law-${line.state}`, line.understood ? '' : 'law-noise'].filter(Boolean).join(' ');
  return <span className={cls}>{line.text}</span>;
}

/** その行が使う世界容量（文字数） */
export function CostPips({ cost }: { cost: number }) {
  if (cost <= 0) return <span className="pips pips-zero">0字</span>;
  return (
    <span className="pips" aria-label={`世界容量 ${cost}字`}>
      {cost}字
    </span>
  );
}

/** 出来事がどの行から来たか（「← 書いた文章」）。プレイヤーの書いた文字なので、インクの色で見せる */
export function CauseLine({ cause }: { cause: CauseRef | null | undefined }) {
  if (!cause) return null;
  return (
    <div className="cause" data-testid="cause">
      <span className="cause-arrow">←</span>
      <span className={cause.deleted ? 'cause-text deleted' : 'cause-text'}>
        {cause.deleted ? '消した' : ''}「{cause.text}」
      </span>
      {cause.year !== null && <span className="cause-year">YEAR {cause.year}</span>}
    </div>
  );
}

export function NewsLine({ item, showYear = false }: { item: NewsItem; showYear?: boolean }) {
  return (
    <div className={`news news-${item.severity}${item.surprise ? ' news-surprise' : ''}`}>
      <div className="news-head">
        {showYear && <span className="news-year">Y{item.year}</span>}
        <span className={`cat cat-${item.category}`}>{item.category}</span>
      </div>
      <div className="news-main">
        <Icon name={item.icon} size={16} />
        <span>{item.text}</span>
      </div>
      <CauseLine cause={item.cause} />
      {item.why && <div className="why">なぜ？ {item.why}</div>}
    </div>
  );
}

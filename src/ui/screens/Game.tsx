import { Infinity as InfinityIcon, Lock, Menu, Pencil, Play, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gameData } from '../../data';
import type { IconKey } from '../../data/schema';
import { TERMS } from '../terms';
import { advanceYears, focusScene, marginText, openEdit, openSheet, sealNote, sealedText, setLawFilter, setTab, showResult, showToast, useGame, type Tab } from '../../store/game';
import { modesOpen } from '../../store/journey';
import { ADDED_CONCEPT, type GameView } from '../../store/view';
import { Icon, TrendArrow } from '../icons';
import { CauseLine, CostPips, LawText } from '../parts';
import { seTurn } from '../se';
import { WorldScene } from '../WorldScene';
import { Coach, useCoachTarget } from '../Coach';

export function Game() {
  const view = useGame((s) => s.view);
  const tab = useGame((s) => s.tab);
  const worlds = useGame((s) => s.progress.worlds);
  const body = useRef<HTMLElement>(null);
  // 序章の手引き：いま押してほしい物（枠で示す）
  const coachTarget = useCoachTarget(view);
  // タブを切り替えたら先頭から見せる
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [tab]);
  if (!view) return null;
  const ended = view.status !== 'playing';
  // はじめての世界で、まだ何も書き換えていなければ、どこを触ればよいかを示す（序章は手引きが示す）
  const firstHint = !view.tutorial && worlds <= 1 && view.edits.used === 0 && !ended;
  return (
    <div className="game" data-testid="game">
      <header className="game-head">
        <div className="gh-left">
          <div className="gh-logo">{TERMS.title}</div>
          <div className="gh-stage">
            <Icon name={view.stage.icon} size={13} /> {view.stage.title}
          </div>
        </div>
        <div className="gh-year" data-testid="year" data-value={view.year}>
          {/* 年が進むたびに、数字が浮かび上がる */}
          <span className="year-label">YEAR</span>{' '}
          <span className="year-num" key={view.year}>
            {view.year}
          </span>
          <span className="year-goal">
            {' / '}
            {view.stage.endless ? <InfinityIcon size={16} strokeWidth={1.5} aria-label="終わりなし" /> : view.stage.goalYears}
          </span>
        </div>
        <div className="gh-right">
          <span className={view.edits.left > 0 ? 'edits' : 'edits empty'} data-testid="edits" data-value={view.edits.left} aria-label={`書き換えの残り ${view.edits.left}回`}>
            <Pencil size={15} strokeWidth={1.5} aria-hidden="true" /> <span className="edits-label">残り</span> <b>{view.edits.left}</b> <span className="edits-label">回</span>
          </span>
          <button className="icon-btn" onClick={() => openSheet({ kind: 'menu' })} aria-label="メニュー" data-testid="menu">
            <Menu size={20} strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <main className="game-body" ref={body}>
        {tab === 'world' && <WorldTab view={view} firstHint={firstHint} />}
        {tab === 'laws' && <LawsTab view={view} />}
        {tab === 'history' && <HistoryTab view={view} />}
      </main>

      <footer className="game-foot">
        {ended ? (
          <button className="btn btn-primary wide" onClick={showResult} data-testid="to-result">
            {view.status === 'cleared' ? 'MISSION COMPLETE — 世界を見る' : '世界の記録を見る'}
          </button>
        ) : (
          <div className="time-bar">
            {view.stage.endless ? (
              <span className="years-left" data-testid="endless-left">
                {view.crisis ? (
                  <>
                    危機まで<b>{view.crisis.left}</b>年
                  </>
                ) : (
                  <InfinityIcon size={18} strokeWidth={1.5} aria-label="終わりなし" />
                )}
              </span>
            ) : view.loop && !view.loop.done ? (
              <span className="years-left" data-testid="loop-left">
                巻き戻りまで<b>{view.loop.left}</b>年
              </span>
            ) : (
              <span className="years-left">
                あと<b>{view.yearsLeft}</b>年
              </span>
            )}
            {/* 時間は1回で1年だけ進める（ほとんどの年で、状態か知らせのどちらかが変わる） */}
            <button
              className={coachTarget === 'advance' ? 'btn btn-primary time-btn coach-target' : 'btn btn-primary time-btn'}
              onClick={() => {
                seTurn();
                advanceYears(1);
              }}
              data-testid="advance"
            >
              <Play size={16} strokeWidth={1.5} /> 1年進める
            </button>
          </div>
        )}
        <nav className="tabs" role="tablist">
          {(
            [
              ['world', TERMS.tabs.world, 'earth'],
              ['laws', TERMS.tabs.laws, 'edit'],
              ['history', TERMS.tabs.notes, 'record'],
            ] as [Tab, string, IconKey][]
          ).map(([id, label, icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={['tab', tab === id ? 'on' : '', firstHint && id === 'laws' && tab !== 'laws' ? 'tab-hint' : '', coachTarget === `tab-${id}` ? 'coach-target' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab(id)}
              data-testid={`tab-${id}`}
            >
              <Icon name={icon} size={15} /> {label}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- 世界

/** 世界の寿命：いちばん近い終わりの線まで、あと約何年か（棒1本）。押すと、4つの終わりの線を見る */
function LifeBar({ view }: { view: GameView }) {
  const l = view.life;
  return (
    <button className="life" onClick={() => openSheet({ kind: 'life' })} data-testid="life" data-line={l.line}>
      <span className="life-head">
        <span className="life-title">世界の寿命</span>
        <span className="life-near dim small">いちばん近い線：{l.label}</span>
        <span className={`life-years tone-${l.tone}`} data-testid="life-years">
          {l.years !== null ? (
            <>
              あと約<b>{l.years}</b>年
            </>
          ) : (
            l.word
          )}
        </span>
      </span>
      <span className="life-bar" aria-hidden>
        <span className={`life-fill tone-bg-${l.tone}`} style={{ width: `${Math.max(2, l.pos * 100)}%` }} />
        <span className="life-end" />
      </span>
    </button>
  );
}

/** 序章の手引き：その年に試すこと（書き換える → 書き足す → 消す を1年に1つずつ） */
function Guide({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="guide" data-testid="guide" role="status">
      <Icon name="edit" size={14} /> {text}
    </p>
  );
}

/** この年の変化を光らせ終えた世界と年（タブを切り替えるたびに光らせない） */
const flashed = new Set<string>();

/**
 * 結果の画面を閉じて世界を見たとき、この年に変わった項目を一度だけ光らせる（シートの下では光らせない）
 */
function useYearFlash(view: GameView): Set<string> {
  const sheetOpen = useGame((s) => s.sheet !== null || s.passing !== null);
  const key = `${view.scene.seed}:${view.year}`;
  const [on, setOn] = useState<Set<string>>(new Set());
  useEffect(() => {
    const rep = view.report;
    if (sheetOpen || flashed.has(key) || !rep || rep.to !== view.year) return;
    flashed.add(key);
    setOn(new Set([...rep.changes.map((c) => c.id), ...(rep.moves ?? []).map((m) => m.id)]));
    const t = setTimeout(() => setOn(new Set()), 1800);
    return () => clearTimeout(t);
  }, [sheetOpen, key, view.report, view.year]);
  return on;
}

function WorldTab({ view, firstHint }: { view: GameView; firstHint: boolean }) {
  const analysis = useGame((s) => s.settings.analysis);
  const focus = new Set(view.focus);
  const flash = useYearFlash(view);
  return (
    <div className="world" data-testid="world-tab">
      <Coach view={view} />
      <LifeBar view={view} />
      <WorldScene scene={view.scene} />
      {view.guide ? (
        <Guide text={view.guide} />
      ) : (
        firstHint && (
          <p className="first-hint" data-testid="first-hint">
            起きかけていることを読んだら、下の「法則」を開いて世界の文章を書き換えてみよう
          </p>
        )
      )}
      {view.loop && !view.loop.done && (
        <div className={view.loop.left <= 1 ? 'crisis crisis-near' : 'crisis'} data-testid="loop" role="status">
          <Icon name="cycle" size={20} />
          <div className="crisis-main">
            <div className="crisis-head">
              <span className="crisis-name">{view.loop.count + 1}周目</span>
              <span className="crisis-left">
                巻き戻りまで<b>{view.loop.left}</b>年
              </span>
            </div>
            <p className="crisis-text">
              {view.loop.rule}。巻き戻るたびに使える文字数が{view.loop.wear}
              字減り、書き換えの残りが{view.loop.ink}回戻る。
            </p>
          </div>
        </div>
      )}
      {view.crisis && (
        <div className={view.crisis.left <= 1 ? 'crisis crisis-near' : 'crisis'} data-testid="crisis" role="alert">
          <Icon name={view.crisis.icon} size={20} />
          <div className="crisis-main">
            <div className="crisis-head">
              <span className="crisis-name">{view.crisis.name}</span>
              <span className="crisis-left">
                あと<b>{view.crisis.left}</b>年
              </span>
            </div>
            <p className="crisis-text">{view.crisis.text}</p>
          </div>
        </div>
      )}
      <p className={`headline tone-${view.headline.tone}`} data-testid="headline">
        「{view.headline.sentence}」
      </p>
      <div className="pop-row">
        <Icon name="population" size={15} /> 人口 <b data-testid="population">{view.population.text}</b>
        <TrendArrow trend={view.population.trend} />
      </div>

      {/* 4つの柱：いちばん低い項目と、その状態の言葉。押すと柱の中身 */}
      <div className="pillars" data-testid="pillars">
        {view.pillars.map((p) => (
          <button
            key={p.id}
            className={['pillar', `pillar-${p.tone}`, p.items.some((it) => focus.has(it.id)) ? 'focus' : '', p.items.some((it) => flash.has(it.id)) ? 'ind-flash' : ''].filter(Boolean).join(' ')}
            onClick={() => openSheet({ kind: 'pillar', id: p.id })}
            data-testid={`pillar-${p.id}`}
            data-word={p.lowest.word}
          >
            <span className="pillar-head">
              <Icon name={p.icon} size={16} />
              <b className="pillar-name">{p.name}</b>
              <TrendArrow trend={p.trend} />
            </span>
            <span className="pillar-line">
              <span className="dim">{p.text}</span>
              <b className={`pillar-word tone-${p.tone}`}>{p.lowest.word}</b>
            </span>
            {/* 棒は4本とも同じ位置に終わりの線 */}
            <span className="pillar-bar" aria-hidden>
              <span className={`pillar-fill tone-bg-${p.tone}`} style={{ width: `${p.pos * 100}%` }} />
              <span className="pillar-danger" style={{ left: `${p.line * 100}%` }} />
            </span>
          </button>
        ))}
      </div>

      {/* 起きかけていること（3枚まで） */}
      {view.signs.length > 0 && (
        <section className="signs" data-testid="signs" aria-label={TERMS.signs}>
          <div className="section-title">
            <span className="signs-dot" aria-hidden="true" /> {TERMS.signs}
          </div>
          {view.signs.map((s) => (
            <button key={s.id} className={`sign sign-${s.tone}`} data-testid="sign" onClick={() => focusScene(s.icon)} aria-label={`${s.text}（情景の中の場所を光らせる）`}>
              <Icon name={s.icon} size={18} className={`tone-${s.tone}`} />
              <span className="sign-text">{s.text}</span>
              <span className={`sign-when tone-${s.tone}`}>{s.years === null ? '' : s.years <= 1 ? 'まもなく' : `あと約${s.years}年`}</span>
            </button>
          ))}
        </section>
      )}

      {analysis && (
        <section className="analysis" data-testid="analysis">
          <div className="section-title">詳細分析</div>
          <dl>
            {view.analysis.map((a) => (
              <div key={a.label} className="an-row">
                <dt>{a.label}</dt>
                <dd>{a.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 定義（WORLD.txt）

function LawsTab({ view }: { view: GameView }) {
  const coachTarget = useCoachTarget(view);
  // 手引きが示す行や「行を書き足す」が見える所まで送る（タブを開いたときの先頭への戻しのあとで）
  useEffect(() => {
    if (!coachTarget || !(coachTarget.startsWith('law-') || coachTarget === 'add-line')) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-testid="${coachTarget}"]`);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el?.scrollIntoView({
        block: 'center',
        behavior: reduce ? 'auto' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [coachTarget]);
  const progress = useGame((s) => s.progress);
  const allOpen = useGame((s) => s.settings.allOpen);
  const modes = modesOpen(gameData, progress, allOpen);
  const filter = useGame((s) => s.lawFilter);
  const justWrote = useGame((s) => s.justWrote);
  const lines = useMemo(() => {
    const q = filter.query.trim();
    return view.laws.filter((l) => {
      if (filter.concept && l.concept !== filter.concept) return false;
      if (!q) return true;
      return l.text.includes(q) || l.conceptName.includes(q);
    });
  }, [view.laws, filter]);
  const usedConcepts = new Set(view.laws.filter((l) => l.kind === 'law').map((l) => l.concept));
  const hasAdded = view.laws.some((l) => l.kind === 'line');
  const marginFull = !!view.pen && view.pen.margin.max !== null && view.pen.margin.used >= view.pen.margin.max;

  let lastConcept = '';
  return (
    <div className="laws" data-testid="laws-tab">
      <Coach view={view} />
      <Guide text={view.guide} />
      <div className="file-head">
        <span className="file-name">WORLD.txt</span>
        <span className="file-meta">
          {view.capacity.used} / {view.capacity.max}字　
          <Pencil size={12} strokeWidth={1.5} aria-label="書き換えの残り" /> {view.edits.left}
        </span>
      </div>
      <p className="file-lead">行をタップするとその文章を書き換えられる。消せば世界から消え、書き足せば世界に加わる。</p>
      {view.pen && (
        // 筆の位：書き換えられる範囲（封じられた行・書き足せる行の数・書ける物）
        <div className="pen-strip" data-testid="pen" data-rank={view.pen.rank}>
          <span className="pen-name">
            <Icon name="edit" size={13} /> {view.pen.name}
          </span>
          <span className="pen-item">
            書き足せる行 <b>{view.pen.margin.max === null ? '限りなし' : `${Math.max(0, view.pen.margin.max - view.pen.margin.used)}`}</b>
          </span>
          <span className="pen-item">書ける物：{view.pen.reach}</span>
          {view.pen.crisisOpen && <span className="pen-crisis">危機の知らせでロックが外れている行がある</span>}
        </div>
      )}
      {/* 序章（見せる行が数行だけ）には、検索と絞り込みを出さない */}
      {!gameData.stageById.get(view.stage.id)?.lines && (
        <>
          <label className="search">
            <Search size={15} strokeWidth={1.6} />
            <input type="search" placeholder="検索（例：人間・水・病原体）" value={filter.query} onChange={(e) => setLawFilter({ query: e.target.value })} data-testid="law-search" />
          </label>
          <div className="chips" role="listbox" aria-label="概念">
            <button className={filter.concept === null ? 'chip on' : 'chip'} onClick={() => setLawFilter({ concept: null })}>
              すべて
            </button>
            {hasAdded && (
              <button
                className={filter.concept === ADDED_CONCEPT ? 'chip on' : 'chip'}
                onClick={() =>
                  setLawFilter({
                    concept: filter.concept === ADDED_CONCEPT ? null : ADDED_CONCEPT,
                  })
                }
              >
                <Icon name="edit" size={12} /> 書き足した
              </button>
            )}
            {view.concepts
              .filter((c) => usedConcepts.has(c.id))
              .map((c) => (
                <button
                  key={c.id}
                  className={filter.concept === c.id ? 'chip on' : 'chip'}
                  onClick={() =>
                    setLawFilter({
                      concept: filter.concept === c.id ? null : c.id,
                    })
                  }
                >
                  <Icon name={c.icon} size={12} /> {c.name}
                </button>
              ))}
          </div>
        </>
      )}

      <ol className="file">
        {lines.map((l) => {
          const head = l.concept !== lastConcept;
          lastConcept = l.concept;
          return (
            <li key={l.id} className="file-block">
              {head && (
                <div className="file-comment">
                  # <Icon name={l.kind === 'line' ? 'edit' : l.icon} size={12} /> {l.conceptName}
                </div>
              )}
              <button
                className={`line line-${l.state}${justWrote === l.id ? ' line-fresh' : ''}${l.sealed !== null ? ' line-sealed' : ''}${l.filled ? ' line-filled' : ''}${coachTarget === `law-${l.id}` ? ' coach-target' : ''}`}
                // 封じられた行は書き換えられない（どの位で開くかを知らせる）
                onClick={() => (l.sealed !== null ? showToast(sealedText(l.id, l.sealed)) : openEdit({ kind: l.kind, id: l.id }))}
                data-testid={`law-${l.id}`}
                data-state={l.state}
                data-sealed={l.sealed !== null ? 'yes' : undefined}
                data-void={l.voidLeft !== null ? l.voidLeft : undefined}
                data-filled={l.filled ? 'yes' : undefined}
              >
                <span className="ln">{String(l.no).padStart(2, '0')}</span>
                {/* 書き換えた行・書き足した行には、世界がどう読み取ったかを小さく添える */}
                <span className="line-body">
                  <LawText line={l} />
                  {l.reading && l.state !== 'original' && (
                    <span className="line-reading">
                      <span className="dim">読み：</span>
                      {l.reading}
                      {l.mode && modes && (
                        <span className="mode-tag" data-testid={`mode-${l.id}`} data-mode={l.mode}>
                          {gameData.indicators.modes[l.mode].name}
                        </span>
                      )}
                    </span>
                  )}
                  {l.voidLeft !== null && (
                    <span className="void-note" data-testid={`void-${l.id}`}>
                      空白　
                      {l.voidLeft > 0 ? `あと${l.voidLeft}年で世界が埋める` : 'まもなく世界が埋める'}
                    </span>
                  )}
                  {l.filled && <span className="filled-note">世界が埋めた行</span>}
                  {l.sealed !== null && <span className="seal-note">{sealNote(l.sealed)}</span>}
                  {l.onsetLeft > 0 && (
                    <span className="onset-note" data-testid={`onset-${l.id}`}>
                      効き始めまであと{l.onsetLeft}年
                    </span>
                  )}
                </span>
                <span className="line-end">
                  {l.sealed !== null && (
                    <span className="seal-tag" role="img" aria-label={TERMS.lock}>
                      <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  )}
                  {!l.understood && l.state !== 'deleted' && <span className="noise-tag">意味なし</span>}
                  {l.sealed === null && <CostPips cost={l.cost} />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {lines.length === 0 && <p className="dim center">見つからない</p>}

      <button
        className={coachTarget === 'add-line' ? 'btn add-line wide coach-target' : 'btn add-line wide'}
        // 書き足せる余白がなければ、書く前に知らせる
        onClick={() => (marginFull ? showToast(marginText()) : openEdit({ kind: 'new' }))}
        data-testid="add-line"
        data-full={marginFull ? 'yes' : undefined}
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden="true" /> 行を書き足す
        {view.pen && view.pen.margin.max !== null && (
          <span className="add-left">
            （余白 あと{Math.max(0, view.pen.margin.max - view.pen.margin.used)}
            行）
          </span>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- 歴史

function HistoryTab({ view }: { view: GameView }) {
  return (
    <div className="history" data-testid="history-tab">
      <div className="section-title">世界史</div>
      <ol className="timeline">
        {view.history.map((h, i) => (
          <li key={i} className={`tl tl-${h.kind} tl-${h.severity}`}>
            <span className="tl-year">YEAR {h.year}</span>
            <div className="tl-main">
              <Icon name={h.kind === 'edit' ? 'edit' : h.icon} size={15} />
              <span>{h.text}</span>
            </div>
            <CauseLine cause={h.cause} />
            {h.why && <div className="why">なぜ？ {h.why}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

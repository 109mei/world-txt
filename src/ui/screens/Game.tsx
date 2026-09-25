import { FastForward, Menu, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { advanceYears, openEdit, openSheet, setLawFilter, setTab, showResult, useGame, type Tab } from '../../store/game';
import { ADDED_CONCEPT, type GameView } from '../../store/view';
import { Icon, TrendArrow } from '../icons';
import { CauseLine, CostPips, LawText, Meter, NewsLine } from '../parts';
import { seTurn } from '../se';

export function Game() {
  const view = useGame((s) => s.view);
  const tab = useGame((s) => s.tab);
  const worlds = useGame((s) => s.progress.worlds);
  const body = useRef<HTMLElement>(null);
  // タブを切り替えたら先頭から見せる
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [tab]);
  if (!view) return null;
  const ended = view.status !== 'playing';
  // はじめての世界で、まだ何も書き換えていなければ、どこを触ればよいかを示す
  const firstHint = worlds <= 1 && view.edits.used === 0 && !ended;
  return (
    <div className="game" data-testid="game">
      <header className="game-head">
        <div className="gh-left">
          <div className="gh-logo">
            WORLD<span>.txt</span>
          </div>
          <div className="gh-stage">
            <Icon name={view.stage.icon} size={13} /> {view.stage.title}
          </div>
        </div>
        <div className="gh-year" data-testid="year" data-value={view.year}>
          <span className="year-label">YEAR</span> <span className="year-num">{view.year}</span>
          <span className="year-goal"> / {view.stage.endless ? '∞' : view.stage.goalYears}</span>
        </div>
        <div className="gh-right">
          <span className={view.edits.left > 0 ? 'edits' : 'edits empty'} data-testid="edits" data-value={view.edits.left}>
            ✎ {view.edits.left}
          </span>
          <button className="icon-btn" onClick={() => openSheet({ kind: 'menu' })} aria-label="メニュー" data-testid="menu">
            <Menu size={20} strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <main className="game-body" ref={body}>
        {firstHint && tab === 'world' && (
          <p className="first-hint" data-testid="first-hint">
            世界の兆候を読んだら、下の「定義」を開いて、世界の文章を書き換えてみよう。
          </p>
        )}
        {tab === 'world' && <WorldTab view={view} />}
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
                  <b>∞</b>
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
            <button
              className="btn time-btn"
              onClick={() => {
                seTurn();
                advanceYears(1);
              }}
              data-testid="advance-1"
            >
              <Play size={16} strokeWidth={1.6} /> 1年
            </button>
            <button
              className="btn btn-primary time-btn"
              onClick={() => {
                seTurn();
                advanceYears(5);
              }}
              data-testid="advance-5"
            >
              <FastForward size={16} strokeWidth={1.6} /> 5年
            </button>
          </div>
        )}
        <nav className="tabs" role="tablist">
          {(
            [
              ['world', '世界'],
              ['laws', '定義'],
              ['history', '歴史'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={['tab', tab === id ? 'on' : '', firstHint && id === 'laws' && tab !== 'laws' ? 'tab-hint' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab(id)}
              data-testid={`tab-${id}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- 世界

function WorldTab({ view }: { view: GameView }) {
  const analysis = useGame((s) => s.settings.analysis);
  const focus = new Set(view.focus);
  return (
    <div className="world" data-testid="world-tab">
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
              {view.loop.rule}巻き戻るたびに世界容量が{view.loop.wear}字減り、書換の力が{view.loop.ink}つ戻る。
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

      {view.tags.length > 0 && (
        <div className="tags" data-testid="tags">
          {view.tags.map((t) => (
            <span key={t.id} className="tag">
              <Icon name={t.icon} size={12} /> {t.label}
            </span>
          ))}
        </div>
      )}

      <div className="indicators" data-testid="indicators">
        {view.indicators.map((it) => (
          <button
            key={it.id}
            className={focus.has(it.id) ? 'ind focus' : 'ind'}
            onClick={() => openSheet({ kind: 'indicator', id: it.id })}
            data-testid={`ind-${it.id}`}
            data-word={it.word}
          >
            <span className={`ind-icon tone-${it.tone}`}>
              <Icon name={it.icon} size={17} />
            </span>
            <span className="ind-label">{it.label}</span>
            <span className={`ind-word tone-${it.tone}`}>{it.word}</span>
            <TrendArrow trend={it.trend} />
          </button>
        ))}
      </div>

      <button className="meta-btn" onClick={() => openSheet({ kind: 'meta', which: 'capacity' })} data-testid="capacity">
        <Meter
          label={
            <>
              <Icon name="capacity" size={14} /> 世界容量 <span className="dim small">{view.capacity.used} / {view.capacity.max}字</span>
            </>
          }
          ends={view.capacity.ends}
          pos={view.capacity.pos}
          word={view.capacity.word}
          tone={view.capacity.tone}
          trend={view.capacity.trend}
        />
      </button>
      <button className="meta-btn" onClick={() => openSheet({ kind: 'meta', which: 'coherence' })} data-testid="coherence">
        <Meter
          label={
            <>
              <Icon name="coherence" size={14} /> 世界整合性
            </>
          }
          ends={view.coherence.ends}
          pos={view.coherence.pos}
          word={view.coherence.word}
          tone={view.coherence.tone}
          trend={view.coherence.trend}
        />
      </button>

      {view.alerts.length > 0 && (
        <section className="alerts">
          <div className="section-title">
            <Icon name="warning" size={14} /> 重大な変化
          </div>
          {view.alerts.map((n, i) => (
            <NewsLine key={i} item={n} />
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
  const filter = useGame((s) => s.lawFilter);
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

  let lastConcept = '';
  return (
    <div className="laws" data-testid="laws-tab">
      <div className="file-head">
        <span className="file-name">WORLD.txt</span>
        <span className="file-meta">
          {view.capacity.used} / {view.capacity.max}字　✎ {view.edits.left}
        </span>
      </div>
      <p className="file-lead">行をタップすると、その文章を書き換えられる。消せば世界から消え、書き足せば世界に加わる。</p>
      <label className="search">
        <Search size={15} strokeWidth={1.6} />
        <input
          type="search"
          placeholder="検索（例：人間、水、病原体）"
          value={filter.query}
          onChange={(e) => setLawFilter({ query: e.target.value })}
          data-testid="law-search"
        />
      </label>
      <div className="chips" role="listbox" aria-label="概念">
        <button className={filter.concept === null ? 'chip on' : 'chip'} onClick={() => setLawFilter({ concept: null })}>
          すべて
        </button>
        {hasAdded && (
          <button className={filter.concept === ADDED_CONCEPT ? 'chip on' : 'chip'} onClick={() => setLawFilter({ concept: filter.concept === ADDED_CONCEPT ? null : ADDED_CONCEPT })}>
            <Icon name="edit" size={12} /> 書き足した
          </button>
        )}
        {view.concepts
          .filter((c) => usedConcepts.has(c.id))
          .map((c) => (
            <button key={c.id} className={filter.concept === c.id ? 'chip on' : 'chip'} onClick={() => setLawFilter({ concept: filter.concept === c.id ? null : c.id })}>
              <Icon name={c.icon} size={12} /> {c.name}
            </button>
          ))}
      </div>

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
                className={`line line-${l.state}`}
                onClick={() => openEdit({ kind: l.kind, id: l.id })}
                data-testid={`law-${l.id}`}
                data-state={l.state}
              >
                <span className="ln">{String(l.no).padStart(2, '0')}</span>
                <LawText line={l} />
                <span className="line-end">
                  {!l.understood && l.state !== 'deleted' && <span className="noise-tag">意味なし</span>}
                  <CostPips cost={l.state === 'deleted' ? 0 : l.cost} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {lines.length === 0 && <p className="dim center">見つからない</p>}

      <button className="btn add-line wide" onClick={() => openEdit({ kind: 'new' })} data-testid="add-line">
        ＋ 新しい定義を書き足す
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

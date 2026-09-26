import { ChevronLeft, HelpCircle, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ruleStep, stepNeeds } from '../../core';
import { gameData } from '../../data';
import { closeRecords, needsText, useGame } from '../../store/game';
import { buildJourney, journeyOf } from '../../store/journey';
import { buildCodex, KIND_NAME, type Count } from '../../store/codex';
import { buildRecords, type RecordSectionId } from '../../store/records';
import { Icon } from '../icons';

const FIELD_NAME = { physics: '物の理', psych: '人の心', social: '社会' } as const;
/** 世界の決まりの分野のアイコン（記録の一覧は、左にアイコン・右に文の2列） */
const FIELD_ICON = { physics: 'atom', psych: 'mind', social: 'nation' } as const;

function CodexCount({ label, c, testId }: { label: string; c: Count; testId: string }) {
  return (
    <div className="journey-count" data-testid={testId}>
      <span className="mini-label">{label}</span>
      <div className="journey-num">
        <b>{c.found}</b>
        <span> / {c.total}</span>
      </div>
      <div className="rec-bar" aria-hidden="true">
        <div style={{ width: `${c.total > 0 ? (c.found / c.total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

/** 図鑑と実績：見つけたものと腕前を、1か所で見返す（まだのものは数だけ。隠し実績は種類ごとに手がかりを1つ） */
function Codex() {
  const progress = useGame((s) => s.progress);
  const codex = useMemo(() => buildCodex(gameData, progress), [progress]);
  return (
    <section className="codex" data-testid="codex">
      <div className="codex-head">
        <span className="mini-label">図鑑</span>
      </div>
      <div className="journey-counts">
        <CodexCount label="世界の決まり" c={codex.rules} testId="codex-rules" />
        <CodexCount label="現実のカード" c={codex.cards} testId="codex-cards" />
        <CodexCount label="特別な結末" c={codex.endings} testId="codex-endings" />
        <CodexCount label="世界の名前" c={codex.names} testId="codex-names" />
      </div>
      <div className="codex-head">
        <span className="mini-label">実績</span>
        <span className="dim small">うまくできたことの記録</span>
      </div>
      <ul className="kind-list">
        {codex.kinds.map((k) => (
          <li key={k.kind} className="kind-row" data-testid={`kind-${k.kind}`}>
            <b className="kind-name">{k.name}</b>
            <div className="kind-body">
              <span className="dim small">{k.desc}</span>
              <div className="rec-bar" aria-hidden="true">
                <div style={{ width: `${k.total > 0 ? (k.found / k.total) * 100 : 0}%` }} />
              </div>
            </div>
            <span className="kind-num">
              <b>{k.found}</b> / {k.total}
            </span>
          </li>
        ))}
      </ul>
      {codex.recent.length > 0 && (
        <>
          <div className="codex-head">
            <span className="mini-label">新しく取った実績</span>
          </div>
          <ul className="recent-list">
            {codex.recent.map((a) => (
              <li key={a.id} className="recent">
                <span className="kind-badge">{KIND_NAME[a.kind]}</span>
                <b>{a.name}</b>
                <p>{a.text}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {codex.hidden.map((h) => (
        <div key={h.kind} className="journey-next">
          <HelpCircle size={18} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <div>
              {h.name}の隠し実績はまだ<b>{h.left}</b>ある
            </div>
            {h.hint && <div className="dim small">手がかり：{h.hint}</div>}
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * 世界の決まり：わかった決まり（出典つきの現実のカード）と、まだの決まりの手がかり（どうすると出会えるか）。
 * 同じ世界で3回負けるごとに開く、兆しの読み方もここに残る
 */
function RulesList() {
  const progress = useGame((s) => s.progress);
  const journey = useMemo(() => buildJourney(gameData, progress), [progress]);
  const known = new Set(journey.known.map((r) => r.id));
  const j = journeyOf(progress);
  const hinted = journey.stages.filter((e) => e.hints.length > 0);
  const laws = gameData.laws.filter((l) => l.fact && progress.discovered.some((id) => id.startsWith(`r:${l.id}.`)));
  return (
    <div className="rules-notes" data-testid="rules-notes">
      <p className="rec-lead">
        世界で起きたことからわかった世界の決まり。どれにも現実で確かめられたカードが1枚つく。わかった決まり {journey.known.length} / {journey.rulesTotal}
      </p>
      <ul className="rec-list">
        {gameData.unlocks.rules.map((r) => {
          if (known.has(r.id)) {
            return (
              <li key={r.id} className="rec found rule-card" data-testid={`rule-${r.id}`}>
                <span className="rec-icon">
                  <Icon name={FIELD_ICON[r.field]} size={14} />
                </span>
                <div className="rec-body">
                  <div className="rec-title">
                    {r.name}
                    <span className="rule-field">{FIELD_NAME[r.field]}</span>
                  </div>
                  <div className="rec-text">{r.text}</div>
                  <div className="real-card">
                    <span className="mini-label">現実では</span>
                    <div>{r.card.text}</div>
                    <div className="dim small">{r.card.source}</div>
                  </div>
                </div>
              </li>
            );
          }
          const step = ruleStep(gameData, r.id);
          const needs = step ? stepNeeds(step, j) : [];
          const stage = step?.stage ? gameData.stageById.get(step.stage)?.title : null;
          const clue = needs.length > 0 ? needsText(needs) : stage ? `「${stage}」を遊ぶと出会う` : '世界で起きると出会う';
          return (
            <li key={r.id} className="rec locked rule-card" data-testid={`rule-${r.id}`}>
              <span className="rec-icon">
                <Lock size={14} strokeWidth={1.5} />
              </span>
              <div className="rec-body">
                <div className="rec-title">？？？</div>
                <div className="rec-text">{clue}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {hinted.length > 0 && (
        <section className="rec-group" data-testid="sign-hints">
          <div className="rec-group-title">
            <HelpCircle size={13} strokeWidth={1.5} />
            <span className="rec-group-name">兆しの読み方</span>
          </div>
          <ul className="rec-list">
            {hinted.flatMap((e) =>
              e.hints.map((h, i) => (
                <li key={`${e.stage.id}-${i}`} className="rec found">
                  <span className="rec-icon">
                    <Icon name={e.stage.icon} size={14} />
                  </span>
                  <div className="rec-body">
                    <div className="rec-title">{e.stage.title}</div>
                    <div className="rec-text">{h}</div>
                  </div>
                </li>
              )),
            )}
          </ul>
        </section>
      )}
      {laws.length > 0 && (
        <section className="rec-group">
          <div className="rec-group-title">
            <Icon name="news" size={13} />
            <span className="rec-group-name">書き換えた行の現実</span>
            <span className="rec-group-count">
              {laws.length}/{gameData.laws.filter((l) => l.fact).length}
            </span>
          </div>
          <ul className="rec-list">
            {laws.map((l) => (
              <li key={l.id} className="rec found">
                <span className="rec-icon">
                  <Icon name={gameData.conceptById.get(l.concept)?.icon ?? 'news'} size={14} />
                </span>
                <div className="rec-body">
                  <div className="rec-text">{l.fact}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** 出典：画面に出る現実の数字と、その出典（名前・年・URL・数字の年）。確かめきれないものは「要確認」 */
function SourcesList() {
  const laws = gameData.laws.filter((l) => l.fact);
  return (
    <div className="sources" data-testid="sources">
      <p className="rec-lead">法則の「現実では」の数字とその出典。数字は年に1度見直す。</p>
      <ul className="rec-list">
        {laws.map((l) => {
          const s = gameData.sources[`laws/${l.id}/fact`];
          return (
            <li key={l.id} className="rec found src-item">
              <div className="src-fact">{l.fact}</div>
              <div className="src-meta dim small">
                {s ? (
                  s.check === '要確認' ? (
                    '出典：要確認'
                  ) : (
                    <>
                      出典：{s.name}
                      {s.year ? `（${s.year}年）` : ''}
                      {s.asOf ? `・数字は${s.asOf}年のもの` : ''}
                      {s.url && <span className="src-url">{s.url}</span>}
                    </>
                  )
                ) : (
                  '出典：未記入'
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 観測記録：これまでの世界で見つけた読み取り・想定外の変化・出来事・結末。まだ見ぬものは「？？？」 */
export function Records() {
  const discovered = useGame((s) => s.progress.discovered);
  const achievements = useGame((s) => s.progress.achievements);
  const [tab, setTab] = useState<RecordSectionId | 'sources' | 'rules'>('readings');
  const records = useMemo(() => buildRecords(gameData, discovered, achievements), [discovered, achievements]);
  const sec = records.sections.find((s) => s.id === tab) ?? records.sections[0]!;
  const showSources = tab === 'sources';
  const showRules = tab === 'rules';
  const ratio = records.total > 0 ? records.found / records.total : 0;

  return (
    <div className="page records" data-testid="records">
      <header className="page-head">
        <button className="icon-btn" onClick={closeRecords} aria-label="戻る" data-testid="records-back">
          <ChevronLeft size={22} strokeWidth={1.6} />
        </button>
        <h2>
          <Icon name="record" size={19} /> ノート
        </h2>
      </header>

      <Codex />

      <div className="rec-total">
        <div className="rec-count" data-testid="records-count">
          <b>{records.found}</b>
          <span> / {records.total}</span>
        </div>
        <div className="rec-bar" aria-hidden="true">
          <div style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="dim small">これまでの世界で見つけたもの。まだ見ぬものは「？？？」のまま。</p>
      </div>

      <div className="chips rec-tabs" role="tablist" aria-label="記録の種類">
        {records.sections.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={tab === s.id}
            className={tab === s.id ? 'chip on' : 'chip'}
            onClick={() => setTab(s.id)}
            data-testid={`records-${s.id}`}
          >
            <Icon name={s.icon} size={12} /> {s.title}
            <span className="chip-count">
              {s.found}/{s.total}
            </span>
          </button>
        ))}
        <button role="tab" aria-selected={showRules} className={showRules ? 'chip on' : 'chip'} onClick={() => setTab('rules')} data-testid="records-rules">
          <Icon name="science" size={12} /> 世界の決まり
        </button>
        <button role="tab" aria-selected={showSources} className={showSources ? 'chip on' : 'chip'} onClick={() => setTab('sources')} data-testid="records-sources">
          <Icon name="news" size={12} /> 出典
        </button>
      </div>

      {showRules ? <RulesList /> : showSources ? <SourcesList /> : <p className="rec-lead">{sec.lead}</p>}

      {!showSources && !showRules && sec.groups.map((g) => {
        const found = g.entries.filter((e) => e.found);
        // まだ得ていないが目標として見せるもの（実績）と、名前も伏せるもの
        const hints = g.entries.filter((e) => !e.found && e.hint);
        const unknown = g.entries.length - found.length - hints.length;
        return (
          <section key={g.id} className="rec-group">
            {g.title && (
              <div className="rec-group-title">
                <Icon name={g.icon} size={13} />
                <span className="rec-group-name">{g.title}</span>
                <span className="rec-group-count">
                  {found.filter((e) => !e.uncounted).length}/{g.entries.filter((e) => !e.uncounted).length}
                </span>
              </div>
            )}
            {found.length > 0 && (
              <ul className="rec-list">
                {found.map((e) => (
                  <li key={e.id} className="rec found">
                    <span className="rec-icon">
                      <Icon name={e.icon} size={15} />
                    </span>
                    <div className="rec-body">
                      <div className="rec-title">{e.title}</div>
                      {e.text && e.text !== e.title && <div className="rec-text">{e.text}</div>}
                      {e.why && <div className="why">なぜ？ {e.why}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hints.length > 0 && (
              <ul className="rec-list rec-hints" data-testid="rec-hints">
                {hints.map((e) => (
                  <li key={e.id} className="rec locked">
                    <span className="rec-icon">
                      <Icon name={e.icon} size={15} />
                    </span>
                    <div className="rec-body">
                      <div className="rec-title">{e.title}</div>
                      <div className="rec-text">{e.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {unknown > 0 && (
              <div className="rec-unknown" aria-label={`まだ見ぬもの ${unknown}`}>
                {Array.from({ length: unknown }, (_, i) => (
                  <span key={i} className="rec-q" aria-hidden="true">
                    ?
                  </span>
                ))}
                <span className="rec-unknown-label">まだ見ぬもの {unknown}</span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

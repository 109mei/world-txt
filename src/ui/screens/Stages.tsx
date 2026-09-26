import { ChevronLeft, ChevronRight, CircleCheck, Circle, Hash, HelpCircle, Infinity as InfinityIcon, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { gameData } from '../../data';
import { continueGame, goTitle, needsShort, needsText, openBriefing, openRecords, playingWorld, startStage, useGame } from '../../store/game';
import { buildJourney } from '../../store/journey';
import { WORLD_NUMBERS } from '../../store/runtime';
import type { StageId } from '../../data/schema';
import { Icon } from '../icons';
import { PenPanel } from '../PenPanel';

/** 数と棒（わかった世界の決まり・現実のカード） */
function Count({ label, found, total, testId }: { label: string; found: number; total: number; testId: string }) {
  return (
    <div className="journey-count" data-testid={testId}>
      <span className="mini-label">{label}</span>
      <div className="journey-num">
        <b>{found}</b>
        <span> / {total}</span>
      </div>
      <div className="rec-bar" aria-hidden="true">
        <div style={{ width: `${total > 0 ? (found / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

/** 番号で開く：友だちからもらった世界番号で、同じ世界を遊ぶ（開いている世界だけ） */
function OpenByNumber({ open, onClose }: { open: { id: StageId; title: string }[]; onClose: () => void }) {
  const [no, setNo] = useState('');
  const [stage, setStage] = useState<StageId>(open.find((s) => s.id !== 'prologue')?.id ?? open[0]!.id);
  const n = Number.parseInt(no.replace(/[^0-9]/gu, ''), 10);
  const valid = Number.isInteger(n) && n >= 1 && n <= WORLD_NUMBERS;
  return (
    <div className="by-number" data-testid="by-number">
      <label className="by-number-row">
        <span className="mini-label">世界番号</span>
        <span className="by-number-input">
          #
          <input
            inputMode="numeric"
            maxLength={5}
            value={no}
            onChange={(e) => setNo(e.target.value)}
            placeholder="0007"
            aria-label="世界番号"
            data-testid="by-number-input"
          />
        </span>
      </label>
      <label className="by-number-row">
        <span className="mini-label">世界</span>
        <select value={stage} onChange={(e) => setStage(e.target.value as StageId)} data-testid="by-number-stage">
          {open.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <p className="dim small">同じ世界番号なら誰が遊んでも同じ世界になる。書いた文は番号に入らない。</p>
      <div className="by-number-actions">
        <button className="btn" onClick={onClose}>
          やめる
        </button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => startStage(stage, false, n, true)} data-testid="by-number-open">
          #{valid ? String(n).padStart(4, '0') : '----'} を開く
        </button>
      </div>
    </div>
  );
}

export function Stages() {
  const progress = useGame((s) => s.progress);
  const settings = useGame((s) => s.settings);
  // 世界は1つだけ。遊んでいる世界があれば、それを見せる
  useGame((s) => s.hasGame);
  const now = playingWorld();
  const [byNumber, setByNumber] = useState(false);
  const journey = useMemo(() => {
    const j = buildJourney(gameData, progress);
    return settings.allOpen && j.allOpen ? buildJourney(gameData, progress, true) : j;
  }, [progress, settings.allOpen]);
  const open = journey.stages.filter((e) => e.needs.length === 0).map((e) => ({ id: e.stage.id, title: e.stage.title }));
  return (
    <div className="page" data-testid="stages">
      <header className="page-head">
        <button className="icon-btn" onClick={goTitle} aria-label="タイトルへ">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2>世界を選ぶ</h2>
        <button className="records-link" onClick={() => openRecords('stages')} data-testid="open-records">
          <Icon name="record" size={15} /> ノート
        </button>
      </header>
      {now ? (
        <div className="ongoing" data-testid="ongoing">
          <div className="ongoing-head">
            <span className="mini-label">進行中の世界</span>
            <b>{now.title}</b>
            <span className="dim">YEAR {now.year}</span>
          </div>
          <p className="dim small">開ける世界は1つだけ。別の世界を開くとこの世界は放棄される。</p>
          <button className="btn btn-primary wide" onClick={continueGame} data-testid="ongoing-continue">
            この世界をつづける
          </button>
        </div>
      ) : (
        <p className="lead">どの世界を救いますか</p>
      )}
      <PenPanel clears={progress.cleared.length} />
      <div className="journey-counts">
        <Count label="わかった世界の決まり" found={journey.known.length} total={journey.rulesTotal} testId="known-rules" />
        <Count label="現実のカード" found={journey.cards.found} total={journey.cards.total} testId="real-cards" />
      </div>
      <div className="stage-list-head">
        <span className="mini-label">世界</span>
        <span className="mini-label">その世界で出会う決まり</span>
      </div>
      <div className="stage-list">
        {journey.stages.map((e) => {
          const st = e.stage;
          const best = progress.best[st.id];
          const cleared = progress.cleared.includes(st.id);
          const locked = e.needs.length > 0;
          const marks = best?.marks?.length ?? 0;
          const lockText = needsText(e.needs);
          return (
            <button
              key={st.id}
              className={['stage-card', locked ? 'locked' : '', st.endless ? 'endless' : '', cleared ? 'cleared' : ''].filter(Boolean).join(' ')}
              onClick={() => openBriefing(st.id)}
              data-testid={`stage-${st.id}`}
              data-locked={locked}
              data-ongoing={now?.stageId === st.id}
              aria-label={locked ? `${st.title}（ロック中。${lockText}）` : st.title}
            >
              <span className="stage-mark" aria-hidden="true">
                {locked ? <Lock size={18} strokeWidth={1.5} /> : st.endless ? <InfinityIcon size={20} strokeWidth={1.5} /> : cleared ? <CircleCheck size={20} strokeWidth={1.5} /> : <Circle size={20} strokeWidth={1.5} />}
              </span>
              <span className="stage-body">
                <span className="stage-title">
                  {st.title}
                  {e.fresh && <span className="stage-fresh">開いた</span>}
                  {now?.stageId === st.id && <span className="stage-ongoing">進行中</span>}
                </span>
                <span className="stage-idea">
                  {locked ? '？？？' : e.idea ? `${e.idea}${e.meet ? `／${e.meet}` : ''}` : st.mission}
                </span>
              </span>
              <span className="stage-side">
                {locked ? (
                  <span className="stage-lock">{needsShort(e.needs)}</span>
                ) : st.endless ? (
                  <span className="stage-state">{best ? `最長 ${best.years}年` : '未挑戦'}</span>
                ) : cleared ? (
                  <>
                    <span className="stage-state good">クリア</span>
                    <span className="stage-marks" data-testid={`marks-${st.id}`}>
                      印 {marks}/3
                    </span>
                    {best?.fewest !== undefined && <span className="stage-fewest">最少 {best.fewest}手</span>}
                  </>
                ) : best ? (
                  <span className="stage-state">最長 {best.years}年</span>
                ) : (
                  <span className="stage-state dim">未挑戦</span>
                )}
              </span>
              {!locked && <ChevronRight size={18} strokeWidth={1.5} className="stage-go" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {journey.unknown > 0 && journey.next && (
        <div className="journey-next" data-testid="journey-next">
          <HelpCircle size={18} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <div>
              まだ出会っていない決まりが<b>{journey.unknown}</b>ある
            </div>
            <div className="dim small">
              次の手がかり：{journey.next.stage ? `「${gameData.stageById.get(journey.next.stage)?.title ?? ''}」で${journey.next.idea}` : journey.next.idea}
              {journey.next.needs.length > 0 && `（${needsText(journey.next.needs)}）`}
            </div>
          </div>
        </div>
      )}
      <p className="journey-note dim small">
        同じ世界番号なら誰が遊んでも同じ世界。<b>運ではなく読みで決まる。</b>
      </p>
      {byNumber ? (
        <OpenByNumber open={open} onClose={() => setByNumber(false)} />
      ) : (
        <button className="btn wide by-number-open" onClick={() => setByNumber(true)} data-testid="open-by-number" disabled={open.length === 0}>
          <Hash size={16} strokeWidth={1.5} /> 番号で開く
        </button>
      )}
    </div>
  );
}

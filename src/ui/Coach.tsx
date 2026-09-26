import { Check } from 'lucide-react';
import { useGame, type Sheet, type Tab } from '../store/game';
import type { GameView, TutorialView } from '../store/view';

/**
 * 序章の手引き：その年に試す操作（書き換える・書き足す・消す）を、押す順の手順で示す。
 * 済んだ手順には印をつけ、いまの手順を濃く出し、押す物を枠で示す（光らせるのは3回まで）
 */

type StepState = 'done' | 'now' | 'todo';
export interface CoachStep {
  text: string;
  state: StepState;
  target: string | null;
}

/** 手順ごとに、済んだか（あとの手順が済んでいれば、前の手順も済んだものとする） */
export function coachSteps(t: TutorialView, tab: Tab, sheet: Sheet | null): CoachStep[] {
  const lesson = t.lesson;
  if (!lesson) return [];
  const edit = sheet?.kind === 'edit' ? sheet.target : null;
  const hit = (done: string): boolean => {
    if (done === 'move') return t.moved;
    if (done === 'tab:laws') return tab === 'laws';
    if (done === 'edit:new') return edit?.kind === 'new';
    if (done.startsWith('edit:')) return edit?.kind === 'law' && edit.id === done.slice(5);
    return false;
  };
  const raw = lesson.steps.map((s) => hit(s.done));
  const done = raw.map((_, i) => raw.slice(i).some(Boolean));
  const now = done.indexOf(false);
  return lesson.steps.map((s, i) => ({
    text: s.text,
    target: s.target,
    state: done[i] ? 'done' : i === now ? 'now' : 'todo',
  }));
}

/** いま押してほしい物（法則のタブの中の物は、法則を開いていなければ法則のタブを示す。書く画面のボタンは、書く画面を開いているときだけ） */
export function useCoachTarget(view: GameView | null): string | null {
  const tab = useGame((s) => s.tab);
  const sheet = useGame((s) => s.sheet);
  const t = view?.tutorial;
  if (!t?.lesson) return null;
  const now = coachSteps(t, tab, sheet).find((s) => s.state === 'now');
  if (!now?.target) return null;
  if ((now.target.startsWith('law-') || now.target === 'add-line') && tab !== 'laws') return 'tab-laws';
  if (now.target === 'write' && sheet?.kind !== 'edit') return null;
  return now.target;
}

export function Coach({ view }: { view: GameView }) {
  const tab = useGame((s) => s.tab);
  const sheet = useGame((s) => s.sheet);
  const t = view.tutorial;
  if (!t?.lesson) return null;
  const steps = coachSteps(t, tab, sheet);
  return (
    <section className="coach" data-testid="coach" data-lesson={t.lesson.move} aria-label="序章の手引き">
      <div className="coach-head">
        <span className="coach-count">
          手引き {t.lesson.no} / {t.total}
        </span>
        <b className="coach-title">{t.lesson.title}</b>
      </div>
      <p className="coach-lead">{t.lesson.lead}</p>
      <ol className="coach-steps">
        {steps.map((s, i) => (
          <li key={s.text} className={`coach-step coach-${s.state}`} data-state={s.state}>
            {s.state === 'done' ? (
              <Check size={15} strokeWidth={1.5} className="coach-mark" aria-label="済んだ" />
            ) : (
              <span className="coach-no" aria-hidden="true">
                {i + 1}
              </span>
            )}
            <span className="coach-text">{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 書く画面の中の手引き：いまの手順が書く画面の中のものなら、その手順を添える（書く画面は手引きの札を覆うため） */
export function useCoachNote(target: { kind: 'law' | 'line'; id: string } | { kind: 'new' }): { text: string; move: 'rewrite' | 'add' | 'delete' } | null {
  const view = useGame((s) => s.view);
  const tab = useGame((s) => s.tab);
  const sheet = useGame((s) => s.sheet);
  const t = view?.tutorial;
  if (!t?.lesson || t.moved) return null;
  const steps = coachSteps(t, tab, sheet);
  const now = steps.find((s) => s.state === 'now');
  if (!now || now.target !== 'write') return null;
  // 手本の行（か、書き足す画面）を開いているときだけ（ほかの行の手本を出さない）
  const opened = t.lesson.steps.find((s) => s.done.startsWith('edit:'))?.done.slice(5);
  const match = opened === 'new' ? target.kind === 'new' : target.kind !== 'new' && target.id === opened;
  return match ? { text: now.text, move: t.lesson.move } : null;
}

/** 時間を進めた次の年に、去年の手引きを結ぶ一文 */
export function CoachAfter({ view }: { view: GameView }) {
  const after = view.tutorial?.after;
  if (!after) return null;
  return (
    <p className="coach-after" data-testid="coach-after">
      <Check size={15} strokeWidth={1.5} aria-label="手引き" /> {after}
    </p>
  );
}

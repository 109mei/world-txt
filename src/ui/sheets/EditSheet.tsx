import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { costAfter, delayOf, noiseOf, originalText, planWrite, textCost, weightOf, wordMarks } from '../../core';
import { gameData } from '../../data';
import { READ_MODES } from '../../data/schema';
import { closeSheet, getRuntime, NOISE_EFFECT, noiseText, useGame, writeWorld } from '../../store/game';
import { modesOpen } from '../../store/journey';
import type { EditTarget } from '../../store/runtime';
import { useCoachNote } from '../Coach';
import { Icon } from '../icons';
import { Sheet } from '../parts';
import { seWrite } from '../se';
import { insertAt, keyWords, negate, withoutPeriod } from '../wording';

/** 入力の補助で差し込める言葉（量・限定・例外）。選択肢ではなく、打つ手間を減らすだけ */
const HELPERS = ['少し', 'とても', 'だけ', 'なしで', 'ただし、'];
/** 入力の補助に並べる、その行の言葉の数 */
const KEY_WORDS = 4;

/** 出典を短く（名前と年。全文とURLはノートの「出典」で） */
function SourceNote({ id }: { id: string }) {
  const s = gameData.sources[id];
  if (!s) return null;
  return (
    <span className="source-note" data-testid="source-note">
      {s.check === '要確認' ? '（出典は確認中）' : `（${s.name}${s.year ? `、${s.year}年` : ''}）`}
    </span>
  );
}

/** 書こうとしている読み取りが効き始めるまでの年数（書き足す仕組み・行の概念ごと。いちばん遅いもの） */
function planDelay(discoveries: readonly string[]): number {
  let most = 0;
  for (const d of discoveries) {
    if (d.startsWith('p:')) most = Math.max(most, delayOf(gameData, null, d.slice(2)));
    const r = /^r:(\w+)\./u.exec(d);
    if (r) most = Math.max(most, delayOf(gameData, gameData.lawById.get(r[1]!)?.concept ?? null, null));
  }
  return most;
}

/**
 * WORLD.txt の1行を、そのまま書き換える。選択肢も予測も出さない。
 * 結果は、時間を進めて世界を見るまでわからない。
 */
export function EditSheet({ target }: { target: EditTarget }) {
  const view = useGame((s) => s.view);
  const progress = useGame((s) => s.progress);
  const allOpen = useGame((s) => s.everything);
  // 読まれ方の札は、「書き方と人の心」の段が開いてから（制度・条件つきと読まれた文の札は、開く前でも見せる）
  const modes = modesOpen(gameData, progress, allOpen);
  // 序章の手引き：書く画面は手引きの札を覆うので、いまの手順をここにも添える
  const coach = useCoachNote(target);
  const line = target.kind === 'new' ? null : view?.laws.find((l) => l.id === target.id);
  const law = target.kind === 'law' ? gameData.lawById.get(target.id) : null;
  const original = law ? originalText(law) : '';
  const current = line ? (line.state === 'deleted' ? '' : line.text) : '';
  // 文の終わりの「。」は書かなくてよい（書き込むときに世界が付ける）。書き足しやすいよう、外して開く
  const [text, setText] = useState(line ? withoutPeriod(line.text) : '');
  const ref = useRef<HTMLTextAreaElement>(null);
  // 補助の言葉を差し込んだあと、カーソルを置く位置
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || cursor === null) return;
    el.focus();
    el.setSelectionRange(cursor, cursor);
    setCursor(null);
  }, [cursor]);

  /** カーソルの位置（選んだところ）に言葉を差し込む */
  const insert = (word: string) => {
    const el = ref.current;
    const at = el ? { start: el.selectionStart, end: el.selectionEnd } : { start: text.length, end: text.length };
    const next = insertAt(text, at.start, at.end, word);
    // 入力欄の上限（maxLength）と同じ数え方
    if (next.text.length > 80) return;
    setText(next.text);
    setCursor(next.cursor);
  };

  const g = getRuntime().state;
  if (!view || !g) return null;
  const isLine = target.kind !== 'law';
  const weight = weightOf(gameData, text, isLine);
  // 文章そのものの文字数と、書き足した新しい概念の重さ（文字数に換算）
  const chars = textCost(text);
  const concept = Math.max(0, weight - chars);
  // 書き足した文章が既存の行の書き換えとして読まれるときも、命令と同じ計算で世界容量を見積もる
  // 書いたあとの使える文字数（序章では、見えている行の分だけで見せる）
  const after = costAfter(g, gameData, target, text) - view.capacity.hidden;
  const over = after + view.capacity.hidden > g.sim.capacityMax && after > view.capacity.used;
  const changed = withoutPeriod(text) !== withoutPeriod(current);
  const noEdits = view.edits.left <= 0;
  const ended = view.status !== 'playing';
  const negated = negate(text);
  const words = keyWords(original, line?.text ?? '').slice(0, KEY_WORDS);
  // 世界の読み：言葉が通じるかだけを見せる（書き換えの結果は見せない）。意味の伝わらない文は、世界に届かない
  const marks = wordMarks(text);
  const plan = changed && text.trim() !== '' ? planWrite(g, gameData, target, text) : null;
  const noise = plan && !plan.block && !plan.result.understood ? (plan.result.noise ?? noiseOf(text)) : null;

  const title =
    target.kind === 'new' ? (
      <>
        <Icon name="edit" size={16} /> 行を書き足す
      </>
    ) : (
      <>
        <Icon name={line?.icon ?? 'edit'} size={16} /> {line?.conceptName}
        {line?.no != null && <span className="dim small">　{String(line.no).padStart(2, '0')}行目</span>}
      </>
    );

  // 手引きで押してほしいボタン（消す手引きでは、まず文章を空にする）
  const coachBtn = coach ? (coach.move === 'delete' && text !== '' ? 'clear' : 'write') : null;

  return (
    <Sheet title={title} onClose={closeSheet} testId="edit-sheet">
      {coach && (
        <p className="coach-note" data-testid="coach-note">
          <Icon name="edit" size={14} /> 手引き：{coach.text}
        </p>
      )}
      {line && (
        <div className="now-text">
          <div className="mini-label">いまの文章</div>
          <p className={line.state === 'deleted' ? 'law-big deleted' : 'law-big'}>{line.state === 'deleted' ? `（削除）${line.text}` : line.text}</p>
          {!line.understood ? (
            <p className="reading noise" data-testid="reading">
              <b>意味なし</b>　{noiseText(noiseOf(line.text))}。{NOISE_EFFECT}
              {target.kind === 'law' ? '（この行の意味は書き換える前のまま）' : ''}
            </p>
          ) : (
            line.reading && (
              <p className="reading" data-testid="reading">
                世界の読み取り：<b>{line.reading}</b>
              </p>
            )
          )}
        </div>
      )}

      <div className="mini-label">{target.kind === 'new' ? '書き足す文章' : '書き換える'}</div>
      <textarea
        ref={ref}
        className="editor"
        value={text}
        rows={3}
        maxLength={80}
        placeholder={target.kind === 'new' ? '例：人間は空を飛べる。' : '文章を消すとその法則は世界から消える'}
        onChange={(e) => setText(e.target.value)}
        data-testid="editor"
        spellCheck={false}
      />
      <div className="assist-row" role="toolbar" aria-label="入力の補助" data-testid="assist">
        <button
          type="button"
          className="chip"
          disabled={negated === null}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (negated === null) return;
            setText(negated);
            setCursor(negated.length);
          }}
          data-testid="assist-negate"
        >
          〜ない
        </button>
        {HELPERS.map((w) => (
          <button key={w} type="button" className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(w)}>
            {w.replace(/、$/u, '')}
          </button>
        ))}
        {words.map((w) => (
          <button key={`w-${w}`} type="button" className="chip chip-word" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(w)}>
            {w}
          </button>
        ))}
      </div>
      <div className="world-reading" data-testid="world-reading">
        <div className="mini-label">世界の読み</div>
        <p className="marks" aria-label="知っている言葉は実線、知らない言葉は点線">
          {marks.length === 0 ? (
            <span className="dim small">世界が知っている言葉には実線、知らない言葉には点線が付く</span>
          ) : (
            marks.map((m, i) => (
              <span key={i} className={m.known === null ? undefined : m.known ? 'mark-known' : 'mark-unknown'} data-known={m.known === null ? undefined : String(m.known)}>
                {m.text}
              </span>
            ))
          )}
        </p>
        {noise && (
          <p className="noise-note" data-testid="noise-note">
            <b>世界に届かない言葉</b>　<span className="dim small">{noiseText(noise)}</span>
          </p>
        )}
        {/* 効き始めまでの遅れ（建てる・育てる仕組みや、大地と気候の行は、何年かたってから効く） */}
        {plan && !plan.block && plan.result.understood && planDelay(plan.discoveries) > 0 && (
          <p className="onset-note" data-testid="onset-plan">
            効き始めまで約{planDelay(plan.discoveries)}年かかる
          </p>
        )}
        {/* 読まれ方：人の振る舞いを書いた文は、書き方で性質・制度・条件つきに読み分ける（どう読まれたかだけ。結果は見せない） */}
        {plan && !plan.block && plan.result.understood && plan.result.mode && (modes || plan.result.mode !== 'nature') && (
          <div className="read-mode" data-testid="read-mode" data-mode={plan.result.mode}>
            <span className="mini-label">読まれ方</span>
            <span className="mode-chips">
              {READ_MODES.map((m) => (
                <span key={m} className={m === plan.result.mode ? 'mode-chip mode-on' : 'mode-chip'}>
                  {gameData.indicators.modes[m].name}
                </span>
              ))}
            </span>
            <span className="dim small">{gameData.indicators.modes[plan.result.mode].note}</span>
          </div>
        )}
      </div>
      <div className="weight-row" data-testid="weight">
        <span>
          <Icon name="capacity" size={13} /> <b>{chars}</b>字{concept > 0 && <span className="dim small">（新しい概念の分 {concept}字も使う）</span>}
        </span>
        <span className={over ? 'tone-bad' : 'dim'}>
          使える文字数 {view.capacity.used} → <b>{after}</b> / {view.capacity.max}字
        </span>
      </div>
      {over && <p className="block">使える文字数が {Math.ceil(after - view.capacity.max)}字 足りない。先にどこかを消すか短く書き換える。</p>}

      <div className="edit-actions">
        <button
          className={coachBtn === 'write' ? 'btn btn-primary wide coach-target' : 'btn btn-primary wide'}
          disabled={!changed || over || noEdits || ended || noise !== null}
          onClick={() => {
            if (writeWorld(target, text)) seWrite();
          }}
          data-testid="write"
        >
          <Pencil size={15} strokeWidth={1.5} aria-hidden="true" /> {text.trim() === '' && target.kind !== 'new' ? 'この行を世界から消す' : '世界を書き換える'}
          <span className="dim small">（残り {view.edits.left}）</span>
        </button>
        {target.kind !== 'new' && (
          <div className="row2">
            <button className={coachBtn === 'clear' ? 'btn coach-target' : 'btn'} onClick={() => setText('')} disabled={text === ''} data-testid="clear">
              文章を消す
            </button>
            {law ? (
              <button className="btn" onClick={() => setText(withoutPeriod(original))} disabled={withoutPeriod(text) === withoutPeriod(original)} data-testid="restore">
                元の文にする
              </button>
            ) : (
              <button className="btn" onClick={() => setText(withoutPeriod(line?.text ?? ''))} disabled={withoutPeriod(text) === withoutPeriod(line?.text ?? '')}>
                書き直しをやめる
              </button>
            )}
          </div>
        )}
        {ended ? <p className="block">この世界はもう終わっている</p> : noEdits && <p className="block">書き換えの残りがない。時間を進めると戻る。</p>}
      </div>

      {law?.fact && (
        <p className="fact">
          <span className="fact-label">現実では</span>
          {law.fact}
          <SourceNote id={`laws/${law.id}/fact`} />
        </p>
      )}
      <details className="hint">
        <summary>世界が読み取る言葉</summary>
        <p>否定（〜ない）・量（少し／倍／大量）・頻度（数日に一度／週に一度）・例外（ただし〜は除く）・条件（〜のときだけ）・ 「〜なしで」「〜だけ」「〜に強い」。英語でも書ける。</p>
        <p>ひとつの文にいくつもの新しい概念を書ける（例：「人間は空を飛び、光合成できる。」）。 技術や科学の言葉（人工知能・半導体・反物質など）も読み取る。</p>
        <p>意味が伝わらない文章（知らない言葉・問いかけ・記号だけ）は世界に届かない。書き込めず、書き換えの残りも文字数も減らない。 「世界の読み」の点線の言葉は世界がまだ知らない言葉。</p>
        <p>長い文章ほど使える文字数を使う。同じものについて短く言い換えれば（例：「人は毎日食べる。」）、意味を変えずに字数を減らせる。</p>
        <p>入力欄の下の言葉を押すとカーソルの位置に差し込む。「〜ない」は文の終わりを打ち消しの形にする。</p>
        {target.kind === 'new' ? <p>すでにある行と同じものについて書いた文はその行の書き換えとして読まれる。</p> : <p>別のものについての文に書き換えると元の意味は消え、新しい意味がその行に宿る。</p>}
      </details>
    </Sheet>
  );
}

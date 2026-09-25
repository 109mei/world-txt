import { useEffect, useRef, useState } from 'react';
import { costAfter, noiseOf, originalText, textCost, weightOf } from '../../core';
import { gameData } from '../../data';
import { closeSheet, getRuntime, NOISE_EFFECT, noiseText, useGame, writeWorld } from '../../store/game';
import type { EditTarget } from '../../store/runtime';
import { Icon } from '../icons';
import { Sheet } from '../parts';
import { seWrite } from '../se';
import { insertAt, keyWords, negate } from '../wording';

/** 入力の補助で差し込める言葉（量・限定・例外）。選択肢ではなく、打つ手間を減らすだけ */
const HELPERS = ['少し', 'とても', 'だけ', 'なしで', 'ただし、'];
/** 入力の補助に並べる、その行の言葉の数 */
const KEY_WORDS = 4;

/**
 * WORLD.txt の1行を、そのまま書き換える。選択肢も予測も出さない。
 * 結果は、時間を進めて世界を見るまでわからない。
 */
export function EditSheet({ target }: { target: EditTarget }) {
  const view = useGame((s) => s.view);
  const line = target.kind === 'new' ? null : view?.laws.find((l) => l.id === target.id);
  const law = target.kind === 'law' ? gameData.lawById.get(target.id) : null;
  const original = law ? originalText(law) : '';
  const current = line ? (line.state === 'deleted' ? '' : line.text) : '';
  const [text, setText] = useState(line ? line.text : '');
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
  const after = costAfter(g, gameData, target, text);
  const over = after > g.sim.capacityMax && after > view.capacity.used;
  const changed = text.trim() !== current.trim();
  const noEdits = view.edits.left <= 0;
  const ended = view.status !== 'playing';
  const negated = negate(text);
  const words = keyWords(original, line?.text ?? '').slice(0, KEY_WORDS);

  const title =
    target.kind === 'new' ? (
      <>
        <Icon name="edit" size={16} /> 新しい定義を書く
      </>
    ) : (
      <>
        <Icon name={line?.icon ?? 'edit'} size={16} /> {line?.conceptName}
        {line?.no != null && <span className="dim small">　{String(line.no).padStart(2, '0')}行目</span>}
      </>
    );

  return (
    <Sheet title={title} onClose={closeSheet} testId="edit-sheet">
      {line && (
        <div className="now-text">
          <div className="mini-label">いまの文章</div>
          <p className={line.state === 'deleted' ? 'law-big deleted' : 'law-big'}>{line.state === 'deleted' ? `（削除）${line.text}` : line.text}</p>
          {!line.understood ? (
            <p className="reading noise" data-testid="reading">
              <b>意味なし</b>　{noiseText(noiseOf(line.text))}。{NOISE_EFFECT}{target.kind === 'law' ? '（この行の意味は、書き換える前のまま）' : ''}
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
        placeholder={target.kind === 'new' ? '例：人間は空を飛べる。' : '文章を消すと、その法則は世界から消える'}
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
      <div className="weight-row" data-testid="weight">
        <span>
          <Icon name="capacity" size={13} /> <b>{chars}</b>字{concept > 0 && <span className="dim small">（＋新しい概念 {concept}字）</span>}
        </span>
        <span className={over ? 'tone-bad' : 'dim'}>
          世界容量 {view.capacity.used} → <b>{after}</b> / {view.capacity.max}字
        </span>
      </div>
      {over && <p className="block">世界容量が {Math.ceil(after - view.capacity.max)}字 足りない。先にどこかを消すか、短く書き換える。</p>}

      <div className="edit-actions">
        <button
          className="btn btn-primary wide"
          disabled={!changed || over || noEdits || ended}
          onClick={() => {
            if (writeWorld(target, text)) seWrite();
          }}
          data-testid="write"
        >
          ✎ {text.trim() === '' && target.kind !== 'new' ? 'この行を世界から消す' : '世界を書き換える'}
          <span className="dim small">（残り {view.edits.left}）</span>
        </button>
        {target.kind !== 'new' && (
          <div className="row2">
            <button className="btn" onClick={() => setText('')} disabled={text === ''} data-testid="clear">
              文章を消す
            </button>
            {law ? (
              <button className="btn" onClick={() => setText(original)} disabled={text === original} data-testid="restore">
                元の文にする
              </button>
            ) : (
              <button className="btn" onClick={() => setText(line?.text ?? '')} disabled={text === (line?.text ?? '')}>
                書き直しをやめる
              </button>
            )}
          </div>
        )}
        {ended ? (
          <p className="block">この世界はもう終わっている。</p>
        ) : (
          noEdits && <p className="block">書き換えの力が残っていない。時間を進めると戻る。</p>
        )}
      </div>

      {law?.fact && (
        <p className="fact">
          <span className="fact-label">現実では</span>
          {law.fact}
        </p>
      )}
      <details className="hint">
        <summary>世界が読み取る言葉</summary>
        <p>
          否定（〜ない）・量（少し／倍／大量）・頻度（数日に一度／週に一度）・例外（ただし〜は除く）・条件（〜のときだけ）・
          「〜なしで」「〜だけ」「〜に強い」。英語でも書ける。
        </p>
        <p>
          ひとつの文に、いくつもの新しい概念を書ける（例：「人間は空を飛び、光合成できる。」）。
          技術や科学の言葉（人工知能・半導体・反物質など）も読み取る。
        </p>
        <p>
          意味が伝わらない文章（知らない言葉・問いかけ・記号だけ）は意味のない文になり、世界は何も変わらない。使うのは文字数と書換の力だけ。
        </p>
        <p>
          長い文章ほど世界容量（文字数）を使う。同じものについて短く言い換えれば（例：「人は毎日食べる。」）、意味を変えずに字数を減らせる。
        </p>
        <p>入力欄の下の言葉を押すと、カーソルの位置に差し込む。「〜ない」は文の終わりを打ち消しの形にする。</p>
        {target.kind === 'new' ? (
          <p>すでにある行と同じものについて書いた文は、その行の書き換えとして読まれる。</p>
        ) : (
          <p>別のものについての文に書き換えると、元の定義は消え、新しい定義がその行に宿る。</p>
        )}
      </details>
    </Sheet>
  );
}

/**
 * 長押しや右クリックで出るメニュー（文字のコピー・画像の保存・リンクを開く など）と、
 * 文字の選択・ドラッグを止める（ゲームの画面として触れるように）。
 * 書き換えの編集欄やセーブの読み込み欄のような入力欄だけは、これまでどおり選んで貼り付けられる。
 */

/** 入力欄の中か */
export function inEditable(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return !!el?.closest('input, textarea, [contenteditable="true"]');
}

export function guardLongPress(doc: Document): void {
  const stop = (e: Event) => {
    if (!inEditable(e.target)) e.preventDefault();
  };
  doc.addEventListener('contextmenu', stop);
  doc.addEventListener('selectstart', stop);
  doc.addEventListener('dragstart', stop);
}

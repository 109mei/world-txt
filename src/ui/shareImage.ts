/**
 * 終わった世界のカードを、共有用の画像（1200×630、OGP と同じ横長）に描く。
 * 黒と銀の写本調。プレイヤーの書いた一文だけを青いインクで入れる。
 */

export interface CardImage {
  number: string;
  stage: string;
  cleared: boolean;
  /** 無限の世界（何年続いたか） */
  endless?: boolean;
  title: string;
  years: number;
  tags: string[];
  missing: string[];
  /** プレイヤーの最初の書き換え（「前」→「後」） */
  edit: string | null;
  failText: string | null;
}

const W = 1200;
const H = 630;
const SERIF = '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';
const LATIN = '"Cormorant Garamond", "Shippori Mincho", serif';

async function fontsReady(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`700 60px ${SERIF}`),
      document.fonts.load(`600 60px ${SERIF}`),
      document.fonts.load(`400 26px ${SERIF}`),
      document.fonts.load(`600 40px ${LATIN}`),
    ]);
    await document.fonts.ready;
  } catch {
    // 書体が読めなくても、手持ちの明朝で描く
  }
}

/** 幅に収まるまで文字を小さくする */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, min: number, width: number): number {
  let size = max;
  for (; size > min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= width) break;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

/** 幅に収まらない文は、末尾を「…」で切る */
function clip(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t}…`;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'right' | 'center'): void {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i]! + spacing;
  });
  ctx.textAlign = prev;
}

export async function renderCard(card: CardImage): Promise<Blob> {
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas が使えない');

  // 背景：黒に、上からの淡い光
  ctx.fillStyle = '#050506';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -60, 40, W / 2, -60, 760);
  glow.addColorStop(0, 'rgba(255,255,255,0.13)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 枠と四隅の留め金
  const m = 34;
  ctx.strokeStyle = 'rgba(214,220,232,0.32)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * 28, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 28);
    ctx.stroke();
  };
  corner(m - 8, m - 8, 1, 1);
  corner(W - m + 8, m - 8, -1, 1);
  corner(m - 8, H - m + 8, 1, -1);
  corner(W - m + 8, H - m + 8, -1, -1);

  const left = 84;
  const right = W - 84;
  ctx.textBaseline = 'alphabetic';

  // 頭：WORLD.txt #番号 ／ ステージと結末
  ctx.fillStyle = '#eceae4';
  ctx.font = `600 34px ${LATIN}`;
  spaced(ctx, 'WORLD.txt', left, 104, 2, 'left');
  const logoW = ctx.measureText('WORLD.txt').width + 16;
  // Cormorant の数字は小文字風（3o）になるので、数字は明朝で描く
  ctx.fillStyle = '#a2a5ac';
  ctx.font = `400 24px ${SERIF}`;
  spaced(ctx, `#${card.number}`, left + logoW + 14, 104, 2, 'left');
  ctx.fillStyle = card.cleared ? '#a3dcbf' : '#f2a393';
  ctx.font = `600 24px ${LATIN}`;
  spaced(ctx, card.cleared ? 'MISSION COMPLETE' : card.endless ? 'THE END OF THE WORLD' : 'WORLD COLLAPSED', right, 92, 6, 'right');
  ctx.fillStyle = '#a2a5ac';
  ctx.font = `400 22px ${SERIF}`;
  ctx.textAlign = 'right';
  ctx.fillText(card.stage, right, 124);
  ctx.textAlign = 'left';

  // 世界の名前
  ctx.fillStyle = '#f4f2ec';
  ctx.textAlign = 'center';
  const titleText = `「${card.title}」`;
  fitFont(ctx, titleText, 700, SERIF, 64, 36, right - left);
  ctx.shadowColor = 'rgba(255,255,255,0.28)';
  ctx.shadowBlur = 18;
  ctx.fillText(titleText, W / 2, 250);
  ctx.shadowBlur = 0;

  // 存続年数
  ctx.fillStyle = '#a2a5ac';
  ctx.font = `400 26px ${SERIF}`;
  const yearsLabel = card.endless ? '人類文明は' : '文明存続';
  const numText = String(card.years);
  ctx.font = `600 60px ${SERIF}`;
  const numW = ctx.measureText(numText).width;
  ctx.font = `400 26px ${SERIF}`;
  const labelW = ctx.measureText(yearsLabel).width;
  const unitW = ctx.measureText(card.endless ? '年続いた' : '年').width;
  const rowW = labelW + 18 + numW + 12 + unitW;
  let x = W / 2 - rowW / 2;
  ctx.textAlign = 'left';
  ctx.fillText(yearsLabel, x, 336);
  x += labelW + 18;
  ctx.fillStyle = '#eceae4';
  ctx.font = `600 60px ${SERIF}`;
  ctx.fillText(numText, x, 340);
  x += numW + 12;
  ctx.fillStyle = '#a2a5ac';
  ctx.font = `400 26px ${SERIF}`;
  ctx.fillText(card.endless ? '年続いた' : '年', x, 336);

  // 世界の姿（タグ）
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8dbe2';
  ctx.font = `400 24px ${SERIF}`;
  if (card.tags.length > 0) ctx.fillText(clip(ctx, card.tags.slice(0, 4).join('　·　'), right - left), W / 2, 402);

  // 存在しないもの／失敗の理由
  ctx.fillStyle = '#8f939b';
  ctx.font = `400 22px ${SERIF}`;
  const lower = card.missing.length > 0 ? `存在しないもの　${card.missing.map((s) => `× ${s}`).join('　')}` : card.failText ?? '';
  if (lower) ctx.fillText(clip(ctx, lower, right - left), W / 2, 446);

  // プレイヤーの書いた一文（青いインク）
  if (card.edit) {
    ctx.fillStyle = '#a6cdff';
    ctx.shadowColor = 'rgba(166,205,255,0.35)';
    ctx.shadowBlur = 10;
    ctx.font = `400 22px ${SERIF}`;
    ctx.fillText(clip(ctx, `✎ ${card.edit}`, right - left), W / 2, 500);
    ctx.shadowBlur = 0;
  }

  // 足：合言葉とハッシュタグ
  ctx.strokeStyle = 'rgba(214,220,232,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, 540);
  ctx.lineTo(right, 540);
  ctx.stroke();
  ctx.fillStyle = '#8f939b';
  ctx.textAlign = 'left';
  ctx.font = `400 20px ${SERIF}`;
  spaced(ctx, '世界は、文章でできている。', left, 574, 3, 'left');
  ctx.font = `500 22px ${LATIN}`;
  spaced(ctx, '#WORLDtxt', right, 574, 2, 'right');

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を作れなかった'))), 'image/png');
  });
}

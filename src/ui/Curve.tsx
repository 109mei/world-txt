/**
 * 年ごとの値の折れ線（モノクロ）。書き換えた年に青いインクの印を、失敗の線に点線を引く。
 * 数字は見せず、始まりと終わりの言葉だけを添える。
 * prev を渡すと、前回（同じ世界番号のひとつ前の遊び・くり返しの前の周）の線を、同じ目盛りの点線で重ねる
 */
export function Curve({
  label,
  values,
  marks,
  from,
  to,
  min,
  max,
  danger,
  testId,
  prev,
}: {
  label: string;
  values: readonly number[];
  /** 書き換えた年（0 年目からの位置） */
  marks: readonly number[];
  from: string;
  to: string;
  min?: number;
  max?: number;
  /** これを下回ると失敗する線 */
  danger?: number;
  testId?: string;
  /** 前回の線（同じ目盛りで点線にして重ねる） */
  prev?: readonly number[] | null;
}) {
  const n = values.length;
  const before = prev && prev.length >= 2 ? prev : null;
  // 今の線が1点だけでも、前回の線があれば描く（くり返しの周が変わった直後など）
  if (n === 0 || (n < 2 && !before)) return null;
  const w = 300;
  const h = 58;
  const pad = 5;
  const lo = Math.min(min ?? Infinity, danger ?? Infinity, ...values, ...(before ?? []));
  const hi = Math.max(max ?? -Infinity, ...values, ...(before ?? []));
  const span = hi - lo || 1;
  // 前回の線があれば、長いほうの年数で横の目盛りをとる（同じ年が同じ位置に来るように）
  const years = Math.max(n, before?.length ?? 0);
  const x = (i: number) => pad + (i / (years - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - lo) / span) * (h - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const dPrev = before ? before.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') : null;
  const area = `${d} L${x(n - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`;
  return (
    <div className="curve" data-testid={testId}>
      <div className="curve-head">
        <span className="curve-label">{label}</span>
        <span className="curve-range">
          {from} → <b>{to}</b>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="curve-svg" aria-hidden="true">
        {danger !== undefined && <line x1={0} x2={w} y1={y(danger)} y2={y(danger)} className="curve-danger" />}
        {marks
          .filter((m) => m >= 0 && m < n)
          .map((m) => (
            <line key={m} x1={x(m)} x2={x(m)} y1={0} y2={h} className="curve-mark" />
          ))}
        <path d={area} className="curve-area" />
        {dPrev && <path d={dPrev} className="curve-prev" data-testid="curve-prev" />}
        <path d={d} className="curve-line" />
      </svg>
    </div>
  );
}

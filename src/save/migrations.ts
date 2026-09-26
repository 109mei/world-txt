type Json = Record<string, any>;

/**
 * 版 n のセーブを 版 n+1 に変換する関数。
 * 0 → 1：試作初期の形（進み具合と設定がない）に、既定の進み具合と設定を足す。
 * 1 → 2：観測記録（progress.discovered）を足す。遊んでいる世界で見つけたものは、そのまま記録に入れる。
 * 2 → 3：無限の世界の記録（progress.endless）を足す。遊んでいる世界の危機の項目は、読み込むときに core が補う。
 * 3 → 4：実績（progress.achievements）と、放棄した世界の数（progress.abandoned）を足す。
 * 4 → 5：無限の世界の記録簿（progress.ranking）を足す。これまでの記録から、長く続いた順に上位10件を入れる。
 * 5 → 6：開いていく順番と棋譜のための記録を足す。遊び終えた世界（progress.played）は、記録の残っている世界から補い、
 *        すでに世界を遊んだことがあれば序章も遊び終えたことにする（序章を遊ばなくても、これまでの世界が開いたままになるように）。
 *        負けた数・棋譜・改稿者の試練・書き出した日・1度だけの案内・画面の明るさなどは、読み込むときに既定の値で補う。
 */
export const MIGRATIONS: Record<number, (old: Json) => Json> = {
  0: (d) => {
    d.settings = { bgm: true, volume: 0.6, analysis: false, ...(d.settings ?? {}) };
    d.progress = { cleared: [], best: {}, worlds: 0, ...(d.progress ?? {}) };
    d.current = d.current ?? null;
    d.savedAt = typeof d.savedAt === 'number' ? d.savedAt : 0;
    return d;
  },
  1: (d) => {
    const found: string[] = Array.isArray(d.current?.found) ? d.current.found : [];
    d.progress = { ...d.progress, discovered: Array.isArray(d.progress?.discovered) ? d.progress.discovered : [...found] };
    if (d.current && !Array.isArray(d.current.found)) d.current.found = [];
    return d;
  },
  2: (d) => {
    d.progress = { ...d.progress, endless: Array.isArray(d.progress?.endless) ? d.progress.endless : [] };
    return d;
  },
  3: (d) => {
    d.progress = {
      ...d.progress,
      achievements: Array.isArray(d.progress?.achievements) ? d.progress.achievements : [],
      abandoned: typeof d.progress?.abandoned === 'number' ? d.progress.abandoned : 0,
    };
    return d;
  },
  4: (d) => {
    const runs: Json[] = Array.isArray(d.progress?.endless) ? d.progress.endless : [];
    const ranking = Array.isArray(d.progress?.ranking)
      ? d.progress.ranking
      : runs
          .filter((r) => typeof r?.years === 'number')
          .map((r) => ({ years: r.years, daily: r.daily ?? null, at: typeof r.at === 'number' ? r.at : 0, title: String(r.title ?? ''), ending: null, edits: 0, averted: 0 }))
          .sort((a, b) => b.years - a.years || a.at - b.at)
          .slice(0, 10);
    d.progress = { ...d.progress, ranking };
    return d;
  },
  5: (d) => {
    const best = d.progress?.best && typeof d.progress.best === 'object' ? Object.keys(d.progress.best) : [];
    const cleared: unknown[] = Array.isArray(d.progress?.cleared) ? d.progress.cleared : [];
    const played = new Set<string>([...best, ...cleared.filter((s): s is string => typeof s === 'string')]);
    if ((typeof d.progress?.worlds === 'number' && d.progress.worlds > 0) || played.size > 0) played.add('prologue');
    d.progress = { ...d.progress, played: Array.isArray(d.progress?.played) ? d.progress.played : [...played] };
    return d;
  },
};

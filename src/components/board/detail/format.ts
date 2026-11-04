// Number formatting shared by the detail charts. Shares are 0..1 in the data.

/** 0.356 → "36%" */
export const pct = (share: number, digits = 0): string => `${(share * 100).toFixed(digits)}%`;

/** 69.2 → "+69%p", -3 → "−3%p" */
export const signedPP = (pp: number): string => {
  const r = Math.round(pp);
  if (r > 0) return `+${r}%p`;
  if (r < 0) return `−${Math.abs(r)}%p`;
  return '0%p';
};

/** 1234 → "1,234" */
export const num = (n: number): string => n.toLocaleString('ko-KR');

/** "10/28건 (36%)" style: count over total with the share. */
export const countShare = (n: number, total: number): string =>
  total > 0 ? `${num(n)}/${num(total)} (${pct(n / total)})` : `${num(n)}/${num(total)}`;

/** Ratio as "1.08배"; two digits under 10, one above. */
export const times = (r: number): string => `${r < 10 ? r.toFixed(2) : r.toFixed(1)}배`;

const KST_MS = 9 * 60 * 60 * 1000;

/** epoch ms → "YYYY-MM-DD" in KST (the game runs on Korean time). */
export const kstDay = (ts: number): string => new Date(ts + KST_MS).toISOString().slice(0, 10);

/** Fraction of the KST day elapsed at ts (0..1), to place a patch inside its day. */
export const kstDayFraction = (ts: number): number => {
  const ms = (ts + KST_MS) % (24 * 60 * 60 * 1000);
  return ms / (24 * 60 * 60 * 1000);
};

/** "2026-10-14" → "10/14" (no leading zeros kept as in the design). */
export const md = (day: string): string => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

/** SVG coordinates rounded so server and client render the same attribute strings. */
export const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Ratio with two decimals at any size ("19.21배"), for a value shown next to its 2-decimal range. */
export const times2 = (r: number): string => `${r.toFixed(2)}배`;

/**
 * Risk vs expected for the list and KPI. The batch writes 0 for monsters with no deaths, which
 * reads as "0.00배" but means there is nothing to compare, so it is shown as "사망 0건".
 */
export const riskLabel = (risk: number | null, deaths: number): string => {
  if (risk === null || !Number.isFinite(risk)) return '–';
  if (risk === 0 && deaths === 0) return '사망 0건';
  return `${risk.toFixed(2)}배`;
};

/** %p from the two shares as displayed (rounded to whole percents), so "27% → 78%" reads +51%p. */
export const shownPP = (from: number, to: number): string =>
  signedPP(Math.round(to * 100) - Math.round(from * 100));

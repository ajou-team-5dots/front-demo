// URL query <-> board filters. Shared by server pages and client controls, so no server-only.
import type { BoardFilters, FlowKey, FlowPick, MonsterGroup } from '@/types/board';

export const MONSTER_GROUPS: MonsterGroup[] = [
  '던전 보스',
  '중간보스',
  '일반·strong',
  '일반·medium',
  '일반·약함',
];

export const FLOW_KEYS: FlowKey[] = ['lv', 'wp', 'ar', 'grp'];

export const DEFAULT_FILTERS: BoardFilters = {
  heavy: 'include',
  period: 'current',
  stage: null,
  group: null,
  q: '',
};

type Query = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export function parseFilters(query: Query): BoardFilters {
  const rawStage = first(query.stage);
  const stage = rawStage ? Number(rawStage) : NaN;
  const group = first(query.group);
  return {
    heavy: first(query.heavy) === 'exclude' ? 'exclude' : 'include',
    period: first(query.period) === 'all' ? 'all' : 'current',
    stage: Number.isInteger(stage) && stage >= 0 ? stage : null,
    group: MONSTER_GROUPS.find((g) => g === group) ?? null,
    q: (first(query.q) ?? '').trim().slice(0, 40),
  };
}

export function parsePick(query: Query): FlowPick {
  const pick: FlowPick = {};
  FLOW_KEYS.forEach((k) => {
    const v = first(query[k]);
    if (v) pick[k] = v.slice(0, 20);
  });
  return pick;
}

/** Query string for filters + pick, leaving defaults out so URLs stay short. */
export function toQuery(filters: BoardFilters, pick: FlowPick = {}): string {
  const p = new URLSearchParams();
  if (filters.heavy !== 'include') p.set('heavy', filters.heavy);
  if (filters.period !== 'current') p.set('period', filters.period);
  if (filters.stage !== null) p.set('stage', String(filters.stage));
  if (filters.group !== null) p.set('group', filters.group);
  if (filters.q) p.set('q', filters.q);
  FLOW_KEYS.forEach((k) => {
    const v = pick[k];
    if (v) p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Selected monster (?m=), or null for the overview. */
export function parseMonster(query: Query): string | null {
  const m = (first(query.m) ?? '').trim().slice(0, 60);
  return m || null;
}

/** The board with filters + pick, and the monster's detail open when one is given. */
export function boardHref(filters: BoardFilters, pick: FlowPick = {}, monster?: string | null) {
  const qs = toQuery(filters, pick);
  if (!monster) return `/${qs}`;
  return `/${qs}${qs ? '&' : '?'}m=${encodeURIComponent(monster)}`;
}

/** The board with this monster's detail open next to the risk list (one page, no route). */
export function detailHref(monster: string, filters: BoardFilters, pick: FlowPick = {}): string {
  return boardHref(filters, pick, monster);
}

/**
 * A list row or scatter mark's href: opens this monster, or returns to the overview (no ?m=) when
 * it is the one already open, so a second click on the same row closes the detail.
 */
export function toggleHref(
  filters: BoardFilters,
  pick: FlowPick,
  monster: string,
  open: string | null,
): string {
  return boardHref(filters, pick, monster === open ? null : monster);
}

/** The monster a board href opens (?m=), null for the overview. */
export function monsterOfHref(href: string): string | null {
  const i = href.indexOf('?');
  if (i < 0) return null;
  return new URLSearchParams(href.slice(i + 1)).get('m') || null;
}

/** Group of a monster, same buckets as the flow's last column. */
export function groupOf(role: string, grade: string): MonsterGroup {
  if (role === 'boss') return '던전 보스';
  if (role === 'midboss') return '중간보스';
  if (grade === 'strong') return '일반·strong';
  if (grade === 'medium') return '일반·medium';
  return '일반·약함';
}

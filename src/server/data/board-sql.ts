import 'server-only';

import type { FlowColumn, FlowPick, MonsterGroup } from '@/types/board';

// SQL pieces for the board-only reads in board.ts. Base tables only (encounters, player_deaths).
// Heavy and period filters are SCOPE_FILTER in monster-counts.ts, shared with the monster reads.

/** Calendar days are Seoul days (patch times and the data range are KST). */
export const DAY_TZ = 'Asia/Seoul';

// Flow (sankey) buckets. The same expressions work on encounters and player_deaths (both carry
// level, weapon_tier, armor_count); the monster group needs role/grade, which only encounters has.
export const UNKNOWN_LEVEL = '모름';
export const LEVEL_EXPR = `multiIf(level IS NULL, '${UNKNOWN_LEVEL}', level < 20, '1~19', level < 40, '20~39', level < 70, '40~69', '70+')`;
export const WEAPON_EXPR = `multiIf(weapon_tier IN ('none', 'wooden'), '없음·나무', weapon_tier = 'stone', '돌', weapon_tier = 'iron', '철', '금·다이아')`;
export const ARMOR_EXPR = `multiIf(armor_count = 0, '없음', armor_count < 6, '일부', '6부위')`;
export const GROUP_EXPR = `multiIf(role = 'boss', '던전 보스', role = 'midboss', '중간보스', grade = 'strong', '일반·strong', grade = 'medium', '일반·medium', '일반·약함')`;

/** Column order and value order for the flow. */
export const FLOW_COLUMNS: FlowColumn[] = [
  { key: 'lv', label: '레벨', values: ['1~19', '20~39', '40~69', '70+'] },
  { key: 'wp', label: '무기', values: ['없음·나무', '돌', '철', '금·다이아'] },
  { key: 'ar', label: '방어구', values: ['없음', '일부', '6부위'] },
  {
    key: 'grp',
    label: '몬스터 집단',
    values: ['일반·약함', '일반·medium', '일반·strong', '중간보스', '던전 보스'],
  },
];

/** Picked level/weapon/armor buckets ('' = any). The group is handled by the caller. */
export const PICK_WHERE = `({lv:String} = '' OR ${LEVEL_EXPR} = {lv:String})
  AND ({wp:String} = '' OR ${WEAPON_EXPR} = {wp:String})
  AND ({ar:String} = '' OR ${ARMOR_EXPR} = {ar:String})`;

export const pickParams = (pick: FlowPick) => ({
  lv: pick.lv ?? '',
  wp: pick.wp ?? '',
  ar: pick.ar ?? '',
});

/** monster_id → role, grade (constant per monster). Deaths take their group through this. */
export const CATALOG_SQL = `SELECT monster_id, any(role) AS role, any(grade) AS grade
  FROM encounters GROUP BY monster_id`;

/** Same buckets as GROUP_EXPR. */
export const groupOfRow = (role: string, grade: string): MonsterGroup => {
  if (role === 'boss') return '던전 보스';
  if (role === 'midboss') return '중간보스';
  if (grade === 'strong') return '일반·strong';
  if (grade === 'medium') return '일반·medium';
  return '일반·약함';
};

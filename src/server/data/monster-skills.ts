import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import {
  H3_MIN_ABILITY_DEATHS,
  H3_MIN_SURV_ENC,
  H3_PP,
  H3_RATIO,
  H3_WINDOWS,
  MIN_DEATHS,
} from '@/server/config/criteria';
import { query } from '@/server/db/query';
import type { BossSkill, H3State, H3Window, Heavy, Period } from '@/types/monsters';

import { GAME_EVENTS_TAG } from './game-events';
import { SCOPE_FILTER, scopeParams } from './monster-counts';

interface SkillCounts {
  monster: string;
  abilityId: string;
  window: number;
  deathsWithAbility: number;
  deathsTotal: number;
  survEncWithAbility: number;
  survEncTotal: number;
}

export interface MonsterSkill extends BossSkill {
  monster: string;
}

const toWindow = (row: SkillCounts): H3Window => {
  const deathShare = row.deathsTotal === 0 ? 0 : row.deathsWithAbility / row.deathsTotal;
  const survShare = row.survEncTotal === 0 ? 0 : row.survEncWithAbility / row.survEncTotal;
  const diffPP = (deathShare - survShare) * 100;
  const ratio = survShare === 0 ? null : deathShare / survShare;
  let state: H3State = 'none';
  if (
    row.deathsTotal < MIN_DEATHS ||
    row.survEncTotal < H3_MIN_SURV_ENC ||
    row.deathsWithAbility < H3_MIN_ABILITY_DEATHS
  ) {
    state = 'sample_short';
  } else if (diffPP >= H3_PP && (ratio === null || ratio >= H3_RATIO)) {
    state = 'signal';
  }
  return {
    deathsWithAbility: row.deathsWithAbility,
    deathsTotal: row.deathsTotal,
    deathShare,
    survEncWithAbility: row.survEncWithAbility,
    survEncTotal: row.survEncTotal,
    survShare,
    diffPP,
    ratio,
    state,
  };
};

/** Aggregate every boss in one query so the main list does not query each boss separately. */
export async function getMonsterSkills(
  heavy: Heavy,
  period: Period = 'current',
): Promise<MonsterSkill[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  const rows = await query<SkillCounts>(
    `WITH
      abilities AS (
        SELECT boss_id, ability FROM ability_events WHERE ability != ''
        GROUP BY boss_id, ability
      ),
      entity_abilities AS (
        SELECT boss_id, entity_id, groupArray((ability, ts)) AS events
        FROM ability_events WHERE ability != '' GROUP BY boss_id, entity_id
      ),
      subjects AS (
        SELECT monster_id, entity_id, ts AS reference_ts, true AS is_death
        FROM player_deaths WHERE ${SCOPE_FILTER}
        UNION ALL
        SELECT monster_id, entity_id, max_hit_ts AS reference_ts, false AS is_death
        FROM encounters
        WHERE n_taken > 0 AND NOT died AND ${SCOPE_FILTER}
      )
      SELECT a.boss_id AS monster, a.ability AS abilityId, w.seconds AS window,
        toUInt32(countIf(s.is_death)) AS deathsTotal,
        toUInt32(countIf(NOT s.is_death)) AS survEncTotal,
        toUInt32(countIf(s.is_death AND arrayExists(
          ev -> ev.1 = a.ability AND ev.2 >= s.reference_ts - w.seconds * 1000
            AND ev.2 <= s.reference_ts, e.events))) AS deathsWithAbility,
        toUInt32(countIf(NOT s.is_death AND arrayExists(
          ev -> ev.1 = a.ability AND ev.2 >= s.reference_ts - w.seconds * 1000
            AND ev.2 <= s.reference_ts, e.events))) AS survEncWithAbility
      FROM abilities AS a
      INNER JOIN subjects AS s ON s.monster_id = a.boss_id
      LEFT JOIN entity_abilities AS e ON e.boss_id = s.monster_id AND e.entity_id = s.entity_id
      CROSS JOIN (SELECT arrayJoin({windows:Array(UInt32)}) AS seconds) AS w
      GROUP BY a.boss_id, a.ability, w.seconds
      ORDER BY monster, abilityId, window DESC`,
    { ...scopeParams(heavy, period), windows: [...H3_WINDOWS] },
  );
  const firstWindow = rows.filter((row) => row.window === H3_WINDOWS[0]);
  return firstWindow.map((row) => {
    const second = rows.find(
      (other) =>
        other.monster === row.monster &&
        other.abilityId === row.abilityId &&
        other.window === H3_WINDOWS[1],
    );
    if (!second) throw new Error('H3 두 번째 시간 창이 없습니다.');
    const w5 = toWindow(row);
    const w2 = toWindow(second);
    const prefix = `${row.monster}_`;
    return {
      monster: row.monster,
      abilityId: row.abilityId,
      ability: row.abilityId.startsWith(prefix)
        ? row.abilityId.slice(prefix.length)
        : row.abilityId,
      windows: { 5: w5, 2: w2 },
      state: w5.state,
      state2: w2.state,
      criterionEffect: (w5.state === 'signal') !== (w2.state === 'signal'),
    };
  });
}

/** Ability-specific low counts must not make an otherwise adequate boss sample short. */
export function getBossState(skills: BossSkill[], window: 5 | 2): H3State {
  if (skills.some((skill) => skill.windows[window].state === 'signal')) return 'signal';
  const counts = skills[0]?.windows[window];
  if (!counts || counts.deathsTotal < MIN_DEATHS || counts.survEncTotal < H3_MIN_SURV_ENC) {
    return 'sample_short';
  }
  return 'none';
}

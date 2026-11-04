import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import {
  AUX2_BIG_HIT,
  DEATH_SIGNAL_QUANTILE,
  DEATH_STRONG_QUANTILE,
  H1_LEVEL_GAP,
  H1_MIN_COND_ENC,
  H1_PP,
  H1_RATIO,
  MIN_DEATHS,
} from '@/server/config/criteria';
import { query } from '@/server/db/query';
import type {
  DeathSignal,
  H1Condition,
  H1Readiness,
  H1State,
  Heavy,
  MonsterRole,
  Period,
} from '@/types/monsters';

import { GAME_EVENTS_TAG } from './game-events';

export interface MonsterCounts {
  monster: string;
  role: MonsterRole;
  grade: string;
  mainStage: number;
  enc: number;
  deaths: number;
  danger: number;
  deathsPer100: number;
  signal: DeathSignal;
  hitEnc: number;
  bigHit: number;
  unanswered: number;
}

/** Heavy and period filters for encounters and player_deaths. Needs scopeParams(). */
export const SCOPE_FILTER = `({allPeriod:UInt8} = 1 OR NOT pre_patch_entity)
  AND ({heavy:String} = 'include' OR NOT heavy_account)`;

export const scopeParams = (heavy: Heavy, period: Period) => ({
  heavy,
  allPeriod: period === 'all' ? 1 : 0,
});

/** Spec order (계산 명세 3-2); the screen lists conditions in this order. */
const H1_CONDITIONS: H1Condition[] = ['lowLevel', 'noWeapon', 'woodenWeapon', 'noArmor'];

/** Player death records and dangerous encounters are deliberately counted separately. */
export async function getMonsterCounts(
  heavy: Heavy,
  period: Period = 'current',
): Promise<MonsterCounts[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  return query<MonsterCounts>(
    `WITH scoped_enc AS (
      SELECT monster_id, role, grade, stage, danger, n_taken, max_hit_taken, p_max_hp
      FROM encounters WHERE ${SCOPE_FILTER}
    ), scoped_deaths AS (
      SELECT monster_id, stage, answered FROM player_deaths WHERE ${SCOPE_FILTER}
    ), enc_stages AS (
      SELECT monster_id, role, grade, stage, count() AS enc
      FROM scoped_enc GROUP BY monster_id, role, grade, stage
    ), death_stages AS (
      SELECT monster_id, stage, count() AS deaths
      FROM scoped_deaths GROUP BY monster_id, stage
    ), rates AS (
      SELECT e.role AS role, e.grade AS grade, e.stage AS stage,
        sum(d.deaths) / sum(e.enc) AS rate
      FROM enc_stages AS e
      LEFT JOIN death_stages AS d ON d.monster_id = e.monster_id AND d.stage = e.stage
      GROUP BY e.role, e.grade, e.stage
    ), expected AS (
      SELECT e.monster_id AS monster_id, sum(e.enc * r.rate) AS expDeathsStage,
        argMax(e.stage, (e.enc, -e.stage)) AS mainStage
      FROM enc_stages AS e
      INNER JOIN rates AS r ON r.role = e.role AND r.grade = e.grade AND r.stage = e.stage
      GROUP BY e.monster_id
    ), enc_counts AS (
      SELECT monster_id, any(role) AS role, any(grade) AS grade,
        toUInt32(count()) AS enc, toUInt32(countIf(danger)) AS danger,
        toUInt32(countIf(n_taken > 0)) AS hitEnc,
        toUInt32(countIf(n_taken > 0 AND p_max_hp > 0
          AND max_hit_taken / p_max_hp >= {bigHit:Float64})) AS bigHit
      FROM scoped_enc GROUP BY monster_id
    ), death_counts AS (
      SELECT monster_id, toUInt32(count()) AS deaths,
        toUInt32(countIf(NOT answered)) AS unanswered
      FROM scoped_deaths GROUP BY monster_id
    ), summary AS (
      SELECT e.monster_id AS monster, e.role AS role, e.grade AS grade, x.mainStage AS mainStage,
        e.enc AS enc, d.deaths AS deaths, e.danger AS danger,
        d.deaths / e.enc * 100 AS deathsPer100, e.hitEnc AS hitEnc, e.bigHit AS bigHit,
        d.unanswered AS unanswered,
        if(x.expDeathsStage = 0, if(d.deaths > 0, 1., 0.),
          arraySum(arrayMap(k -> exp(k * log(greatest(x.expDeathsStage, 1e-300))
            - x.expDeathsStage - lgamma(k + 1)), range(d.deaths)))) AS cdfBelow
      FROM enc_counts AS e
      LEFT JOIN death_counts AS d ON d.monster_id = e.monster_id
      INNER JOIN expected AS x ON x.monster_id = e.monster_id
    )
    SELECT monster, role, grade, mainStage, enc, deaths, danger, deathsPer100,
      hitEnc, bigHit, unanswered,
      multiIf(cdfBelow >= {strongQuantile:Float64}, 'strong',
        cdfBelow >= {signalQuantile:Float64}, 'signal', 'none') AS signal
    FROM summary ORDER BY monster`,
    {
      ...scopeParams(heavy, period),
      bigHit: AUX2_BIG_HIT,
      strongQuantile: DEATH_STRONG_QUANTILE,
      signalQuantile: DEATH_SIGNAL_QUANTILE,
    },
  );
}

interface ReadinessCounts {
  condition: H1Condition;
  encN: number;
  otherEncN: number;
  encDeadN: number;
  otherDeadN: number;
  winN: number;
  winTotal: number;
  deadN: number;
  deadTotal: number;
}

/** H1 shares use death-time equipment; rate comparisons use encounter-time equipment. */
export async function getMonsterReadiness(
  monster: string,
  heavy: Heavy,
  period: Period = 'current',
): Promise<H1Readiness[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  const rows = await query<ReadinessCounts>(
    `WITH scoped_enc AS (
      SELECT level, weapon_tier, armor_count, killed, died
      FROM encounters WHERE monster_id = {monster:String} AND ${SCOPE_FILTER}
    ), threshold AS (
      SELECT quantileExactInclusiveIf(0.5)(level, killed AND NOT died) - {levelGap:Int32} AS low_level
      FROM scoped_enc
    ), subjects AS (
      SELECT level, weapon_tier, armor_count, killed, died, false AS is_death FROM scoped_enc
      UNION ALL
      SELECT level, weapon_tier, armor_count, false AS killed, false AS died, true AS is_death
      FROM player_deaths WHERE monster_id = {monster:String} AND ${SCOPE_FILTER}
    ), conditions AS (
      SELECT killed, died, is_death, arrayJoin([
        ('lowLevel', ifNull(level < (SELECT low_level FROM threshold), false)),
        ('noWeapon', weapon_tier = 'none'),
        ('woodenWeapon', weapon_tier = 'wooden'),
        ('noArmor', armor_count = 0)
      ]) AS cond FROM subjects
    )
    SELECT cond.1 AS condition,
      toUInt32(countIf(NOT is_death AND cond.2)) AS encN,
      toUInt32(countIf(NOT is_death AND NOT cond.2)) AS otherEncN,
      toUInt32(countIf(NOT is_death AND cond.2 AND died)) AS encDeadN,
      toUInt32(countIf(NOT is_death AND NOT cond.2 AND died)) AS otherDeadN,
      toUInt32(countIf(NOT is_death AND cond.2 AND killed AND NOT died)) AS winN,
      toUInt32(countIf(NOT is_death AND killed AND NOT died)) AS winTotal,
      toUInt32(countIf(is_death AND cond.2)) AS deadN,
      toUInt32(countIf(is_death)) AS deadTotal
    FROM conditions GROUP BY condition`,
    { ...scopeParams(heavy, period), monster, levelGap: H1_LEVEL_GAP },
  );
  const order = (row: ReadinessCounts) => H1_CONDITIONS.indexOf(row.condition);
  return rows
    .sort((a, b) => order(a) - order(b))
    .map((row) => {
      const dead = row.deadTotal === 0 ? 0 : row.deadN / row.deadTotal;
      const win = row.winTotal === 0 ? 0 : row.winN / row.winTotal;
      const pp = (dead - win) * 100;
      const deathRate = row.encN === 0 ? 0 : row.encDeadN / row.encN;
      const otherRate = row.otherEncN === 0 ? 0 : row.otherDeadN / row.otherEncN;
      const ratio = otherRate === 0 ? null : deathRate / otherRate;
      let state: H1State = 'no';
      if (row.deadTotal < MIN_DEATHS || row.encN < H1_MIN_COND_ENC) state = 'unk';
      else if (pp >= H1_PP && (ratio === null ? deathRate > 0 : ratio >= H1_RATIO)) state = 'yes';
      return { ...row, dead, win, pp, ratio, state };
    });
}

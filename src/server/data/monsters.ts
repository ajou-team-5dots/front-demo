import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { AUX2_MIN_HIT_ENC, MIN_DEATHS, MIN_ENC_MAIN } from '@/server/config/criteria';
import type {
  BossSkill,
  H2Patch,
  Heavy,
  MonsterDetail,
  MonsterMainRow,
  Period,
} from '@/types/monsters';

import { GAME_EVENTS_TAG } from './game-events';
import { getMonsterCounts, getMonsterReadiness } from './monster-counts';
import { getMonsterPatches } from './monster-patches';
import type { HeavyResults, PentagonResult } from './monster-precomputed';
import { getBossState, getMonsterSkills } from './monster-skills';
import { PRECOMPUTED_TAG, readPrecomputed } from './precomputed';

/** Monster ids are lowercase snake case. Anything else is unknown before any lookup. */
const isMonsterId = (id: string): boolean => /^[a-z0-9_]{1,60}$/.test(id);

/** Cheap counts come from base tables; models come from batch JSON. H2 ignores `period`. */
export async function getMonsterList(
  heavy: Heavy,
  period: Period = 'current',
): Promise<MonsterMainRow[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG, PRECOMPUTED_TAG);
  cacheLife('hours');

  const counts = await getMonsterCounts(heavy, period);
  const [risk, pentagon] = await Promise.all([
    readPrecomputed<HeavyResults<number | null>>('expected-risk'),
    readPrecomputed<HeavyResults<PentagonResult>>('pentagon'),
  ]);
  // Each query already covers every monster. Bound the DB fan-out on the small EC2 instance.
  const patches = await getMonsterPatches(heavy);
  const skills = await getMonsterSkills(heavy, period);
  return counts
    .filter((row) => row.enc >= MIN_ENC_MAIN)
    .map((row) => {
      // Patches are chronological; the last monster patch supplies the current H2 state.
      const patch = patches.filter((item) => item.monster === row.monster).at(-1)?.patch;
      const bossSkills = skills.filter((skill) => skill.monster === row.monster);
      const h3State = row.role === 'boss' ? getBossState(bossSkills, 5) : null;
      const h3State2 = row.role === 'boss' ? getBossState(bossSkills, 2) : null;
      return {
        monster: row.monster,
        role: row.role,
        grade: row.grade,
        mainStage: row.mainStage,
        enc: row.enc,
        deaths: row.deaths,
        danger: row.danger,
        deathsPer100: row.deathsPer100,
        signal: row.signal,
        riskVsExpected: risk[heavy][row.monster] ?? null,
        pentagonRank: pentagon[heavy][row.monster]?.rank ?? null,
        h2State: patch?.state ?? null,
        h2IntentCheck: patch?.intentCheck ?? false,
        h3State,
        h3State2,
        h3CriterionEffect:
          row.role === 'boss' && (h3State === 'signal') !== (h3State2 === 'signal'),
      };
    });
}

/** Both time windows in one response; no model fitting and no raw event reads. */
export async function getBossSkills(
  monster: string,
  heavy: Heavy,
  period: Period = 'current',
): Promise<BossSkill[]> {
  'use cache';

  if (!isMonsterId(monster)) return [];

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  return (await getMonsterSkills(heavy, period))
    .filter((row) => row.monster === monster)
    .map((row) => ({
      abilityId: row.abilityId,
      ability: row.ability,
      windows: row.windows,
      state: row.state,
      state2: row.state2,
      criterionEffect: row.criterionEffect,
    }));
}

/** H2 deliberately includes entities spawned before the patch. */
export async function getPatchRisk(monster: string, heavy: Heavy): Promise<H2Patch[]> {
  'use cache';

  if (!isMonsterId(monster)) return [];

  cacheTag(GAME_EVENTS_TAG, PRECOMPUTED_TAG);
  cacheLife('hours');

  return (await getMonsterPatches(heavy))
    .filter((row) => row.monster === monster)
    .map((row) => row.patch);
}

/** Detail shares have their numerator and denominator; unknown monsters return null. */
export async function getMonsterDetail(
  monster: string,
  heavy: Heavy,
  period: Period = 'current',
): Promise<MonsterDetail | null> {
  'use cache';

  if (!isMonsterId(monster)) return null;

  cacheTag(GAME_EVENTS_TAG, PRECOMPUTED_TAG);
  cacheLife('hours');

  const counts = (await getMonsterCounts(heavy, period)).find((row) => row.monster === monster);
  if (!counts) return null;
  const readiness = await getMonsterReadiness(monster, heavy, period);
  const patches = await getPatchRisk(monster, heavy);
  const skills = counts.role === 'boss' ? await getBossSkills(monster, heavy, period) : null;
  const [pentagon, risk] = await Promise.all([
    readPrecomputed<HeavyResults<PentagonResult>>('pentagon'),
    readPrecomputed<HeavyResults<number | null>>('expected-risk'),
  ]);
  return {
    monster,
    enc: counts.enc,
    deaths: counts.deaths,
    riskVsExpected: risk[heavy][monster] ?? null,
    pentagonRank: pentagon[heavy][monster]?.rank ?? null,
    pentagon: pentagon[heavy][monster]?.axes ?? [],
    H1_readiness: readiness,
    H2_patch: patches,
    H3_bossSkill: skills,
    aux1_unanswered: {
      unanswered: counts.unanswered,
      deaths: counts.deaths,
      unansweredShare: counts.deaths === 0 ? 0 : counts.unanswered / counts.deaths,
      sampleShort: counts.deaths < MIN_DEATHS,
    },
    aux2_bigHit: {
      hitEnc: counts.hitEnc,
      bigHit: counts.bigHit,
      bigHitShare: counts.hitEnc === 0 ? 0 : counts.bigHit / counts.hitEnc,
      sampleShort: counts.hitEnc < AUX2_MIN_HIT_ENC,
    },
  };
}

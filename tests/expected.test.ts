// Expected values from 계산 명세 6장 (data 2026-10-12 ~ 10-22, high-activity accounts included).
// Integration tests: real ClickHouse base tables and real precomputed JSON, no data mocks.
// Encounter counts off by more than 1% usually mean the base tables use different rules.
//
// Run: pnpm test   (Node's built-in runner; Node 24 runs .ts files directly)
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { getDataRange, getFlow, getMonsterTrend, getPatches } from '@/server/data/board';
import { getMonsterSkills } from '@/server/data/monster-skills';
import {
  getBossSkills,
  getMonsterDetail,
  getMonsterList,
  getPatchRisk,
} from '@/server/data/monsters';
import { query } from '@/server/db/query';
import type { MonsterDetail, MonsterMainRow } from '@/types/monsters';

export const EXPECTED = {
  encounters: { all: 61_759, postPatchEntities: 59_113 },
  playerDeathsByMonsters: 698,
  accounts: { total: 68, heavy: 1 },
  smallZombie: {
    enc: 4_429,
    deaths: 40,
    danger: 38,
    h1: {
      lowLevel: { state: 'yes', dead: 0.78, win: 0.27 },
      noWeapon: { state: 'yes', dead: 0.57, win: 0.02 },
      woodenWeapon: { state: 'no', dead: 0.18, win: 0.15 },
      noArmor: { state: 'yes', dead: 0.75, win: 0.06 },
    },
  },
  elderrootBloom: {
    w5: {
      deathsWithAbility: 10,
      deathsTotal: 28,
      survEncWithAbility: 5,
      survEncTotal: 106,
      state: 'signal',
    },
    w2: {
      deathsWithAbility: 4,
      deathsTotal: 28,
      survEncWithAbility: 3,
      survEncTotal: 106,
      state: 'none',
    },
    criterionEffect: true,
  },
  h3Totals: {
    include: { w5: { abilities: 9, bosses: 7 }, w2: { abilities: 5, bosses: 5 } },
    // 6장 says "고활동 제외 시 4종·1종": bosses with a signal at 5 s / 2 s.
    exclude: { w5Bosses: 4, w2Bosses: 1 },
  },
  riftStalkerStrongH2: {
    before: { enc: 332, events: 15 },
    after: { enc: 4_616, events: 116 },
    sameCondition: { or: 19.21, lo: 8.29, hi: 44.54 },
    state: 'no_comparator',
    intentCheck: true,
  },
  h2StatesMainTable: {
    monsters: 36,
    sampleOk: 7,
    unchangedOk: 5,
    noComparator: 2,
    sampleShort: 29,
  },
  elderrootAux: { aux1: { unanswered: 0, deaths: 28 }, aux2: { bigHit: 21, hitEnc: 131 } },
} as const;

describe('계산 명세 6장 기대값', () => {
  let included: MonsterMainRow[];
  let excluded: MonsterMainRow[];
  let zombie: MonsterDetail | null;
  let elderroot: MonsterDetail | null;

  before(async () => {
    // Outside Next there is no shared cache; avoid duplicating concurrent queries on EC2.
    included = await getMonsterList('include');
    excluded = await getMonsterList('exclude');
    zombie = await getMonsterDetail('small_zombie', 'include');
    elderroot = await getMonsterDetail('elderroot_stage_1', 'include');
  });

  it('기대값 표가 명세와 같은 합을 가진다', () => {
    // Guards against typos in this file; runs now.
    const h2 = EXPECTED.h2StatesMainTable;
    assert.equal(h2.sampleOk + h2.sampleShort, h2.monsters);
    assert.equal(h2.unchangedOk + h2.noComparator, h2.sampleOk);
  });

  it('교전 전체 61,759 / 패치 후 개체 59,113', async () => {
    const [row] = await query<{ all: number; postPatchEntities: number }>(
      `SELECT toUInt32(count()) AS all,
        toUInt32(countIf(NOT pre_patch_entity)) AS postPatchEntities FROM encounters`,
    );
    assert.deepEqual(row, EXPECTED.encounters);
  });
  it('몬스터가 죽인 플레이어 사망(패치 후 개체) 698', async () => {
    const [row] = await query<{ deaths: number }>(
      'SELECT toUInt32(countIf(NOT pre_patch_entity)) AS deaths FROM player_deaths',
    );
    assert.equal(row.deaths, EXPECTED.playerDeathsByMonsters);
  });
  it('계정 68 / 고활동 계정 1', async () => {
    const [row] = await query<{ total: number; heavy: number }>(
      `SELECT toUInt32(uniqExact(player_seq)) AS total,
        toUInt32(uniqExactIf(player_seq, heavy_account)) AS heavy FROM encounters`,
    );
    assert.deepEqual(row, EXPECTED.accounts);
  });
  it('small_zombie 교전 4,429, 사망 40, 위험 38 (getMonsterList)', () => {
    const row = included.find((item) => item.monster === 'small_zombie');
    assert.ok(row);
    assert.equal(row.enc, EXPECTED.smallZombie.enc);
    assert.equal(row.deaths, EXPECTED.smallZombie.deaths);
    assert.equal(row.danger, EXPECTED.smallZombie.danger);
    assert.equal(row.deathsPer100, (40 / 4429) * 100);
    assert.ok(row.riskVsExpected !== null && Math.abs(row.riskVsExpected - 0.61) < 0.01);
  });
  it('small_zombie H1 4조건 상태와 비율 (getMonsterDetail)', () => {
    assert.ok(zombie);
    assert.deepEqual(
      zombie.H1_readiness.map((row) => row.condition),
      ['lowLevel', 'noWeapon', 'woodenWeapon', 'noArmor'],
    );
    zombie.H1_readiness.forEach((row) => {
      const expected = EXPECTED.smallZombie.h1[row.condition];
      assert.equal(row.state, expected.state, row.condition);
      // The spec publishes percentages rounded to whole percentage points.
      assert.ok(Math.abs(row.dead - expected.dead) <= 0.01, `${row.condition} dead`);
      assert.ok(Math.abs(row.win - expected.win) <= 0.01, `${row.condition} win`);
      assert.ok(row.deadTotal !== undefined && row.winN !== undefined && row.winTotal);
      assert.equal(row.dead, row.deadN / row.deadTotal);
      assert.equal(row.win, row.winN / row.winTotal);
    });
  });
  it('elderroot_stage_1 bloom 5초 10/28 대 5/106 signal, 2초 4/28 대 3/106 none (getBossSkills)', async () => {
    const bloom = (await getBossSkills('elderroot_stage_1', 'include')).find(
      (row) => row.ability === 'bloom',
    );
    assert.ok(bloom);
    [5, 2].forEach((window) => {
      const actual = window === 5 ? bloom.windows[5] : bloom.windows[2];
      const expected = window === 5 ? EXPECTED.elderrootBloom.w5 : EXPECTED.elderrootBloom.w2;
      assert.equal(actual.deathsWithAbility, expected.deathsWithAbility);
      assert.equal(actual.deathsTotal, expected.deathsTotal);
      assert.equal(actual.survEncWithAbility, expected.survEncWithAbility);
      assert.equal(actual.survEncTotal, expected.survEncTotal);
      assert.equal(actual.state, expected.state);
    });
    assert.equal(bloom.criterionEffect, EXPECTED.elderrootBloom.criterionEffect);
  });
  it('H3 전체: 5초 신호 기술 9개·보스 7종, 2초 5개·5종, 고활동 제외 4종·1종', async () => {
    const skills = await getMonsterSkills('include');
    const w5 = skills.filter((row) => row.state === 'signal');
    const w2 = skills.filter((row) => row.state2 === 'signal');
    assert.equal(w5.length, EXPECTED.h3Totals.include.w5.abilities);
    assert.equal(new Set(w5.map((row) => row.monster)).size, EXPECTED.h3Totals.include.w5.bosses);
    assert.equal(w2.length, EXPECTED.h3Totals.include.w2.abilities);
    assert.equal(new Set(w2.map((row) => row.monster)).size, EXPECTED.h3Totals.include.w2.bosses);
    assert.equal(included.filter((row) => row.h3State === 'signal').length, 7);
    assert.equal(included.filter((row) => row.h3State2 === 'signal').length, 5);
    assert.equal(
      excluded.filter((row) => row.h3State === 'signal').length,
      EXPECTED.h3Totals.exclude.w5Bosses,
    );
    assert.equal(
      excluded.filter((row) => row.h3State2 === 'signal').length,
      EXPECTED.h3Totals.exclude.w2Bosses,
    );
    assert.ok(skills.every((row) => row.ability.length > 0));
  });
  it('rift_stalker_strong H2 19.21배 (8.29~44.54), no_comparator, intentCheck (getPatchRisk)', async () => {
    const [patch] = await getPatchRisk('rift_stalker_strong', 'include');
    const expected = EXPECTED.riftStalkerStrongH2;
    assert.equal(patch.before.enc, expected.before.enc);
    assert.equal(patch.before.events, expected.before.events);
    assert.equal(patch.after.enc, expected.after.enc);
    assert.equal(patch.after.events, expected.after.events);
    assert.equal(patch.state, expected.state);
    assert.equal(patch.intentCheck, expected.intentCheck);
    assert.ok(patch.sameCondition);
    assert.ok(Math.abs(patch.sameCondition.or - expected.sameCondition.or) < 0.01);
    assert.ok(Math.abs(patch.sameCondition.lo - expected.sameCondition.lo) < 0.01);
    assert.ok(Math.abs(patch.sameCondition.hi - expected.sameCondition.hi) < 0.01);
    ['before', 'after'].forEach((period) => {
      const days = patch.daily.filter((row) => row.period === period);
      const totals = period === 'before' ? patch.before : patch.after;
      assert.equal(
        days.reduce((sum, row) => sum + row.enc, 0),
        totals.enc,
      );
      assert.equal(
        days.reduce((sum, row) => sum + row.events, 0),
        totals.events,
      );
    });
  });
  it('메인 표 36종 H2 상태: 충분 7(미변경 5, 비교군 확인 2), 부족 29', () => {
    const expected = EXPECTED.h2StatesMainTable;
    assert.equal(included.length, expected.monsters);
    assert.equal(
      included.filter((row) => row.h2State === 'sample_short').length,
      expected.sampleShort,
    );
    assert.equal(
      included.filter((row) => row.h2State === 'unchanged_ok').length,
      expected.unchangedOk,
    );
    assert.equal(
      included.filter((row) => row.h2State === 'no_comparator').length,
      expected.noComparator,
    );
    assert.equal(
      included.filter((row) => row.h2State !== 'sample_short').length,
      expected.sampleOk,
    );
  });
  it('elderroot_stage_1 보조 1 0/28, 보조 2 21/131 (getMonsterDetail)', () => {
    assert.ok(elderroot);
    assert.equal(elderroot.aux1_unanswered.unanswered, EXPECTED.elderrootAux.aux1.unanswered);
    assert.equal(elderroot.aux1_unanswered.deaths, EXPECTED.elderrootAux.aux1.deaths);
    assert.equal(elderroot.aux2_bigHit.bigHit, EXPECTED.elderrootAux.aux2.bigHit);
    assert.equal(elderroot.aux2_bigHit.hitEnc, EXPECTED.elderrootAux.aux2.hitEnc);
  });

  it('고활동 제외 bloom 5초 8/25 대 4/91', async () => {
    const bloom = (await getBossSkills('elderroot_stage_1', 'exclude')).find(
      (row) => row.ability === 'bloom',
    );
    assert.ok(bloom);
    assert.equal(bloom.windows[5].deathsWithAbility, 8);
    assert.equal(bloom.windows[5].deathsTotal, 25);
    assert.equal(bloom.windows[5].survEncWithAbility, 4);
    assert.equal(bloom.windows[5].survEncTotal, 91);
  });

  it('없는 몬스터는 상세 null, 기술·패치 빈 배열', async () => {
    const unknown = "unknown' OR 1 = 1 --";
    assert.equal(await getMonsterDetail(unknown, 'include'), null);
    assert.deepEqual(await getBossSkills(unknown, 'include'), []);
    assert.deepEqual(await getPatchRisk(unknown, 'include'), []);
  });

  it('기간 전체(period=all)는 패치 전 개체까지 기초 표 행 수와 같다', async () => {
    const monsters = ['small_zombie', 'rift_stalker_strong'];
    const all = await getMonsterList('include', 'all');
    const raw = await query<{ monster: string; enc: number; deaths: number }>(
      `SELECT e.monster_id AS monster, e.enc AS enc, d.deaths AS deaths
       FROM (SELECT monster_id, toUInt32(count()) AS enc FROM encounters
             WHERE monster_id IN {monsters:Array(String)} GROUP BY monster_id) AS e
       LEFT JOIN (SELECT monster_id, toUInt32(count()) AS deaths FROM player_deaths
             WHERE monster_id IN {monsters:Array(String)} GROUP BY monster_id) AS d
       USING (monster_id)`,
      { monsters },
    );
    raw.forEach((expected) => {
      const row = all.find((item) => item.monster === expected.monster);
      assert.ok(row, expected.monster);
      assert.equal(row.enc, expected.enc, `${expected.monster} enc`);
      assert.equal(row.deaths, expected.deaths, `${expected.monster} deaths`);
    });
    const current = included.find((row) => row.monster === 'rift_stalker_strong');
    const whole = all.find((row) => row.monster === 'rift_stalker_strong');
    assert.ok(current && whole && whole.enc > current.enc, '패치 전 개체가 더해져야 함');
  });

  it('흐름(getFlow, 전체 기간) 교전 합 + 레벨 미상 = 교전 전체 61,759', async () => {
    const flow = await getFlow('include', 'all');
    const enc = flow.rows.reduce((sum, row) => sum + row.enc, 0);
    assert.ok(flow.excluded);
    assert.equal(enc + flow.excluded.enc, EXPECTED.encounters.all);
    assert.deepEqual(
      flow.columns.map((column) => column.key),
      ['lv', 'wp', 'ar', 'grp'],
    );
  });

  it('일별 추이 합 = 전체 기간 교전·사망, 기간 매일 포함 (getMonsterTrend)', async () => {
    const [trend, range, patches] = await Promise.all([
      getMonsterTrend('small_zombie', 'include', {}),
      getDataRange(),
      getPatches(),
    ]);
    const all = (await getMonsterList('include', 'all')).find(
      (row) => row.monster === 'small_zombie',
    );
    assert.ok(all);
    assert.equal(
      trend.reduce((sum, day) => sum + day.enc, 0),
      all.enc,
    );
    assert.equal(
      trend.reduce((sum, day) => sum + day.deaths, 0),
      all.deaths,
    );
    assert.equal(trend[0].day, range.from);
    assert.equal(trend.at(-1)?.day, range.to);
    assert.ok(patches.length > 0 && patches.every((p, i) => i === 0 || patches[i - 1].ts <= p.ts));
    assert.deepEqual(await getMonsterTrend("x' OR 1 = 1", 'include', {}), []);
  });
});

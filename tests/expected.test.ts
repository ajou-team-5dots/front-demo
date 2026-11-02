// Expected values from 계산 명세 6장 (data 2026-10-12 ~ 10-22, high-activity accounts included).
// Every test is skipped until the matching function in src/server/data/monsters.ts exists.
// To turn one on: drop `skip`, call the function, compare. Encounter counts off by more than
// 1% usually mean the encounter split or damage attachment rules (2장) differ.
//
// Run: pnpm test   (Node's built-in runner; Node 24 runs .ts files directly)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const TODO = { skip: '함수 구현 전 (src/server/data/monsters.ts)' };

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
  it('기대값 표가 명세와 같은 합을 가진다', () => {
    // Guards against typos in this file; runs now.
    const h2 = EXPECTED.h2StatesMainTable;
    assert.equal(h2.sampleOk + h2.sampleShort, h2.monsters);
    assert.equal(h2.unchangedOk + h2.noComparator, h2.sampleOk);
  });

  it('교전 전체 61,759 / 패치 후 개체 59,113', TODO);
  it('몬스터가 죽인 플레이어 사망(패치 후 개체) 698', TODO);
  it('계정 68 / 고활동 계정 1', TODO);
  it('small_zombie 교전 4,429, 사망 40, 위험 38 (getMonsterList)', TODO);
  it('small_zombie H1 4조건 상태와 비율 (getMonsterDetail)', TODO);
  it(
    'elderroot_stage_1 bloom 5초 10/28 대 5/106 signal, 2초 4/28 대 3/106 none (getBossSkills)',
    TODO,
  );
  it('H3 전체: 5초 신호 기술 9개·보스 7종, 2초 5개·5종, 고활동 제외 4종·1종', TODO);
  it(
    'rift_stalker_strong H2 19.21배 (8.29~44.54), no_comparator, intentCheck (getPatchRisk)',
    TODO,
  );
  it('메인 표 36종 H2 상태: 충분 7(미변경 5, 비교군 확인 2), 부족 29', TODO);
  it('elderroot_stage_1 보조 1 0/28, 보조 2 21/131 (getMonsterDetail)', TODO);
});

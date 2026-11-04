// Dev-only fixture for /dev/preview-detail. Pentagon and same-condition values are copied from
// data/precomputed (11/2 batch); the rest is made up to look like the analysis output.
import type { DailyPoint, PatchInfo } from '@/types/board';
import type {
  BossSkill,
  H2Patch,
  H3Window,
  MonsterDetail,
  MonsterMainRow,
  MonsterRole,
} from '@/types/monsters';

const row = (
  monster: string,
  role: MonsterRole,
  grade: string,
  mainStage: number,
  enc: number,
  deaths: number,
  riskVsExpected: number | null,
): MonsterMainRow => ({
  monster,
  role,
  grade,
  mainStage,
  enc,
  deaths,
  danger: deaths,
  deathsPer100: (deaths / enc) * 100,
  riskVsExpected,
  signal: 'none',
  pentagonRank: null,
  h2State: null,
  h2IntentCheck: false,
  h3State: null,
  h3State2: null,
  h3CriterionEffect: false,
});

export const PREVIEW_ROWS: MonsterMainRow[] = [
  { ...row('small_zombie', 'mob', 'weak', 2, 4429, 40, 0.61), pentagonRank: 36 },
  row('melee_zombie', 'mob', 'medium', 1, 6120, 88, 1.12),
  row('ranged_zombie', 'mob', 'medium', 1, 3870, 51, 0.94),
  row('blink_imp', 'mob', 'medium', 2, 2210, 64, 1.46),
  row('rush_imp', 'mob', 'medium', 2, 1980, 37, 0.88),
  row('volatile_imp', 'mob', 'medium', 3, 1430, 59, 1.73),
  row('rift_stalker_strong', 'mob', 'strong', 3, 880, 71, 2.31),
  row('rift_stalker_weak', 'mob', 'weak', 3, 1650, 22, 0.57),
  row('cragling_strong', 'mob', 'strong', 2, 760, 33, 1.38),
  row('cragling_weak', 'mob', 'weak', 2, 2480, 19, 0.49),
  row('rootwalker_medium', 'mob', 'medium', 2, 1120, 26, 0.97),
  row('sporepod_strong', 'mob', 'strong', 3, 540, 30, null),
  row('iron_guardian_medium', 'midboss', 'medium', 3, 310, 28, 1.21),
  {
    ...row('elderroot_stage_1', 'boss', 'boss', 2, 612, 74, 4.74),
    pentagonRank: 21,
    h3State: 'signal',
    h3State2: 'signal',
    h3CriterionEffect: true,
  },
  row('abyss_colossus', 'boss', 'boss', 4, 288, 41, 2.08),
];

const ts = (iso: string) => Date.parse(iso);

export const PREVIEW_PATCHES: PatchInfo[] = [
  {
    id: '2026-10-14-monster',
    ts: ts('2026-10-14T14:40:00+09:00'),
    label: '10/14 몬스터 HP·피해 상향',
    changed: ['melee_zombie', 'ranged_zombie', 'blink_imp', 'rift_stalker_strong'],
  },
];

const days = [
  '2026-10-12',
  '2026-10-13',
  '2026-10-14',
  '2026-10-15',
  '2026-10-16',
  '2026-10-17',
  '2026-10-18',
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
];
const trend = (enc: number[], deaths: number[], near: number[]): DailyPoint[] =>
  days.map((day, i) => ({ day, enc: enc[i], deaths: deaths[i], danger: deaths[i] + near[i] }));

const pentagonMob = [
  { axis: 'race_med', value: 0.0522, peerMedian: 0.0749, z: -1.023 },
  { axis: 'hits_med', value: 2, peerMedian: 3, z: -2.25 },
  { axis: 'hpcost_mean', value: 0.0299, peerMedian: 0.0329, z: -0.156 },
  { axis: 'escape_rate', value: 0.0133, peerMedian: 0.0377, z: -0.955 },
  { axis: 'avoid_rate', value: 0.2659, peerMedian: 0.3808, z: -2.993 },
];

// avoid_rate is null for this boss in pentagon.json, as the batch leaves it.
const pentagonBoss = [
  { axis: 'race_med', value: 0.827, peerMedian: 1.826, z: -0.574 },
  { axis: 'hits_med', value: 71, peerMedian: 73.5, z: -0.024 },
  { axis: 'hpcost_mean', value: 0.6872, peerMedian: 0.7317, z: -0.041 },
  { axis: 'escape_rate', value: 0.1545, peerMedian: 0.129, z: 0.225 },
  { axis: 'avoid_rate', value: null, peerMedian: 0.0769, z: null },
];

const period = (enc: number, deaths: number, near: number, players: number) => ({
  enc,
  deaths,
  near,
  events: deaths + near,
  risk100: ((deaths + near) / enc) * 100,
  players,
});

const win = (
  dW: number,
  dT: number,
  sW: number,
  sT: number,
  state: H3Window['state'],
): H3Window => {
  const deathShare = dW / dT;
  const survShare = sW / sT;
  return {
    deathsWithAbility: dW,
    deathsTotal: dT,
    deathShare,
    survEncWithAbility: sW,
    survEncTotal: sT,
    survShare,
    diffPP: (deathShare - survShare) * 100,
    ratio: survShare === 0 ? null : deathShare / survShare,
    state,
  };
};

const skill = (ability: string, w5: H3Window, w2: H3Window): BossSkill => ({
  abilityId: `elderroot_stage_1_${ability}`,
  ability,
  windows: { 5: w5, 2: w2 },
  state: w5.state,
  state2: w2.state,
  criterionEffect: (w5.state === 'signal') !== (w2.state === 'signal'),
});

interface PreviewMonster {
  detail: MonsterDetail;
  patches: H2Patch[];
  trend: DailyPoint[];
}

export const PREVIEW_DETAIL: Record<string, PreviewMonster> = {
  small_zombie: {
    detail: {
      monster: 'small_zombie',
      enc: 4429,
      deaths: 40,
      riskVsExpected: 0.61,
      pentagonRank: 36,
      pentagon: pentagonMob,
      H1_readiness: [
        {
          condition: 'lowLevel',
          dead: 0.75,
          win: 0.06,
          pp: 69,
          ratio: 8.4,
          encN: 410,
          deadN: 30,
          otherEncN: 0,
          encDeadN: 30,
          otherDeadN: 0,
          state: 'yes',
        },
        {
          condition: 'noWeapon',
          dead: 0.35,
          win: 0.12,
          pp: 23,
          ratio: 2.9,
          encN: 690,
          deadN: 14,
          otherEncN: 0,
          encDeadN: 14,
          otherDeadN: 0,
          state: 'yes',
        },
        {
          condition: 'woodenWeapon',
          dead: 0.4,
          win: 0.33,
          pp: 7,
          ratio: 1.3,
          encN: 1480,
          deadN: 16,
          otherEncN: 0,
          encDeadN: 16,
          otherDeadN: 0,
          state: 'no',
        },
        {
          condition: 'noArmor',
          dead: 0.9,
          win: 0.71,
          pp: 19,
          ratio: 3.4,
          encN: 3150,
          deadN: 36,
          otherEncN: 0,
          encDeadN: 36,
          otherDeadN: 0,
          state: 'no',
        },
      ],
      H2_patch: [],
      aux1_unanswered: { unanswered: 12, deaths: 40, unansweredShare: 0.3, sampleShort: false },
      aux2_bigHit: { hitEnc: 2860, bigHit: 143, bigHitShare: 0.05, sampleShort: false },
      H3_bossSkill: null,
    },
    patches: [
      {
        patchId: '2026-10-14-monster',
        before: period(1180, 12, 41, 210),
        after: period(3249, 28, 109, 402),
        daily: [],
        sampleOk: true,
        sameCondition: { or: 1.077, lo: 0.515, hi: 2.25 },
        netOfComparator: null,
        state: 'unchanged_ok',
        intentCheck: false,
        groupReference: null,
      },
    ],
    trend: trend(
      [402, 431, 347, 388, 412, 376, 451, 433, 398, 409, 382],
      [4, 5, 3, 3, 4, 2, 3, 4, 5, 3, 4],
      [14, 15, 12, 11, 13, 12, 14, 12, 15, 11, 13],
    ),
  },
  elderroot_stage_1: {
    detail: {
      monster: 'elderroot_stage_1',
      enc: 612,
      deaths: 74,
      riskVsExpected: 4.74,
      pentagonRank: 21,
      pentagon: pentagonBoss,
      H1_readiness: [
        {
          condition: 'lowLevel',
          dead: 0.42,
          win: 0.08,
          pp: 34,
          ratio: 4.1,
          encN: 96,
          deadN: 31,
          otherEncN: 0,
          encDeadN: 31,
          otherDeadN: 0,
          state: 'yes',
        },
        {
          condition: 'noWeapon',
          dead: 0.04,
          win: 0.01,
          pp: 3,
          ratio: null,
          encN: 9,
          deadN: 3,
          otherEncN: 0,
          encDeadN: 3,
          otherDeadN: 0,
          state: 'unk',
        },
        {
          condition: 'woodenWeapon',
          dead: 0.18,
          win: 0.11,
          pp: 7,
          ratio: 1.6,
          encN: 88,
          deadN: 13,
          otherEncN: 0,
          encDeadN: 13,
          otherDeadN: 0,
          state: 'no',
        },
        {
          condition: 'noArmor',
          dead: 0.27,
          win: 0.09,
          pp: 18,
          ratio: 2.7,
          encN: 71,
          deadN: 20,
          otherEncN: 0,
          encDeadN: 20,
          otherDeadN: 0,
          state: 'no',
        },
      ],
      H2_patch: [],
      aux1_unanswered: { unanswered: 9, deaths: 74, unansweredShare: 9 / 74, sampleShort: false },
      aux2_bigHit: { hitEnc: 498, bigHit: 211, bigHitShare: 211 / 498, sampleShort: false },
      H3_bossSkill: [
        skill('bloom', win(27, 74, 21, 412, 'signal'), win(9, 74, 12, 412, 'none')),
        skill('quake', win(31, 74, 48, 412, 'signal'), win(22, 74, 19, 412, 'signal')),
        skill('root_grasp', win(18, 74, 77, 412, 'none'), win(10, 74, 40, 412, 'none')),
        skill('thorn_volley', win(14, 74, 66, 412, 'none'), win(6, 74, 31, 412, 'none')),
        skill('spore_call', win(3, 74, 8, 412, 'sample_short'), win(1, 74, 3, 412, 'sample_short')),
      ],
    },
    patches: [
      {
        patchId: '2026-10-14-monster',
        before: period(150, 21, 33, 61),
        after: period(462, 53, 71, 133),
        daily: [],
        sampleOk: true,
        sameCondition: { or: 0.625, lo: 0.203, hi: 1.918 },
        netOfComparator: null,
        state: 'unchanged_ok',
        intentCheck: false,
        groupReference: null,
      },
    ],
    trend: trend(
      [48, 55, 47, 61, 58, 52, 66, 59, 57, 54, 55],
      [7, 8, 6, 6, 5, 4, 6, 5, 4, 5, 4],
      [10, 12, 11, 8, 7, 6, 8, 7, 6, 7, 6],
    ),
  },
};

// DATA_SOURCE=fixture: the recorded results in data/fixtures give the same expected values as the
// database, with no DB or AWS variables, and an unrecorded query fails with a clear message.
// Runs without network access.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { getMonsterTrend } from '@/server/data/board';
import {
  getBossSkills,
  getMonsterDetail,
  getMonsterList,
  getPatchRisk,
} from '@/server/data/monsters';
import { isFixtureMissing } from '@/server/db/query';
import { getDataSource } from '@/server/env';

const CLEARED = [
  'CLICKHOUSE_URL',
  'CLICKHOUSE_USER',
  'CLICKHOUSE_PASSWORD',
  'CLICKHOUSE_DB',
  'QUERY_LAMBDA_NAME',
  'AWS_PROFILE',
  'AWS_ROLE_ARN',
];

describe('DATA_SOURCE=fixture (녹화 데이터)', () => {
  const saved = new Map<string, string | undefined>();

  before(() => {
    ['DATA_SOURCE', ...CLEARED].forEach((name) => saved.set(name, process.env[name]));
    process.env.DATA_SOURCE = 'fixture';
    CLEARED.forEach((name) => delete process.env[name]);
  });

  after(() => {
    saved.forEach((value, name) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });

  it('small_zombie 사망 40 / 교전 4,429 / 기대 대비 0.61배', async () => {
    const row = (await getMonsterList('include')).find((r) => r.monster === 'small_zombie');
    assert.ok(row);
    assert.equal(row.deaths, 40);
    assert.equal(row.enc, 4_429);
    assert.ok(row.riskVsExpected !== null && Math.abs(row.riskVsExpected - 0.61) < 0.01);
  });

  it('elderroot_stage_1 사망 28 / 교전 163 / 4.74배, bloom 5초 10/28 대 5/106, 2초 4/28 대 3/106', async () => {
    const detail = await getMonsterDetail('elderroot_stage_1', 'include');
    assert.ok(detail);
    assert.equal(detail.deaths, 28);
    assert.equal(detail.enc, 163);
    assert.ok(detail.riskVsExpected !== null && Math.abs(detail.riskVsExpected - 4.74) < 0.01);
    const bloom = (await getBossSkills('elderroot_stage_1', 'include')).find(
      (r) => r.ability === 'bloom',
    );
    assert.ok(bloom);
    const { 5: w5, 2: w2 } = bloom.windows;
    assert.deepEqual(
      [w5.deathsWithAbility, w5.deathsTotal, w5.survEncWithAbility, w5.survEncTotal, w5.state],
      [10, 28, 5, 106, 'signal'],
    );
    assert.deepEqual(
      [w2.deathsWithAbility, w2.deathsTotal, w2.survEncWithAbility, w2.survEncTotal, w2.state],
      [4, 28, 3, 106, 'none'],
    );
  });

  it('rift_stalker_strong H2 같은 조건 19.21배 (8.29~44.54)', async () => {
    const [patch] = await getPatchRisk('rift_stalker_strong', 'include');
    assert.ok(patch?.sameCondition);
    assert.ok(Math.abs(patch.sameCondition.or - 19.21) < 0.01);
    assert.ok(Math.abs(patch.sameCondition.lo - 8.29) < 0.01);
    assert.ok(Math.abs(patch.sameCondition.hi - 44.54) < 0.01);
  });

  it('녹화 안 된 조회는 어떤 조회인지 알려 주며 실패한다', async () => {
    await assert.rejects(
      getMonsterTrend('small_zombie', 'include', { lv: '70+', wp: '철', ar: '6부위' }),
      (error: unknown) => {
        assert.ok(isFixtureMissing(error));
        assert.match((error as Error).message, /pnpm fixtures:record/);
        assert.match((error as Error).message, /"lv":"70\+"/);
        return true;
      },
    );
  });

  it('Vercel 운영에서는 fixture를 거부한다', () => {
    process.env.VERCEL_ENV = 'production';
    try {
      assert.throws(() => getDataSource(), /운영 배포에서 쓸 수 없습니다/);
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });
});

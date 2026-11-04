// Records every query the board screens run into data/fixtures/queries, for DATA_SOURCE=fixture.
// Run from a setup that reaches ClickHouse (DATA_SOURCE=direct or lambda in .env.local):
//   pnpm fixtures:record
// Re-record whenever the data (a new load or batch) or any data function's SQL changes.
//
// Scope: every listed monster × period (current/all) × high-activity (include/exclude), overview
// and detail, with no flow pick; plus the flow pick of the design examples (EXAMPLE_PICK). Picks
// combine (5 × 5 × 4 per monster), so recording them all took minutes and ~29 MB for screens a
// designer never needs. An unrecorded pick shows an empty state in fixture mode.
// Stage, group and search filters narrow rows in the page (filterRows) and keep working.
//
/* eslint-disable no-console -- a CLI script reports progress on the terminal */
// Only aggregates are written. A column that could hold an identifier or chat text, a wallet-like
// value, or a raw game_events query fails the run before anything is written.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getDataRange, getFlow, getMonsterTrend, getPatches } from '@/server/data/board';
import { getMonsterDetail, getMonsterList, getPatchRisk } from '@/server/data/monsters';
import { FIXTURE_DIR, fixtureKey, normalizeSql } from '@/server/db/fixture';
import { setQueryRecorder } from '@/server/db/query';
import { getDataSource } from '@/server/env';
import type { FlowPick } from '@/types/board';
import type { Heavy, Period } from '@/types/monsters';

// Column names (lower-cased, underscores removed) that hold an identifier or chat text. Counts
// such as `players` are fine; the ids themselves must never leave the query.
const FORBIDDEN_COLUMNS = new Set([
  'playerid',
  'playerseq',
  'actorid',
  'sourceactor',
  'targetaddress',
  'address',
  'wallet',
  'walletaddress',
  'sessionid',
  'chat',
  'msg',
  'message',
  'payload',
]);
const WALLET_VALUE = /0x[0-9a-f]{40}/i;

interface Recorded {
  sql: string;
  params: Record<string, unknown>;
  rows: unknown[];
}

const recorded = new Map<string, Recorded>();
const problems: string[] = [];

const checkRows = (sql: string, rows: unknown[]) => {
  const where = normalizeSql(sql).slice(0, 80);
  if (/\bgame_events\b/.test(sql)) problems.push(`원시 game_events 조회: ${where}`);
  rows.forEach((row) => {
    if (typeof row !== 'object' || row === null) return;
    Object.entries(row).forEach(([col, value]) => {
      if (FORBIDDEN_COLUMNS.has(col.toLowerCase().replaceAll('_', ''))) {
        problems.push(`식별 정보일 수 있는 컬럼 ${col}: ${where}`);
      }
      if (WALLET_VALUE.test(JSON.stringify(value))) {
        problems.push(`지갑 주소 형태의 값 (컬럼 ${col}): ${where}`);
      }
    });
  });
};

// The DB is shared with the live board: every distinct query runs once, one at a time.
let dbQueries = 0;
setQueryRecorder({
  lookup: (sql, params) => recorded.get(fixtureKey(sql, params))?.rows,
  save: (sql, params, rows) => {
    dbQueries += 1;
    checkRows(sql, rows);
    recorded.set(fixtureKey(sql, params), { sql: normalizeSql(sql), params, rows });
  },
});

const HEAVY: Heavy[] = ['include', 'exclude'];
const PERIOD: Period[] = ['current', 'all'];

// Design examples (design-tokens/AGENTS.md 0장 예시 화면 목록): these details also get one pick.
const EXAMPLE_MONSTERS = [
  'elderroot_stage_1',
  'small_zombie',
  'rift_stalker_strong',
  'iron_guardian_weak',
];
const EXAMPLE_PICK: FlowPick = { lv: '1~19' };

/**
 * The same calls src/app/page.tsx makes for one screen (overview, plus the detail when given),
 * one after another so a query shared by two calls reaches the DB once.
 */
const visit = async (heavy: Heavy, period: Period, monster?: string, pick: FlowPick = {}) => {
  const calls: (() => Promise<unknown>)[] = [
    () => getMonsterList(heavy, period),
    () => getFlow(heavy, period),
  ];
  if (monster) {
    calls.push(
      () => getMonsterDetail(monster, heavy, period),
      () => getPatchRisk(monster, heavy),
      () => getPatches(),
      () => getMonsterTrend(monster, heavy, pick),
      () => getDataRange(),
    );
  }
  await calls.reduce((prev, call) => prev.then(call), Promise.resolve<unknown>(undefined));
};

async function main() {
  const source = getDataSource();
  if (source === 'fixture') {
    throw new Error(
      '녹화는 DB에 접속되는 설정에서 합니다. .env.local의 DATA_SOURCE를 direct나 lambda로.',
    );
  }
  console.log(`녹화 시작 (DATA_SOURCE=${source})`);
  const scopes = HEAVY.flatMap((heavy) => PERIOD.map((period) => ({ heavy, period })));
  const screens: { heavy: Heavy; period: Period; monster?: string; pick?: FlowPick }[] = [];
  // Overviews first, sequentially: the monster list of each scope comes from them.
  await scopes.reduce(
    (prev, { heavy, period }) => prev.then(() => visit(heavy, period)),
    Promise.resolve(),
  );
  const lists = await Promise.all(scopes.map((s) => getMonsterList(s.heavy, s.period)));
  const monsters = [...new Set(lists.flat().map((r) => r.monster))].sort();
  scopes.forEach(({ heavy, period }) => {
    monsters.forEach((monster) => screens.push({ heavy, period, monster }));
    EXAMPLE_MONSTERS.forEach((monster) =>
      screens.push({ heavy, period, monster, pick: EXAMPLE_PICK }),
    );
  });
  // One screen at a time; with `lookup`, each distinct query reaches the DB once.
  await screens.reduce(
    (prev, sc) => prev.then(() => visit(sc.heavy, sc.period, sc.monster, sc.pick)),
    Promise.resolve(),
  );
  console.log(`몬스터 ${monsters.length}종 × 기간 2 × 고활동 2, DB 조회 ${dbQueries}번`);

  if (problems.length > 0) {
    throw new Error(`녹화 중단, 아무것도 쓰지 않았습니다:\n${[...new Set(problems)].join('\n')}`);
  }

  await mkdir(FIXTURE_DIR, { recursive: true });
  const old = (await readdir(FIXTURE_DIR)).filter((f) => f.endsWith('.json'));
  await Promise.all(old.map((f) => rm(path.join(FIXTURE_DIR, f))));
  await Promise.all(
    [...recorded].map(([key, r]) =>
      writeFile(path.join(FIXTURE_DIR, `${key}.json`), `${JSON.stringify(r)}\n`),
    ),
  );
  console.log(`조회 ${recorded.size}개 저장: ${path.relative(process.cwd(), FIXTURE_DIR)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

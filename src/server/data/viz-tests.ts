import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { csvParse } from 'd3';
import { cacheLife } from 'next/cache';

import type { ReactionMixRow, Transition, TransitionShare } from '@/types/viz';

// Copied from information-design-5dots data/export/flourish (Flourish visualization tests).
const DATA_DIR = path.join(process.cwd(), 'data', 'flourish');

async function readCsv(fileName: string) {
  const text = await readFile(path.join(DATA_DIR, fileName), 'utf8');
  return csvParse(text);
}

const num = (value: string | undefined) => Number(value ?? 0);

/** First action within 30 minutes after a run, per blueprint (runs >= 15), shares sum to 1. */
export async function getBlueprintReactionMix(): Promise<ReactionMixRow[]> {
  'use cache';

  cacheLife('hours');

  const rows = await readCsv('t1_reactions.csv');
  const series = rows.columns.slice(1);
  return rows.map((row) => {
    const head = row[rows.columns[0]] ?? '';
    const id = /#(\d+)/.exec(head)?.[1] ?? '';
    const n = Number(/n=(\d+)/.exec(head)?.[1] ?? 0);
    return {
      slug: `bp-${id}`,
      label: `#${id}`,
      n,
      segments: series.map((key) => ({ key, share: num(row[key]) / 100 })),
    };
  });
}

/** Top 30 transitions between different actions (Sankey input). */
export async function getTopTransitions(): Promise<TransitionShare[]> {
  'use cache';

  cacheLife('hours');

  const rows = await readCsv('t3_sankey.csv');
  return rows.map((row) => ({
    src: row['이전 행동'] ?? '',
    dst: (row['다음 행동'] ?? '').replace(/^→\s*/, ''),
    n: num(row['전이 수']),
    share: num(row['비율(%)']) / 100,
  }));
}

/** Full transition matrix including repeats; share is per source row. */
export async function getTransitionMatrix(): Promise<TransitionShare[]> {
  'use cache';

  cacheLife('hours');

  const rows = await readCsv('t3_matrix.csv');
  return rows.map((row) => ({
    src: row['이전 행동'] ?? '',
    dst: row['다음 행동'] ?? '',
    n: num(row['전이 수']),
    share: num(row['비율(%)']) / 100,
  }));
}

/** Transitions with consecutive repeats collapsed (Chord input). */
export async function getCollapsedFlows(): Promise<Transition[]> {
  'use cache';

  cacheLife('hours');

  const rows = await readCsv('t3_flows.csv');
  return rows.map((row) => ({
    src: row['이전 행동'] ?? '',
    dst: row['다음 행동'] ?? '',
    n: num(row['전이 수']),
  }));
}

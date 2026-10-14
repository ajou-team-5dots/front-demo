import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { cacheLife } from 'next/cache';

import type {
  AddedVoxel,
  BaseVoxel,
  BlockInfo,
  BlueprintDetail,
  BlueprintEditsMeta,
  BlueprintSummary,
} from '@/types/blueprint-edits';

// Copied from information-design-5dots data/export/blueprint_edits (scripts/export_blueprint_edits.py).
// Ops accounts are already excluded there; the files carry no player IDs, chat or wallet addresses.
const DATA_DIR = path.join(process.cwd(), 'data', 'blueprint-edits');

interface RawSummary {
  id: number;
  runs: number;
  players: number;
  worlds: number;
  topPlayerRunShare: number;
  voxels: number;
  size: { x: number; y: number; z: number };
  runsWithEdit: number;
  editRunRate: number;
  digCount: number;
  addCount: number;
  selfEditShare: number | null;
}

interface RawIndex {
  editWindowMinutes: number;
  minRuns: number;
  blueprints: RawSummary[];
}

interface RawBlueprint {
  voxels: BaseVoxel[];
  added: AddedVoxel[];
}

interface RawBlock {
  name: string;
  layer: string;
  texture: string;
}

async function readJson<T>(fileName: string): Promise<T> {
  const text = await readFile(path.join(DATA_DIR, fileName), 'utf8');
  return JSON.parse(text) as T;
}

const toSummary = (raw: RawSummary): BlueprintSummary => ({
  id: raw.id,
  runs: raw.runs,
  players: raw.players,
  worlds: raw.worlds,
  topPlayerRunShare: raw.topPlayerRunShare,
  voxelCount: raw.voxels,
  size: raw.size,
  runsWithEdit: raw.runsWithEdit,
  editRunRate: raw.editRunRate,
  digCount: raw.digCount,
  addCount: raw.addCount,
  selfEditShare: raw.selfEditShare,
});

export async function getBlueprintEditsMeta(): Promise<BlueprintEditsMeta> {
  'use cache';

  cacheLife('hours');

  const { editWindowMinutes, minRuns } = await readJson<RawIndex>('index.json');
  return { editWindowMinutes, minRuns };
}

export async function getBlueprintSummaries(): Promise<BlueprintSummary[]> {
  'use cache';

  cacheLife('hours');

  const index = await readJson<RawIndex>('index.json');
  return index.blueprints.map(toSummary);
}

export async function getBlueprintDetail(id: number): Promise<BlueprintDetail | null> {
  'use cache';

  cacheLife('hours');

  const summaries = await getBlueprintSummaries();
  const summary = summaries.find((item) => item.id === id);
  if (!summary) {
    return null;
  }

  const [blueprint, allBlocks] = await Promise.all([
    readJson<RawBlueprint>(`bp-${id}.json`),
    readJson<Record<string, RawBlock>>('blocks.json'),
  ]);

  const usedIds = new Set([...blueprint.voxels, ...blueprint.added].map((voxel) => voxel[3]));
  const blocks: BlockInfo[] = [...usedIds].map((blockId) => {
    const block = allBlocks[String(blockId)];
    return {
      id: blockId,
      name: block?.name ?? `Block ${blockId}`,
      texture: block?.texture ?? '',
      transparent: block ? block.layer.startsWith('transparent') : false,
    };
  });

  return { summary, voxels: blueprint.voxels, added: blueprint.added, blocks };
}

import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { cacheLife } from 'next/cache';

import type {
  EntityGroup,
  Metric,
  Reaction,
  TopicData,
  TopicEntity,
  TopicId,
  Transition,
} from '@/types/topics';

// Copied from information-design-5dots data/export/topics (scripts/export_topics.py).
// Ops accounts are excluded there and error strings are already scrubbed of transaction hashes.
const DATA_DIR = path.join(process.cwd(), 'data', 'topics');

export const TOPIC_IDS: readonly TopicId[] = ['postrun', 'friction', 'loop'];

interface RawEntity {
  id: string;
  name: string;
  n: number;
  players: number;
  primary: { label: string; value: number; text?: string };
  secondary?: Metric[];
  reactions: Reaction[];
  small: boolean;
  flags?: string[];
  blueprintId?: number;
}

interface RawTopic {
  opsExcluded: boolean;
  players: number;
  smallN: number;
  entityGroups: { id: string; label: string; entities: RawEntity[] }[];
  overallReactions?: Reaction[];
  edges?: Transition[];
}

async function readTopic(id: TopicId): Promise<RawTopic> {
  const text = await readFile(path.join(DATA_DIR, `${id}.json`), 'utf8');
  return JSON.parse(text) as RawTopic;
}

const ASCII_SLUG = /^[a-z0-9_-]+$/i;

const toEntity = (raw: RawEntity, groupId: string, index: number): TopicEntity => ({
  id: raw.id,
  // Action ids in the loop topic are Korean words; keep URLs plain ASCII.
  slug: ASCII_SLUG.test(raw.id) ? raw.id : `${groupId}-${index + 1}`,
  name: raw.name,
  n: raw.n,
  players: raw.players,
  primary: raw.primary,
  secondary: raw.secondary ?? [],
  reactions: raw.reactions,
  small: raw.small,
  flags: raw.flags ?? [],
  blueprintId: raw.blueprintId,
});

export async function getTopicData(id: TopicId): Promise<TopicData> {
  'use cache';

  cacheLife('hours');

  const raw = await readTopic(id);
  // Server feature failures (realm/blueprint create) are connection errors the game retries,
  // so they are not building friction. Only the block group is shown for this topic.
  const shownGroups =
    id === 'friction' ? raw.entityGroups.filter((group) => group.id !== 'feature') : raw.entityGroups;
  const entityGroups: EntityGroup[] = shownGroups.map((group) => ({
    id: group.id,
    label: group.label,
    entities: group.entities.map((entity, index) => toEntity(entity, group.id, index)),
  }));
  const overallReactions = raw.overallReactions ?? [];
  const edges = raw.edges ?? [];

  return {
    id,
    opsExcluded: raw.opsExcluded,
    players: raw.players,
    smallN: raw.smallN,
    entityGroups,
    overallReactions,
    edges,
  };
}

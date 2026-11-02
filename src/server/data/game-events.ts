import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { queryRows } from '@/server/db/clickhouse';
import type {
  BossAbilityRow,
  DeathCauseRow,
  GameDataRange,
  MonsterDailyRow,
  MonsterOverviewRow,
} from '@/types/game-events';

// Direct reads of the raw default.game_events table on EC2 (read-only account).
// - actorId and payload.sourceActor contain raw wallet addresses: use them only inside
//   WHERE/joins, never in a SELECT list.
// - Ops accounts (anyone who sent a chat starting with '/su') are excluded everywhere.
// - payload is a JSON column; paths are read with toString(payload.a.b).
// - count() is UInt64, which JSON returns as a string, so counts are wrapped in toUInt32().

export const GAME_EVENTS_TAG = 'game-events';

/** CTEs shared by every query: ops accounts, and monster entityId → monsterId. */
const BASE_CTES = `
  ops AS (
    SELECT DISTINCT actorId FROM game_events
    WHERE eventType = 'chat_send' AND startsWith(toString(payload.msg), '/su')
  ),
  events AS (
    -- Explicit columns: eventTime is a computed column that SELECT * does not return.
    SELECT eventType, eventTime, actorId, payload FROM game_events
    WHERE actorId IS NULL OR actorId NOT IN (SELECT actorId FROM ops)
  ),
  monsters AS (
    SELECT toString(payload.entityId) AS entityId, any(toString(payload.monsterId)) AS monsterId
    FROM events WHERE eventType = 'monster_spawned'
    GROUP BY entityId
  )`;

/** Rows and time span in the table, so readers know which period the numbers cover. */
export async function getGameDataRange(): Promise<GameDataRange> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  const [row] = await queryRows<GameDataRange>(
    `SELECT toUInt32(count()) AS rows, toString(min(eventTime)) AS from, toString(max(eventTime)) AS to
     FROM game_events`,
  );
  return row ?? { rows: 0, from: '', to: '' };
}

/** Per monster: spawns, removals, kills by players and player deaths it caused. */
export async function getMonsterOverview(): Promise<MonsterOverviewRow[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  return queryRows<MonsterOverviewRow>(
    `WITH ${BASE_CTES},
     player_deaths AS (
       SELECT m.monsterId AS monsterId, toUInt32(count()) AS n
       FROM events AS e
       INNER JOIN monsters AS m ON m.entityId = toString(e.payload.sourceActor)
       WHERE e.eventType = 'character_died' AND toString(e.payload.kind) = 'player'
       GROUP BY m.monsterId
     ),
     per_monster AS (
       SELECT toString(payload.monsterId) AS monsterId,
              toUInt32(countIf(eventType = 'monster_spawned')) AS spawns,
              toUInt32(countIf(eventType = 'monster_removed' AND toString(payload.reason) = 'death')) AS removedByDeath,
              toUInt32(countIf(eventType = 'monster_removed' AND toString(payload.reason) != 'death')) AS removedOther,
              toUInt32(countIf(eventType = 'character_died' AND toString(payload.kind) = 'monster')) AS kills
       FROM events
       WHERE eventType IN ('monster_spawned', 'monster_removed', 'character_died')
         AND toString(payload.monsterId) != ''
       GROUP BY monsterId
     )
     SELECT p.monsterId AS monsterId, p.spawns AS spawns, p.removedByDeath AS removedByDeath,
            p.removedOther AS removedOther, p.kills AS kills,
            toUInt32(ifNull(d.n, 0)) AS playerDeaths
     FROM per_monster AS p
     LEFT JOIN player_deaths AS d ON d.monsterId = p.monsterId
     ORDER BY playerDeaths DESC, spawns DESC`,
  );
}

/** Daily spawns, kills and player deaths for one monster (UTC days). */
export async function getMonsterDaily(id: string): Promise<MonsterDailyRow[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  return queryRows<MonsterDailyRow>(
    `WITH ${BASE_CTES},
     own AS (
       SELECT toDate(eventTime) AS d,
              countIf(eventType = 'monster_spawned') AS spawns,
              countIf(eventType = 'character_died' AND toString(payload.kind) = 'monster') AS kills
       FROM events
       WHERE eventType IN ('monster_spawned', 'character_died')
         AND toString(payload.monsterId) = {id:String}
       GROUP BY d
     ),
     deaths AS (
       SELECT toDate(e.eventTime) AS d, count() AS playerDeaths
       FROM events AS e
       INNER JOIN monsters AS m ON m.entityId = toString(e.payload.sourceActor)
       WHERE e.eventType = 'character_died' AND toString(e.payload.kind) = 'player'
         AND m.monsterId = {id:String}
       GROUP BY d
     )
     -- Inner column is d, not day: reusing the output alias inside the CTEs confuses scoping.
     SELECT toString(d) AS day, toUInt32(sum(spawns)) AS spawns, toUInt32(sum(kills)) AS kills,
            toUInt32(sum(playerDeaths)) AS playerDeaths
     FROM (
       SELECT d, spawns, kills, 0 AS playerDeaths FROM own
       UNION ALL
       SELECT d, 0, 0, playerDeaths FROM deaths
     )
     GROUP BY d
     ORDER BY d`,
    { id },
  );
}

/** Per ability of one monster: how often it acted and entered execute/recover phases. */
export async function getBossAbilities(id: string): Promise<BossAbilityRow[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  return queryRows<BossAbilityRow>(
    `WITH ${BASE_CTES},
     actions AS (
       SELECT toString(payload.abilityId) AS abilityId, count() AS n
       FROM events
       WHERE eventType = 'monster_action' AND toString(payload.monsterId) = {id:String}
       GROUP BY abilityId
     ),
     phases AS (
       SELECT toString(e.payload.abilityId) AS abilityId,
              countIf(toString(e.payload.phase) = 'execute') AS execute,
              countIf(toString(e.payload.phase) = 'recover') AS recover
       FROM events AS e
       INNER JOIN monsters AS m ON m.entityId = toString(e.payload.entityId)
       WHERE e.eventType = 'monster_ability_phase_changed' AND m.monsterId = {id:String}
       GROUP BY abilityId
     )
     SELECT abilityId, toUInt32(sum(a)) AS actions, toUInt32(sum(x)) AS executePhases,
            toUInt32(sum(r)) AS recoverPhases
     FROM (
       SELECT abilityId, n AS a, 0 AS x, 0 AS r FROM actions
       UNION ALL
       SELECT abilityId, 0, execute, recover FROM phases
     )
     WHERE abilityId != ''
     GROUP BY abilityId
     ORDER BY actions DESC, executePhases DESC`,
    { id },
  );
}

/** Player deaths by the monster that caused them and by cause (fall, lava, … have no monster). */
export async function getDeathsByMonster(): Promise<DeathCauseRow[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  return queryRows<DeathCauseRow>(
    `WITH ${BASE_CTES}
     SELECT nullIf(m.monsterId, '') AS monsterId,
            toString(e.payload.cause) AS cause,
            toUInt32(count()) AS deaths
     FROM events AS e
     LEFT JOIN monsters AS m ON m.entityId = toString(e.payload.sourceActor)
     WHERE e.eventType = 'character_died' AND toString(e.payload.kind) = 'player'
     GROUP BY monsterId, cause
     ORDER BY deaths DESC`,
  );
}

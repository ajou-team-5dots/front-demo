// Return shapes of src/server/data/game-events.ts: direct reads of the raw default.game_events
// table on EC2. Numbers only, never an account id (actorId / sourceActor hold wallet addresses).

export interface GameDataRange {
  rows: number;
  /** UTC, 'YYYY-MM-DD hh:mm:ss.mmm' */
  from: string;
  to: string;
}

export interface MonsterOverviewRow {
  monsterId: string;
  spawns: number;
  /** monster_removed with reason 'death' */
  removedByDeath: number;
  removedOther: number;
  /** character_died of kind 'monster' (players killing this monster) */
  kills: number;
  /** character_died of kind 'player' whose attacker was this monster */
  playerDeaths: number;
}

export interface MonsterDailyRow {
  /** UTC date */
  day: string;
  spawns: number;
  kills: number;
  playerDeaths: number;
}

export interface BossAbilityRow {
  abilityId: string;
  /** monster_action events */
  actions: number;
  /** monster_ability_phase_changed events by phase */
  executePhases: number;
  recoverPhases: number;
}

export interface DeathCauseRow {
  /** null when the death was not caused by a monster (fall, lava, another player) */
  monsterId: string | null;
  cause: string;
  deaths: number;
}

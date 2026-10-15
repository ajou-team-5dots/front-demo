export type InsightId = 'draft' | 'prepare' | 'manual';

/** How far the log signal backs one reading of the behavior. */
export type Verdict = 'support' | 'partial' | 'against' | 'unknown';

export interface Quantiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface CellCount {
  inside: number;
  bottom: number;
  below: number;
  side: number;
  above: number;
}

export interface BlueprintRuns {
  bid: number;
  runs: number;
  players: number;
  /** Share of runs by the one player who ran it most. */
  topShare: number;
  edited: number;
  place: number;
  placeNewBlock: number;
  digOwn: number;
  digOther: number;
  placeLoc: CellCount;
  digLoc: CellCount;
}

export interface DraftData {
  runs: number;
  players: number;
  edited: number;
  firstRun: { n: number; edited: number };
  repeatRun: { n: number; edited: number };
  skipped: { withN: number; withEdited: number; withoutN: number; withoutEdited: number };
  place: number;
  placeNewBlock: number;
  digOwn: number;
  digOther: number;
  placeLoc: CellCount;
  digLoc: CellCount;
  undoRuns: number;
  firstEditMin: Quantiles;
  editsPerEditedRun: Quantiles;
  blueprints: BlueprintRuns[];
}

export interface AfterCancel {
  n: number;
  dig: number;
  place: number;
  moveMedian: number | null;
}

export interface LearningRow {
  player: string;
  n: number;
  first10: number;
  last10: number;
}

export interface PrepareData {
  episodes: number;
  players: number;
  outcomes: Record<'build' | 'cancel' | 'reprep_same' | 'reprep_other' | 'none', number>;
  cancelReasons: Record<string, number>;
  dtBuild: Quantiles;
  dtCancel: Quantiles;
  dtDist: { label: string; build: number; cancel: number }[];
  pickToPrepare: Quantiles;
  pickN: number;
  movedOver3: number;
  digDuring: number;
  placeDuring: number;
  afterCancel: Record<'prep_same' | 'prep_other' | 'none', AfterCancel>;
  learning: LearningRow[];
  ops: { players: number; prep: number; build: number; cancel: number };
  detailModalOpens: number;
}

export interface CancelReason {
  n: number;
  held: Quantiles;
  heldBins: { label: string; n: number }[];
  next: Partial<Record<NextCell, number>>;
  chargeRatio: Quantiles;
}

export type NextCell = 'same' | 'adjacent' | 'near' | 'far' | 'none';

/** Mining cancels of one block type (blocks with 100+ cancels). */
export interface BlockCancel {
  /** Matches the friction topic entity id, e.g. 'block-87'. */
  id: string;
  cancels: number;
  targetChange: number;
  mouseUp: number;
  tcNext: Record<NextCell, number>;
  muNext: Record<NextCell, number>;
}

export interface PlaceContext {
  free: number;
  bpworld: number;
  nearbp: number;
  postrun: number;
}

export interface ManualData {
  cancels: number;
  players: number;
  byReason: Record<'target_change' | 'mouse_up', CancelReason>;
  placeContext: PlaceContext;
  digContext: PlaceContext;
  placeContextPlayers: (PlaceContext & { player: string; total: number })[];
  blocks: BlockCancel[];
  manualPerMin: Quantiles;
  manualDays: number;
  bigBpPerSec: Quantiles;
  bigBpRuns: number;
}

export interface InsightMetaData {
  rows: number;
  players: number;
  opsExcluded: number;
  editWindowMin: number;
  marginCells: number;
}

export interface BuildingInsights {
  meta: InsightMetaData;
  draft: DraftData;
  prepare: PrepareData;
  manual: ManualData;
}

export interface Hypothesis {
  id: string;
  title: string;
  /** What the log should show if this reading is right. */
  ifTrue: string;
  /** What the log actually shows, with n. */
  evidence: string;
  verdict: Verdict;
}

export interface InsightSummary {
  id: InsightId;
  code: string;
  /** The behavior that was observed, as a question. */
  question: string;
  /** One-line answer after weighing the readings. */
  finding: string;
  headline: { value: string; label: string };
  hypotheses: Hypothesis[];
}

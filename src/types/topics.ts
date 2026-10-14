export type TopicId = 'postrun' | 'friction' | 'loop';

export interface Reaction {
  label: string;
  n: number;
  share: number;
}

export interface Metric {
  label: string;
  /** null when there was nothing to measure (e.g. no cancels for a block). */
  value: number | null;
}

export interface TopicEntity {
  id: string;
  /** URL-safe id for /topics/[topic]/[entity]. */
  slug: string;
  name: string;
  n: number;
  players: number;
  primary: { label: string; value: number; text?: string };
  secondary: Metric[];
  reactions: Reaction[];
  /** n below the topic's smallN: read as a case, not a pattern. */
  small: boolean;
  flags: string[];
  /** Set for postrun entities that have a 3D blueprint. */
  blueprintId?: number;
}

export interface EntityGroup {
  id: string;
  label: string;
  entities: TopicEntity[];
}

export interface Transition {
  src: string;
  dst: string;
  n: number;
}

export interface Kpi {
  label: string;
  value: string;
  hint: string;
}

/** A few 0..1 values that sum up the topic on the overview card. */
export interface Highlight {
  label: string;
  value: number;
}

export interface TopicData {
  id: TopicId;
  opsExcluded: boolean;
  players: number;
  smallN: number;
  entityGroups: EntityGroup[];
  overallReactions: Reaction[];
  edges: Transition[];
  kpis: Kpi[];
  highlightTitle: string;
  highlights: Highlight[];
}

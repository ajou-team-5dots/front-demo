export type { Transition } from './topics';

export interface TransitionShare {
  src: string;
  dst: string;
  n: number;
  /** Share of the source action's transitions. */
  share: number;
}

export interface ReactionMixRow {
  slug: string;
  label: string;
  n: number;
  segments: { key: string; share: number }[];
}

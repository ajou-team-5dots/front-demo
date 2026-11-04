// CONTRACT (owner: detail-charts agent). Each component renders its own <Panel> (shell/panel.tsx)
// and fills the box the detail column gives it (monster-detail.tsx: the board's main area, 1066
// wide at the 1440 frame, 1506 at 1920).
import type { DailyPoint, PatchInfo } from '@/types/board';
import type {
  Aux1Unanswered,
  Aux2BigHit,
  BossSkill,
  H1Readiness,
  H2Patch,
  PentagonAxis,
} from '@/types/monsters';

/** Figma 25:114, titled "전투 양상"; in the detail column 340×340, 360×340 from a 1200 main area. */
export interface PentagonProps {
  axes: PentagonAxis[];
  /** Overall rank, null when not computed. */
  rank: number | null;
  /** How many monsters the rank is out of. */
  rankOf: number;
  /** Extra caption line, e.g. that the precomputed values ignore the period filter. */
  note?: string;
}

/** Figma 38:463 "준비 조건별 비중" (rest of the row beside the pentagon, 340 tall) + "반격하지 못한 사망" + "한 번에 큰 피해를 받은 교전". */
export interface ReadinessPanelProps {
  h1: H1Readiness[];
  aux1: Aux1Unanswered;
  aux2: Aux2BigHit;
}

/**
 * Figma 38:448 "패치 전후 위험" with the patch select, `width` wide (the detail column, measured) ×
 * size.patch-panel, the same height for every monster and patch. Picked flow chips sit in
 * PickedFlowRow; `picked` only marks the trend as filtered.
 */
export interface PatchRiskProps {
  monster: string;
  patches: H2Patch[];
  patchList: PatchInfo[];
  trend: DailyPoint[];
  picked: boolean;
  /** Panel width in px; the daily trend takes what the ratio column leaves. */
  width?: number;
}

/** Row at the top of the detail listing the picked flow cells (only rendered when there are picks). */
export interface PickedFlowRowProps {
  chips: { label: string; removeHref: string }[];
}

/** Figma 38:642 "보스 기술 직후 사망" (bosses only), full detail width, as tall as its skill rows. */
export interface SkillWindowProps {
  skills: BossSkill[];
}

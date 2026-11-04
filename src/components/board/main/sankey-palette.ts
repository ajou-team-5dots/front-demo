import { COLOR } from '@/styles/tokens';
import type { FlowKey } from '@/types/board';

/**
 * One hue per node, per column, from the design tokens (color.sankey in
 * design-tokens/tokens.json). Order follows FLOW_COLUMNS values. Every column passes the dataviz
 * validate_palette checks (light, white surface): lightness band, chroma floor, CVD and
 * normal-vision separation. Amber is under 3:1 on white, so every node keeps its label.
 * A pick keeps these hues (no overlay).
 */
const COLUMN_HUES: Record<FlowKey, readonly string[]> = COLOR.sankey;

/** Fill of the node at position `index` of its column's value order. Values outside the fixed
 * order (e.g. an unknown level) get a quiet neutral. */
export const nodeHue = (key: FlowKey, index: number): string =>
  (index >= 0 ? COLUMN_HUES[key][index] : undefined) ?? COLOR.sankey.neutral;

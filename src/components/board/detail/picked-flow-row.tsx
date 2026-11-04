import { FlowChips } from '../shell/chip';
import type { PickedFlowRowProps } from './contracts';

// Top of the detail column, full width: the flow cells picked in the overview. They filter only
// the daily trend in "패치 전후 위험"; every other chart stays on all encounters.
export function PickedFlowRow({ chips }: PickedFlowRowProps) {
  if (chips.length === 0) return null;
  return (
    <div className="board-enter flex min-h-[42px] shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-panel bg-panel px-4 py-[7px]">
      <span className="text-(length:--font-size-label) leading-[14px] font-semibold text-ink">
        선택한 흐름:
      </span>
      <FlowChips chips={chips} />
      <span className="text-(length:--font-size-caption) leading-[13px] font-semibold text-gray-1">
        패치 전후 위험의 일별 추이에만 적용 · 다른 차트는 전체 교전 기준
      </span>
    </div>
  );
}

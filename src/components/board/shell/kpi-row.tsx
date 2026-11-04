import { cn } from '@/lib/utils';

interface Kpi {
  label: string;
  /** The number only ("4,429", "4.74"), or a word when there is no number ("사망 0건"). */
  value: string;
  /** Unit drawn small and gray after the number ("건", "배"). */
  unit?: string;
  /** Full meaning for the hover title, e.g. "기대 대비 위험 (던전 단계 반영)". */
  title?: string;
}

interface KpiRowProps {
  /** Up to three, in equal columns. */
  items: Kpi[];
  className?: string;
}

// A white box (size.kpi-box, radius 10, no border) at the right end of the detail's title row:
// three equal columns of label (12 SemiBold gray-1) over value (32 Bold ink, tabular) with its
// unit (16 gray-1) on the number's baseline. Both lines are trimmed to cap height and baseline
// (text-box), so centring the group leaves equal space above the label and below the digits.
// The values fade in when they change.
export function KpiRow({ items, className }: KpiRowProps) {
  return (
    <dl
      className={cn(
        'board-enter grid h-(--size-kpi-box-h) w-(--size-kpi-box-w) shrink-0 grid-cols-3 content-center gap-4 rounded-panel bg-panel px-4 tabular-nums',
        className,
      )}
    >
      {items.slice(0, 3).map((k) => (
        <div key={k.label} className="flex min-w-0 flex-col whitespace-nowrap" title={k.title}>
          <dt className="text-(length:--font-size-label) leading-[14px] font-semibold text-gray-1 [text-box:trim-both_cap_alphabetic]">
            {k.label}
          </dt>
          <dd className="mt-2 text-(length:--font-size-kpi) leading-9 font-bold text-ink [text-box:trim-both_cap_alphabetic]">
            <span key={k.value} className="board-swap inline-block">
              {k.value}
            </span>
            {k.unit ? (
              <span className="ml-0.5 text-(length:--font-size-kpi-unit) font-semibold text-gray-1">
                {k.unit}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

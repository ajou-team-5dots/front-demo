'use client';

import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EntityPickerProps {
  groups: { id: string; label: string; options: { slug: string; name: string }[] }[];
  selectedSlug: string;
  basePath: string;
}

/** Jump straight to any entity without scrolling to the ranking table. */
export function EntityPicker({ groups, selectedSlug, basePath }: EntityPickerProps) {
  const router = useRouter();
  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label="대상 선택"
        value={selectedSlug}
        onChange={(event) => router.push(`${basePath}/${event.target.value}`, { scroll: false })}
        className="h-11 min-w-56 appearance-none rounded-full border bg-card pr-10 pl-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {groups.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-muted-foreground" />
    </div>
  );
}

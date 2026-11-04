'use client';

import { useState } from 'react';

import { FocusScatter } from '@/components/board/main/focus-scatter';
import { Panel } from '@/components/board/shell/panel';
import type { MonsterMainRow, MonsterRole } from '@/types/monsters';

interface PreviewScatterProps {
  rows: MonsterMainRow[];
  width: number;
}

const ROLES: (MonsterRole | 'all')[] = ['all', 'mob', 'midboss', 'boss'];

// Dev-only harness: the focus scatter at one width, with a role toggle to watch marks glide.
export function PreviewScatter({ rows, width }: PreviewScatterProps) {
  const [hover, setHover] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [role, setRole] = useState<MonsterRole | 'all'>('all');
  const shown = role === 'all' ? rows : rows.filter((r) => r.role === role);
  return (
    <div className="flex flex-col gap-3 p-6">
      <div className="flex gap-2 text-(length:--font-size-label)">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            data-role={r}
            className="rounded-control border border-gray-2 px-2 py-1"
            aria-pressed={role === r}
            onClick={() => setRole(r)}
          >
            {r}
          </button>
        ))}
        <span data-testid="state">{`hover=${hover ?? '-'} current=${current ?? '-'}`}</span>
      </div>
      <div style={{ width: width + 32 }}>
        <Panel title="사망 수 × 기대 대비 위험" className="h-[678px]">
          <div className="absolute inset-x-4 top-[59px] h-[597px]" data-testid="slot">
            <FocusScatter
              rows={shown}
              width={width}
              hover={hover}
              current={current}
              onHover={setHover}
              onOpen={(m) => setCurrent((c) => (c === m ? null : m))}
              onPrefetch={() => {}}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

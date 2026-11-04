'use client';

import { useRef } from 'react';

import { SIZE } from '@/styles/tokens';

import { useMeasuredHeight, useMeasuredWidth } from '../shell/main-width';
import type { PatchRiskProps } from './contracts';
import { PatchRisk } from './patch-risk';

// PatchRisk at the width of the detail column it sits in (the main area, less a scrollbar if
// the detail scrolls), measured. The first render always uses the 1440-frame width like the
// server did: the detail streams in and hydrates after the board has measured, so reading the
// board's width here would not match the server HTML. It is the detail's last panel: at least
// size.patch-panel tall, and it takes the height the board has left down to the viewport bottom
// (flex-1), measured, so the trend inside grows with it.
export function PatchRiskFit(props: Omit<PatchRiskProps, 'width' | 'height'>) {
  const { monster } = props;
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useMeasuredWidth(ref);
  const height = useMeasuredHeight(ref, SIZE.patchPanel, monster);
  return (
    // The panel is laid out absolutely inside this box, so its drawn height never feeds back
    // into the box's own size (the box can shrink again when the window does).
    <div ref={ref} className="relative min-h-(--size-patch-panel) w-full flex-1 overflow-clip">
      <div className="absolute inset-0">
        <PatchRisk {...props} width={width} height={Math.max(SIZE.patchPanel, height)} />
      </div>
    </div>
  );
}

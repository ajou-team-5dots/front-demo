'use client';

import { useRef } from 'react';

import { useMeasuredWidth } from '../shell/main-width';
import type { PatchRiskProps } from './contracts';
import { PatchRisk } from './patch-risk';

// PatchRisk at the width of the detail column it sits in (the main area, less a scrollbar if
// the detail scrolls), measured. The first render always uses the 1440-frame width like the
// server did: the detail streams in and hydrates after the board has measured, so reading the
// board's width here would not match the server HTML.
export function PatchRiskFit(props: Omit<PatchRiskProps, 'width'>) {
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useMeasuredWidth(ref);
  return (
    <div ref={ref} className="w-full">
      <PatchRisk {...props} width={width} />
    </div>
  );
}

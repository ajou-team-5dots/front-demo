// Keyframes used only by the detail charts. React 19 hoists this <style> into <head> once (by
// href), so every chart can render it. Every animation uses `backwards` fill: if it never runs
// the mark just shows its final state, and the global reduced-motion rule makes it instant.
// Each first-show class is used together with `board-first`, so it plays on the first screen of
// a visit only (html[data-board-seen] in globals.css turns it off afterwards). board-swap is the
// exception: a value keyed by its text fades in each time it changes (another monster opened).
// Tailwind drops @theme variables nothing references from a utility, so the motion tokens can be
// missing at runtime; each use carries the token's value as a fallback.
export const EASE = 'var(--ease-board)';
export const BASE = 'var(--duration-base, 200ms)';
export const SLOW = 'var(--duration-slow)';

const CSS = `
@keyframes board-unfold { from { transform: scale(0); opacity: 0; } }
@keyframes board-draw { from { stroke-dashoffset: 1; } }
@keyframes board-fade { from { opacity: 0; } }
@keyframes board-from-left { from { left: 0; } }
@keyframes board-from-left-w { from { left: 0; width: 0; } }
@keyframes board-grow-w { from { width: 0; } }
@keyframes board-swap { from { opacity: 0.4; } }
.board-unfold { animation: board-unfold ${SLOW} ${EASE} 80ms backwards; }
.board-draw { stroke-dasharray: 1; animation: board-draw 520ms ${EASE} 80ms backwards; }
.board-fade { animation: board-fade ${BASE} ${EASE} 400ms backwards; }
.board-slide { animation: board-from-left ${SLOW} ${EASE} 80ms backwards; }
.board-slide-w { animation: board-from-left-w ${SLOW} ${EASE} 80ms backwards; }
.board-grow { animation: board-grow-w ${SLOW} ${EASE} 120ms backwards; }
.board-swap { animation: board-swap ${BASE} ${EASE} backwards; }
`;

export function DetailMotion() {
  return (
    <style href="board-detail-motion" precedence="medium">
      {CSS}
    </style>
  );
}

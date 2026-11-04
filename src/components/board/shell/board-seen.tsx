'use client';

import { useEffect } from 'react';

// Marks the visit as seen once the first screen has finished its entry motion
// (see html[data-board-seen] in globals.css).
export function BoardSeen() {
  useEffect(() => {
    const t = setTimeout(() => {
      document.documentElement.dataset.boardSeen = '1';
    }, 900);
    return () => clearTimeout(t);
  }, []);
  return null;
}

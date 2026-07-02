import { useRef } from "react";

/**
 * Horizontal swipe detection for touch + mouse. Returns handlers to spread on
 * an element. Fires onSwipeLeft / onSwipeRight when a mostly-horizontal drag
 * exceeds the threshold. Ignores vertical drags (so page scroll still works).
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 45,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const begin = (x: number, y: number) => {
    start.current = { x, y };
  };
  const end = (x: number, y: number) => {
    if (!start.current) return;
    const dx = x - start.current.x;
    const dy = y - start.current.y;
    start.current = null;
    // must be mostly horizontal and past the threshold
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  return {
    onTouchStart: (e: React.TouchEvent) => begin(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd: (e: React.TouchEvent) =>
      end(e.changedTouches[0].clientX, e.changedTouches[0].clientY),
    onMouseDown: (e: React.MouseEvent) => begin(e.clientX, e.clientY),
    onMouseUp: (e: React.MouseEvent) => end(e.clientX, e.clientY),
  };
}

import { useEffect, useRef } from "react";

/**
 * Horizontal swipe detection for touch. Swipe left → onSwipeLeft, right →
 * onSwipeRight. Vertical drags are ignored so the page still scrolls.
 *
 * Attaches a NON-PASSIVE native touchmove listener (React's synthetic
 * onTouchMove is passive, so preventDefault there is a no-op). Once a gesture
 * is clearly horizontal we preventDefault to stop the browser's edge back/
 * forward navigation. Returns a ref to attach to the swipeable element.
 */
export function useSwipe<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 45,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const ref = useRef<T | null>(null);
  // keep latest callbacks without re-binding listeners
  const cbs = useRef({ onSwipeLeft, onSwipeRight, threshold });
  cbs.current = { onSwipeLeft, onSwipeRight, threshold };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let horizontal = false;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      tracking = true;
      horizontal = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        horizontal = true;
      }
      // block browser edge-swipe navigation + horizontal page pan for this drag
      if (horizontal && e.cancelable) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const { threshold: th, onSwipeLeft: l, onSwipeRight: r } = cbs.current;
      if (Math.abs(dx) < th || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx > 0) r?.();
      else l?.();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  return ref;
}

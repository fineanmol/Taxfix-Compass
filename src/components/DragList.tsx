import { useRef, useState } from "react";

/**
 * Minimal pointer-based reorderable list (works with touch + mouse, no lib).
 * You render each item; a drag starts from the handle (data-draghandle).
 * On drop, onReorder is called with the new id order.
 */
export function DragList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, dragging: boolean) => React.ReactNode;
}) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // the live list: use local `order` while dragging, else props
  const ids = order ?? items.map((i) => i.id);
  const byId = new Map(items.map((i) => [i.id, i]));

  function itemCenters(): { id: string; y: number }[] {
    const el = containerRef.current;
    if (!el) return [];
    return [...el.querySelectorAll<HTMLElement>("[data-dragitem]")].map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.dataset.dragitem!, y: r.top + r.height / 2 };
    });
  }

  function startDrag(id: string, startY: number) {
    setDraggingId(id);
    setOrder(ids.slice());
    let curY = startY;

    const move = (clientY: number) => {
      curY = clientY;
      const centers = itemCenters();
      const overIdx = centers.findIndex((c) => clientY < c.y);
      const targetIdx = overIdx === -1 ? centers.length - 1 : overIdx;
      setOrder((prev) => {
        const arr = (prev ?? ids).slice();
        const from = arr.indexOf(id);
        if (from === -1 || from === targetIdx) return arr;
        arr.splice(from, 1);
        arr.splice(targetIdx, 0, id);
        return arr;
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      move(e.touches[0].clientY);
    };
    const onMouseMove = (e: MouseEvent) => move(e.clientY);
    const end = () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchend", end);
      window.removeEventListener("mouseup", end);
      setDraggingId(null);
      setOrder((final) => {
        if (final) onReorder(final);
        return null; // fall back to props (now updated via live query)
      });
      void curY;
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchend", end);
    window.addEventListener("mouseup", end);
  }

  return (
    <div ref={containerRef}>
      {ids.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        const dragging = draggingId === id;
        return (
          <div
            key={id}
            data-dragitem={id}
            className={dragging ? "relative z-10 scale-[1.02] opacity-90 transition" : "transition"}
            onTouchStart={(e) => {
              const t = e.target as HTMLElement;
              if (t.closest("[data-draghandle]")) startDrag(id, e.touches[0].clientY);
            }}
            onMouseDown={(e) => {
              const t = e.target as HTMLElement;
              if (t.closest("[data-draghandle]")) startDrag(id, e.clientY);
            }}
          >
            {renderItem(item, dragging)}
          </div>
        );
      })}
    </div>
  );
}

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * Row wrapper that reveals a red Delete action when swiped left (touch + mouse).
 * Distinguishes horizontal from vertical drags so vertical list scrolling still
 * works. Designed to sit inside a grouped card (no own rounding); the delete
 * button fills the revealed area on the right.
 */
export function SwipeToDelete({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dir = useRef<"none" | "h" | "v">("none");
  const REVEAL = 76;

  function begin(x: number, y: number) {
    start.current = { x, y };
    dir.current = "none";
  }
  function move(x: number, y: number) {
    if (!start.current) return;
    const mx = x - start.current.x;
    const my = y - start.current.y;
    if (dir.current === "none") {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      dir.current = Math.abs(mx) > Math.abs(my) ? "h" : "v";
    }
    if (dir.current !== "h") return; // let vertical scroll happen
    // allow dragging left (reveal) and a little right to re-close
    const base = dx <= -REVEAL ? -REVEAL : 0;
    setDx(Math.min(0, Math.max(-REVEAL, base + mx)));
  }
  function end() {
    if (dir.current === "h") setDx(dx < -REVEAL / 2 ? -REVEAL : 0);
    start.current = null;
    dir.current = "none";
  }

  return (
    <div className="relative overflow-hidden">
      {/* delete action behind the row */}
      <button
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-red-500 text-white"
        aria-label="Delete"
        tabIndex={dx <= -REVEAL / 2 ? 0 : -1}
      >
        <Trash2 size={20} />
      </button>
      {/* the row itself, translated on swipe */}
      <div
        className="relative bg-surface"
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? "none" : "transform 0.2s ease" }}
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={end}
        onMouseDown={(e) => begin(e.clientX, e.clientY)}
        onMouseMove={(e) => start.current && move(e.clientX, e.clientY)}
        onMouseUp={end}
        onMouseLeave={end}
      >
        {children}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * Wraps a row; dragging it left past a threshold reveals a delete button.
 * Works with touch and mouse. Minimal — good enough for a mobile PWA.
 */
export function SwipeToDelete({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const REVEAL = 80;

  function down(x: number) {
    startX.current = x;
  }
  function move(x: number) {
    if (startX.current === null) return;
    const delta = Math.min(0, Math.max(-REVEAL, x - startX.current));
    setDx(delta);
  }
  function up() {
    if (startX.current === null) return;
    setDx(dx < -REVEAL / 2 ? -REVEAL : 0);
    startX.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <button
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500 text-white"
        aria-label="Delete"
      >
        <Trash2 size={20} />
      </button>
      <div
        className="relative bg-surface transition-transform"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => down(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={up}
        onMouseDown={(e) => down(e.clientX)}
        onMouseMove={(e) => startX.current !== null && move(e.clientX)}
        onMouseUp={up}
        onMouseLeave={up}
      >
        {children}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, GripVertical } from 'lucide-react';
import AppIcon from './AppIcon';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 280;
const MARGIN = 8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function DraggableDialog({
  open,
  onClose,
  title,
  children,
  defaultWidth = 420,
  defaultHeight = 520,
}) {
  const panelRef = useRef(null);
  const dragState = useRef(null);
  const [pos, setPos] = useState(null);
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });

  useLayoutEffect(() => {
    if (!open || pos) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(defaultWidth, vw - MARGIN * 2);
    const height = Math.min(defaultHeight, vh - MARGIN * 2);
    setSize({ width, height });
    setPos({
      x: clamp(vw - width - 24, MARGIN, vw - width - MARGIN),
      y: clamp(96, MARGIN, vh - height - MARGIN),
    });
  }, [open, pos, defaultWidth, defaultHeight]);

  const handlePointerMove = useCallback((e) => {
    const state = dragState.current;
    if (!state) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (state.mode === 'move') {
      const x = clamp(e.clientX - state.offsetX, MARGIN, vw - state.width - MARGIN);
      const y = clamp(e.clientY - state.offsetY, MARGIN, vh - state.height - MARGIN);
      setPos({ x, y });
    } else if (state.mode === 'resize') {
      const width = clamp(
        state.startWidth + (e.clientX - state.startX),
        MIN_WIDTH,
        vw - state.posX - MARGIN
      );
      const height = clamp(
        state.startHeight + (e.clientY - state.startY),
        MIN_HEIGHT,
        vh - state.posY - MARGIN
      );
      setSize({ width, height });
    }
  }, []);

  const endDrag = useCallback(() => {
    dragState.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', endDrag);
    document.body.style.userSelect = '';
  }, [handlePointerMove]);

  useEffect(() => endDrag, [endDrag]);

  const beginMove = (e) => {
    if (e.button != null && e.button !== 0) return;
    dragState.current = {
      mode: 'move',
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
      width: size.width,
      height: size.height,
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
  };

  const beginResize = (e) => {
    e.stopPropagation();
    if (e.button != null && e.button !== 0) return;
    dragState.current = {
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      posX: pos.x,
      posY: pos.y,
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
  };

  if (!open || !pos) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={typeof title === 'string' ? title : 'フィードバック'}
      className="fixed z-[120] flex flex-col rounded-2xl border border-tsure-border bg-tsure-surface shadow-tsure-raised overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
    >
      <div
        onPointerDown={beginMove}
        className="flex items-center gap-2 px-3 py-2.5 border-b border-tsure-border bg-tsure-primary text-tsure-on-primary cursor-move touch-none select-none shrink-0"
      >
        <AppIcon icon={GripVertical} size="sm" className="opacity-70" />
        <h2 className="text-sm font-bold flex-1 truncate">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-w-8 min-h-8 flex items-center justify-center rounded-lg hover:bg-white/15"
          aria-label="閉じる"
        >
          <AppIcon icon={X} size="sm" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">{children}</div>

      <div
        onPointerDown={beginResize}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 10 10" className="w-full h-full text-tsure-muted/60">
          <path d="M9 1 L9 9 L1 9" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

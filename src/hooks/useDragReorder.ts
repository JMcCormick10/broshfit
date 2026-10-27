import { useRef, useState } from "react";

export type DropPosition = "after" | "before";

export type DropTarget = {
  itemId: string;
  position: DropPosition;
};

type DragState = {
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
  isDragging: boolean;
  targetId: string | null;
  targetPosition: DropPosition | null;
};

type UseDragReorderOptions<T> = {
  getId: (item: T) => string;
  getTargetId: (element: HTMLElement) => string | null;
  items: T[];
  onReorder: (reorderedItems: T[]) => Promise<void> | void;
  targetSelector: string;
};

export function useDragReorder<T>({
  getId,
  getTargetId,
  items,
  onReorder,
  targetSelector,
}: UseDragReorderOptions<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragState = useRef<DragState | null>(null);

  function stopDrag() {
    dragState.current = null;
    setDraggingId(null);
    setDropTarget(null);
  }

  function beginDrag(
    itemId: string,
    pointerId: number,
    startX: number,
    startY: number,
  ) {
    dragState.current = {
      itemId,
      pointerId,
      startX,
      startY,
      isDragging: false,
      targetId: null,
      targetPosition: null,
    };
  }

  function updateDragTarget(
    pointerId: number,
    clientX: number,
    clientY: number,
  ) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== pointerId) return;

    if (!drag.isDragging) {
      if (Math.hypot(clientX - drag.startX, clientY - drag.startY) < 6) return;
      drag.isDragging = true;
      setDraggingId(drag.itemId);
    }

    const targetElement = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>(targetSelector);
    const targetId = targetElement ? getTargetId(targetElement) : null;
    if (!targetElement || !targetId) {
      drag.targetId = null;
      drag.targetPosition = null;
      setDropTarget(null);
      return;
    }

    const bounds = targetElement.getBoundingClientRect();
    const position: DropPosition =
      clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    drag.targetId = targetId;
    drag.targetPosition = position;
    setDropTarget({ itemId: targetId, position });
  }

  async function finishDrag(pointerId: number) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== pointerId) return;
    stopDrag();

    if (
      !drag.isDragging ||
      !drag.targetId ||
      !drag.targetPosition ||
      drag.targetId === drag.itemId
    ) {
      return;
    }

    const source = items.find((item) => getId(item) === drag.itemId);
    const reordered = items.filter((item) => getId(item) !== drag.itemId);
    const targetIndex = reordered.findIndex(
      (item) => getId(item) === drag.targetId,
    );
    if (!source || targetIndex < 0) return;

    reordered.splice(
      targetIndex + (drag.targetPosition === "after" ? 1 : 0),
      0,
      source,
    );

    if (reordered.every((item, index) => getId(item) === getId(items[index]))) {
      return;
    }

    await onReorder(reordered);
  }

  function cancelDrag(pointerId: number) {
    if (dragState.current?.pointerId !== pointerId) return;
    stopDrag();
  }

  return {
    beginDrag,
    cancelDrag,
    draggingId,
    dropTarget,
    finishDrag,
    updateDragTarget,
  };
}

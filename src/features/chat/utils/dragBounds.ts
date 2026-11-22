export type DragOffset = { x: number; y: number };

const EDGE = 8;

/**
 * Độ dịch hợp lệ gần `wanted` nhất để khung nằm trọn trong màn `view` (chừa `EDGE` px).
 * `rect` là chỗ khung đang vẽ, đã cộng độ dịch `applied`. Khung to hơn màn thì giữ mép
 * trái/trên trong màn để thanh tiêu đề còn bấm kéo được.
 */
export function clampOffset(
  wanted: DragOffset,
  applied: DragOffset,
  rect: { left: number; top: number; width: number; height: number },
  view: { width: number; height: number },
): DragOffset {
  return {
    x: clampAxis(wanted.x, rect.left - applied.x, rect.width, view.width),
    y: clampAxis(wanted.y, rect.top - applied.y, rect.height, view.height),
  };
}

function clampAxis(value: number, base: number, size: number, view: number) {
  const min = EDGE - base;
  const max = view - EDGE - size - base;
  return Math.max(min, Math.min(value, max));
}

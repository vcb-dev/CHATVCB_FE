import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { clampOffset, type DragOffset } from '../utils/dragBounds';

/** Nhích quá chừng này mới tính là kéo; nhỏ hơn vẫn là bấm. */
const DRAG_SLOP = 4;

/** Bấm vào các phần tử này là dùng chúng, không bắt đầu kéo. */
const NO_DRAG = 'button, a, input, textarea, select, [role="button"], .ant-select';

const ORIGIN: DragOffset = { x: 0, y: 0 };

/**
 * Kéo một khung nổi (cửa sổ / thanh thu nhỏ cuộc gọi) đi khắp màn. Rải kết quả lên phần tử gốc:
 * `<div {...drag} className=…>`. Độ dịch ghi thẳng vào `style.transform` nên lúc kéo không vẽ lại
 * component (cửa sổ gọi đang phát video). Khung luôn nằm trong màn, kể cả khi màn hoặc khung
 * đổi cỡ. `enabled = false` (phóng toàn khung) thì khung về chỗ CSS đặt, bật lại thì về chỗ cũ.
 */
export function useDragMove(enabled: boolean) {
  const elRef = useRef<HTMLElement | null>(null);
  // Chỗ người dùng kéo tới; chỗ đang vẽ (`applied`) là nó sau khi ép vào màn.
  const wantedRef = useRef<DragOffset>(ORIGIN);
  const appliedRef = useRef<DragOffset>(ORIGIN);
  const draggedRef = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const apply = useCallback(() => {
    const el = elRef.current;
    if (!el) {
      return;
    }
    const next = enabledRef.current
      ? clampOffset(wantedRef.current, appliedRef.current, el.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        })
      : ORIGIN;
    appliedRef.current = next;
    el.style.transform = next.x || next.y ? `translate3d(${next.x}px, ${next.y}px, 0)` : '';
  }, []);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) {
        return;
      }
      elRef.current = el;
      // CallOverlay trả cùng một <div> gốc cho thanh thu nhỏ lẫn cửa sổ nên React dùng lại phần tử
      // DOM: bỏ độ dịch của khung trước rồi mới đo
      el.style.transform = '';
      appliedRef.current = ORIGIN;
      apply();
      // Khung đổi cỡ (đổi bố cục, chữ trạng thái dài ra) thì ép lại vào màn
      const observer = new ResizeObserver(apply);
      observer.observe(el);
      return () => {
        observer.disconnect();
        stopRef.current?.();
        if (elRef.current === el) {
          elRef.current = null;
        }
      };
    },
    [apply],
  );

  useLayoutEffect(apply, [enabled, apply]);

  useEffect(() => {
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [apply]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      draggedRef.current = false;
      const el = elRef.current;
      const target = event.target as Element;
      // `contains`: sự kiện React nổi lên qua portal (Popover chọn thiết bị) thì bỏ qua
      if (
        !el ||
        !enabledRef.current ||
        event.button !== 0 ||
        !el.contains(target) ||
        target.closest(NO_DRAG)
      ) {
        return;
      }
      stopRef.current?.();
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const start = appliedRef.current;
      wantedRef.current = start;

      const move = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== pointerId) {
          return;
        }
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_SLOP) {
          return;
        }
        draggedRef.current = true;
        el.dataset.dragging = '';
        wantedRef.current = { x: start.x + dx, y: start.y + dy };
        apply();
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        delete el.dataset.dragging;
        // Kéo quá mép thì giữ chỗ đang thấy, đừng để khung tự trượt khi màn to ra
        wantedRef.current = appliedRef.current;
        stopRef.current = null;
      };
      const end = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== pointerId) {
          return;
        }
        stop();
        // `click` tới ngay sau `pointerup`; qua lượt đó thì thôi chặn
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      stopRef.current = stop;
    },
    [apply],
  );

  // Thả chuột sau khi kéo thì không tính là bấm (thanh thu nhỏ bấm vào là mở rộng)
  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!draggedRef.current) {
      return;
    }
    draggedRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  }, []);

  // Ảnh avatar tự kéo kiểu HTML5 sẽ cắt ngang pointer events
  const onDragStart = useCallback((event: DragEvent<HTMLElement>) => event.preventDefault(), []);

  return useMemo(
    () => ({ ref, onPointerDown, onClickCapture, onDragStart }),
    [ref, onPointerDown, onClickCapture, onDragStart],
  );
}

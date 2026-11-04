import { Popover } from 'antd';
import { useEffect, type ReactNode } from 'react';

/** Khung nổi cạnh một vị trí trên lịch; antd tự lật sang phía còn chỗ. */
export function AnchoredPopover(props: {
  anchor: DOMRect;
  children: ReactNode;
  onClose: () => void;
  onClickOutside: () => void;
}) {
  const { anchor, onClose } = props;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Popover
      open
      trigger="click"
      placement="rightTop"
      arrow={false}
      content={props.children}
      onOpenChange={(open) => {
        if (!open) {
          props.onClickOutside();
        }
      }}
    >
      <span
        className="task-anchor"
        style={{ left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height }}
      />
    </Popover>
  );
}

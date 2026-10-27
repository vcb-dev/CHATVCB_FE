import { CloseOutlined } from '@ant-design/icons';
import type { PendingImage } from '@/types';

export function PendingPreviews({
  items,
  onRemove,
}: {
  items: PendingImage[];
  onRemove: (key: string) => void;
}) {
  if (!items.length) {
    return null;
  }
  return (
    <div className="pending-images">
      {items.map((item) => (
        <div key={item.key} className="pending-thumb">
          <img src={item.preview} alt="" />
          <button type="button" onClick={() => onRemove(item.key)} aria-label="Xóa ảnh">
            <CloseOutlined />
          </button>
        </div>
      ))}
    </div>
  );
}

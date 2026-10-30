import { findSticker } from '../utils/stickerPack';

export function StickerImage({ id }: { id: string }) {
  const item = findSticker(id);
  if (!item) {
    return <span className="sticker-card sticker-card-unknown">[Sticker]</span>;
  }
  return (
    <div className="sticker-card" style={{ background: item.bg }} title={item.text}>
      <span className="sticker-card-emoji">{item.emoji}</span>
      <span className="sticker-card-text">{item.text}</span>
    </div>
  );
}

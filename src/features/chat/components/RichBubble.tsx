import type { ChatMessage } from '@/types';
import { LocationCard } from './LocationCard';
import { StickerImage } from './StickerImage';

/** Vẽ tin có cấu trúc (`message.rich`). Loại chưa biết thì hiện câu dự phòng BE đã lưu ở `content`. */
export function RichBubble({ message }: { message: ChatMessage }) {
  const rich = message.rich;
  if (!rich) {
    return null;
  }
  if (rich.type === 'sticker') {
    return <StickerImage id={rich.id} />;
  }
  if (rich.type === 'location') {
    return <LocationCard lat={rich.lat} lng={rich.lng} label={rich.label} />;
  }
  return <p className="rich-fallback">{message.content}</p>;
}

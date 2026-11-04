import type { ChatMessage, Room } from '@/types';
import { ContactCard } from './ContactCard';
import { LocationCard } from './LocationCard';
import { MeetingCard } from './MeetingCard';
import { StickerImage } from './StickerImage';

/** Vẽ tin có cấu trúc (`message.rich`). Loại chưa biết thì hiện câu dự phòng BE đã lưu ở `content`. */
export function RichBubble(props: {
  message: ChatMessage;
  currentUserId: string;
  onViewProfile: (userId: string) => void;
  onOpenRoom: (room: Room) => void;
}) {
  const { message } = props;
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
  if (rich.type === 'card') {
    return (
      <ContactCard
        userId={rich.userId}
        currentUserId={props.currentUserId}
        onViewProfile={props.onViewProfile}
        onOpenRoom={props.onOpenRoom}
      />
    );
  }
  if (rich.type === 'meeting') {
    return <MeetingCard code={rich.code} title={rich.title} />;
  }
  return <p className="rich-fallback">{message.content}</p>;
}

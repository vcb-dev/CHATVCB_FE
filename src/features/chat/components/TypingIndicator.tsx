import type { RoomMember, TypingEvent } from '@/types';
import { typingText } from '../utils/typing';

export function TypingIndicator(props: {
  typing: TypingEvent[];
  roomId: string;
  members: RoomMember[];
}) {
  const names = props.typing
    .filter((item) => item.roomId === props.roomId)
    .map((item) => {
      const member = props.members.find((m) => m.id === item.userId);
      return member ? member.displayName || member.name : item.name;
    });

  return <div className="typing-line">{typingText(names)}</div>;
}

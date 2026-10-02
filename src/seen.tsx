import { Avatar, Popover } from 'antd';
import type { ReactNode } from 'react';
import { avatarColor, initials } from './theme';
import type { ChatMessage, RoomRead } from './types';

function messageIndex(messages: ChatMessage[], id: string | null) {
  if (!id) {
    return -1;
  }
  return messages.findIndex((item) => item.id === id);
}

export function viewersOf(
  message: ChatMessage,
  messages: ChatMessage[],
  reads: RoomRead[],
) {
  const msgIdx = messageIndex(messages, message.id);
  return reads.filter((read) => {
    if (read.userId === message.userId) {
      return false;
    }
    const readIdx = messageIndex(messages, read.lastReadMessageId);
    if (msgIdx >= 0 && readIdx >= 0) {
      return readIdx >= msgIdx;
    }
    if (read.lastReadAt) {
      return new Date(read.lastReadAt).getTime() >= new Date(message.createdAt).getTime();
    }
    return false;
  });
}

export function lastSeenOn(messageId: string, reads: RoomRead[], myId: string) {
  return reads.filter(
    (read) => read.userId !== myId && read.lastReadMessageId === messageId,
  );
}

function SeenNames({ viewers }: { viewers: RoomRead[] }) {
  if (!viewers.length) {
    return <div className="seen-names">Chưa có ai xem</div>;
  }
  return (
    <ul className="seen-names">
      {viewers.map((item) => (
        <li key={item.userId}>
          <Avatar size={22} style={{ background: avatarColor(item.name) }}>
            {initials(item.name)}
          </Avatar>
          <span>{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function SeenAvatars({ readers }: { readers: RoomRead[] }) {
  if (!readers.length) {
    return null;
  }
  const shown = readers.slice(0, 5);
  const extra = readers.length - shown.length;
  return (
    <div className="seen-row">
      {shown.map((item) => (
        <Avatar
          key={item.userId}
          size={16}
          style={{ background: avatarColor(item.name) }}
          title={item.name}
        >
          {initials(item.name)}
        </Avatar>
      ))}
      {extra > 0 ? <span className="seen-extra">+{extra}</span> : null}
    </div>
  );
}

export function SeenBubble({
  viewers,
  children,
}: {
  viewers: RoomRead[];
  children: ReactNode;
}) {
  return (
    <Popover
      trigger="click"
      title={`Đã xem${viewers.length ? ` · ${viewers.length}` : ''}`}
      content={<SeenNames viewers={viewers} />}
    >
      {children}
    </Popover>
  );
}

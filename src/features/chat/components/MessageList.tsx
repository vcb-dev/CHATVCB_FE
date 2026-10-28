import { RobotOutlined } from '@ant-design/icons';
import { Avatar, Checkbox } from 'antd';
import { Fragment, type RefObject } from 'react';
import type { ChatMessage, Room, RoomRead } from '@/types';
import { isSelectable } from '../hooks/useMessageSelection';
import { mentionsUser } from '../utils/mentions';
import { deliveryOf, lastSeenOn, viewersOf } from '../utils/seen';
import { MessageRow } from './MessageRow';
import { SystemNotice } from './SystemNotice';
import { UnreadDivider } from './UnreadDivider';

function sameAuthor(a: ChatMessage, b: ChatMessage) {
  return a.role === b.role && a.userId === b.userId && a.authorName === b.authorName;
}

export function MessageList(props: {
  listRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  unreadFromId: string | null;
  reads: RoomRead[];
  userId: string;
  myHandle: string;
  loadingOlder: boolean;
  pending: boolean;
  canSaveToCloud?: boolean;
  canPin?: boolean;
  canManage?: boolean;
  everyoneTag?: boolean;
  showDelivery?: boolean;
  selecting?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (message: ChatMessage) => void;
  onLoadOlder: () => Promise<void>;
  onMarkRead: () => void;
  onViewProfile: (userId: string) => void;
  onOpenRoom: (room: Room) => void;
  onAction: (key: string, message: ChatMessage) => Promise<void>;
  onReact: (message: ChatMessage, emoji: string) => Promise<void>;
  onJump: (id: string, createdAt?: string) => Promise<void>;
  onMessageUpdated?: (m: ChatMessage) => void;
  onOpenNote?: (noteId: string) => void;
}) {
  const { messages, reads, userId, myHandle } = props;
  return (
    <div
      className="messages"
      ref={props.listRef}
      onScroll={(e) => {
        if (e.currentTarget.scrollTop < 40) {
          void props.onLoadOlder();
        }
      }}
    >
      {props.loadingOlder ? (
        <div className="messages-loading">Đang tải tin cũ…</div>
      ) : null}
      {messages.map((message, index) => {
        const divider = message.id === props.unreadFromId ? <UnreadDivider /> : null;
        if (message.role === 'system') {
          return (
            <Fragment key={message.id}>
              {divider}
              <SystemNotice
                message={message}
                onJump={props.onJump}
                onOpenNote={props.onOpenNote}
              />
            </Fragment>
          );
        }
        const mine = message.userId === userId;
        const selectable = props.selecting && isSelectable(message);
        const selected = selectable && Boolean(props.selectedIds?.has(message.id));
        const row = (
          <MessageRow
            message={message}
            userId={userId}
            myHandle={myHandle}
            mine={mine}
            first={index === 0 || !sameAuthor(messages[index - 1], message)}
            last={index === messages.length - 1 || !sameAuthor(message, messages[index + 1])}
            tagged={!mine && mentionsUser(message.content, myHandle, props.everyoneTag)}
            viewers={viewersOf(message, messages, reads)}
            lastReaders={lastSeenOn(message, messages, reads, userId)}
            delivery={props.showDelivery ? deliveryOf(message, messages, reads, userId) : null}
            canSaveToCloud={props.canSaveToCloud}
            canPin={props.canPin}
            canManage={props.canManage}
            onMarkRead={props.onMarkRead}
            onViewProfile={props.onViewProfile}
            onOpenRoom={props.onOpenRoom}
            onAction={props.onAction}
            onReact={props.onReact}
            onJump={props.onJump}
            onMessageUpdated={props.onMessageUpdated}
          />
        );
        return (
          <Fragment key={message.id}>
            {divider}
            {selectable ? (
              <div
                className={selected ? 'select-line selected' : 'select-line'}
                onClick={() => props.onToggleSelect?.(message)}
              >
                <Checkbox checked={selected} />
                <div className="select-line-body">{row}</div>
              </div>
            ) : (
              row
            )}
          </Fragment>
        );
      })}
      {props.pending ? (
        <div className="row theirs agent">
          <Avatar size={28} icon={<RobotOutlined />} style={{ background: '#31a24c' }} />
          <div className="stack">
            <div className="bubble pending">
              <p>Agent đang soạn tin...</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

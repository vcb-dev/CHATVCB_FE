import { RobotOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';
import { Fragment, type RefObject } from 'react';
import type { ChatMessage, RoomRead } from '@/types';
import { mentionsUser } from '../utils/mentions';
import { lastSeenOn, viewersOf } from '../utils/seen';
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
  onLoadOlder: () => Promise<void>;
  onMarkRead: () => void;
  onViewProfile: (userId: string) => void;
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
        return (
          <Fragment key={message.id}>
            {divider}
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
              canSaveToCloud={props.canSaveToCloud}
              canPin={props.canPin}
              canManage={props.canManage}
              onMarkRead={props.onMarkRead}
              onViewProfile={props.onViewProfile}
              onAction={props.onAction}
              onReact={props.onReact}
              onJump={props.onJump}
              onMessageUpdated={props.onMessageUpdated}
            />
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

import { RobotOutlined } from '@ant-design/icons';
import { Avatar, Checkbox, Popover } from 'antd';
import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { ChatMessage, Room, RoomMember, RoomRead } from '@/types';
import { isSelectable } from '../hooks/useMessageSelection';
import { mentionsUser } from '../utils/mentions';
import { buildSeen } from '../utils/seen';
import { MessageRow } from './MessageRow';
import { ReadReceiptList } from './ReadReceiptList';
import { SystemNotice } from './SystemNotice';
import { UnreadDivider } from './UnreadDivider';

const NO_READERS: RoomRead[] = [];

function sameAuthor(a: ChatMessage, b: ChatMessage) {
  return a.role === b.role && a.userId === b.userId && a.authorName === b.authorName;
}

export function MessageList(props: {
  listRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  unreadFromId: string | null;
  reads: RoomRead[];
  /** Thành viên phòng, dùng cho "đã đọc / chưa đọc" trong nhóm. */
  members: RoomMember[];
  /** Tin của phòng đang mở chưa nạp xong. */
  loading?: boolean;
  /** Nhóm: tin của mình hiện vòng "đã đọc" kiểu Lark thay cho avatar "đã xem". */
  readReceipts?: boolean;
  userId: string;
  myHandle: string;
  loadingOlder: boolean;
  pending: boolean;
  canSaveToCloud?: boolean;
  canPin?: boolean;
  canManage?: boolean;
  mentionsEnabled?: boolean;
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
  const seen = useMemo(
    () => buildSeen(messages, reads, props.members, userId),
    [messages, reads, props.members, userId],
  );

  // Các hàm của dòng tin giữ nguyên danh tính giữa các lần vẽ (luôn gọi bản mới nhất), nhờ đó
  // MessageRow chỉ vẽ lại khi dữ liệu của chính nó đổi chứ không phải mỗi lần ChatPage vẽ.
  const latest = useRef(props);
  latest.current = props;
  const handlers = useMemo(
    () => ({
      onMarkRead: () => latest.current.onMarkRead(),
      onViewProfile: (id: string) => latest.current.onViewProfile(id),
      onOpenRoom: (room: Room) => latest.current.onOpenRoom(room),
      onAction: (key: string, message: ChatMessage) => latest.current.onAction(key, message),
      onReact: (message: ChatMessage, emoji: string) => latest.current.onReact(message, emoji),
      onJump: (id: string, createdAt?: string) => latest.current.onJump(id, createdAt),
      onMessageUpdated: (message: ChatMessage) => latest.current.onMessageUpdated?.(message),
    }),
    [],
  );

  // Một hộp "Đã đọc | Chưa đọc" dùng chung, neo vào vòng vừa bấm (nhẹ hơn một Popover cho mỗi tin)
  const [receiptAt, setReceiptAt] = useState<{
    id: string;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const openReceipt = useMemo(
    () => (message: ChatMessage, anchor: HTMLElement) => {
      const { left, top, width, height } = anchor.getBoundingClientRect();
      setReceiptAt({ id: message.id, rect: { left, top, width, height } });
    },
    [],
  );
  useEffect(() => {
    setReceiptAt(null);
  }, [props.loading]);
  const openedMessage = receiptAt ? messages.find((item) => item.id === receiptAt.id) : undefined;
  const openedReceipt = openedMessage ? seen.receiptOf(openedMessage) : null;

  return (
    <div
      className="messages"
      ref={props.listRef}
      onScroll={(e) => {
        if (receiptAt) {
          setReceiptAt(null);
        }
        if (e.currentTarget.scrollTop < 40) {
          void props.onLoadOlder();
        }
      }}
    >
      {props.loading ? <div className="messages-opening">Đang tải tin nhắn…</div> : null}
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
        const receipt = props.readReceipts ? seen.receiptOf(message) : null;
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
            tagged={!mine && Boolean(props.mentionsEnabled) && mentionsUser(message.content, myHandle, true)}
            mentionsEnabled={props.mentionsEnabled}
            viewers={seen.viewersOf(message)}
            lastReaders={receipt ? NO_READERS : seen.lastSeenOn(message)}
            delivery={props.showDelivery && !receipt ? seen.deliveryOf(message) : null}
            readCount={receipt?.read.length}
            readTotal={receipt ? receipt.read.length + receipt.unread.length : undefined}
            onOpenReceipt={openReceipt}
            canSaveToCloud={props.canSaveToCloud}
            canPin={props.canPin}
            canManage={props.canManage}
            onMarkRead={handlers.onMarkRead}
            onViewProfile={handlers.onViewProfile}
            onOpenRoom={handlers.onOpenRoom}
            onAction={handlers.onAction}
            onReact={handlers.onReact}
            onJump={handlers.onJump}
            onMessageUpdated={handlers.onMessageUpdated}
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
      {receiptAt && openedReceipt ? (
        <Popover
          open
          trigger="click"
          placement="bottomRight"
          rootClassName="receipt-popover"
          content={<ReadReceiptList receipt={openedReceipt} />}
          onOpenChange={(open) => {
            if (!open) {
              setReceiptAt(null);
            }
          }}
        >
          <span
            className="receipt-anchor"
            style={{
              left: receiptAt.rect.left,
              top: receiptAt.rect.top,
              width: receiptAt.rect.width,
              height: receiptAt.rect.height,
            }}
          />
        </Popover>
      ) : null}
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

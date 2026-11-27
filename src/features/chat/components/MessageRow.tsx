import {
  MoreOutlined,
  PushpinOutlined,
  RobotOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, type MenuProps } from 'antd';
import { memo } from 'react';
import { fileSrc } from '@/api/client';
import { CopyableImage } from '@/components/CopyableImage';
import { UserAvatar } from '@/components/UserAvatar';
import type { ChatMessage, Room, RoomRead } from '@/types';
import { isVoice } from '../utils/attachments';
import { canEdit } from '../utils/edit';
import type { Delivery } from '../utils/seen';
import { chatImagesOf } from '@/features/gallery/utils/chatImages';
import { canForward } from '../utils/forward';
import { isStickerText } from '../utils/stickers';
import { FileCard } from './FileCard';
import { ImageAlbum } from './ImageAlbum';
import { googleDocIdFromUrl } from '@/features/docs/utils/googleLinks';
import { DocLinkCard } from './DocLinkCard';
import { LinkPreviewCard } from './LinkPreviewCard';
import { MessageStatus, type MessageStatusKind } from './MessageStatus';
import { PollCard } from './PollCard';
import { RichBubble } from './RichBubble';
import { ReactionPicker } from './ReactionPicker';
import { ReactionSummary } from './ReactionSummary';
import { ReadStatus } from './ReadStatus';
import { RichText } from './RichText';
import { SeenAvatars } from './SeenAvatars';
import { SeenBubble } from './SeenBubble';
import { TaskCard } from './TaskCard';
import { VoiceBubble } from './VoiceBubble';
import { firstLink } from '../utils/format';
import { inviteTokenOf } from '../utils/invite';

type Props = {
  message: ChatMessage;
  userId: string;
  myHandle: string;
  mine: boolean;
  first: boolean;
  last: boolean;
  showName?: boolean;
  tagged: boolean;
  mentionsEnabled?: boolean;
  viewers: RoomRead[];
  lastReaders: RoomRead[];
  delivery?: Delivery | null;
  /** Tin đang gửi mà máy mất mạng: hiện "Chờ mạng" thay vì đồng hồ "Đang gửi". */
  offline?: boolean;
  /** Tin của mình trong nhóm: số người đã đọc / tổng số người khác (kiểu Lark). */
  readCount?: number;
  readTotal?: number;
  /** Hộp "Đã đọc | Chưa đọc" của tin này đang mở. */
  readOpen?: boolean;
  onOpenReceipt?: (message: ChatMessage, anchor: HTMLElement) => void;
  /** Màn cảm ứng: đang mở thanh cảm xúc/thao tác cho tin này. */
  barOpen?: boolean;
  onToggleBar?: (id: string) => void;
  canSaveToCloud?: boolean;
  canPin?: boolean;
  canManage?: boolean;
  onMarkRead: () => void;
  onViewProfile: (userId: string) => void;
  onOpenRoom: (room: Room) => void;
  onAction: (key: string, message: ChatMessage) => Promise<void>;
  onReact: (message: ChatMessage, emoji: string) => Promise<void>;
  onJump: (id: string, createdAt?: string) => Promise<void>;
  onMessageUpdated?: (m: ChatMessage) => void;
};

function MessageRowView(props: Props) {
  const { message, mine, first, last } = props;
  const hasReceipt = typeof props.readTotal === 'number' && props.readTotal > 0;
  const agent = message.role === 'agent';
  // Tin tạm (đang gửi / gửi lỗi): chưa có id thật nên không có menu, cảm xúc, đã xem
  const sendState = message.sendState;
  const status: MessageStatusKind | null =
    sendState === 'failed'
      ? 'failed'
      : sendState === 'sending'
        ? props.offline
          ? 'waiting'
          : 'sending'
        : (props.delivery ?? null);
  const cls = [
    'row',
    mine ? 'mine' : 'theirs',
    first ? 'first' : '',
    last ? 'last' : '',
    agent ? 'agent' : '',
    props.tagged ? 'tagged' : '',
    props.barOpen ? 'bar-open' : '',
    sendState ? `send-${sendState}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const album = (message.images ?? []).length > 1 && !message.recalled;
  const hasImage = Boolean(message.imageUrl && !message.recalled) && !album;
  const hasFile = Boolean(message.fileUrl && !message.recalled);
  const hasVoice = hasFile && isVoice(message);
  const isPoll = Boolean(message.poll && !message.recalled);
  const isRich = Boolean(message.rich && !message.recalled);
  const isTask = Boolean(message.task && !message.recalled);
  const hasText = Boolean(message.content && !message.recalled) && !isPoll && !isRich && !isTask;
  const isCardTypeRich = Boolean(isRich && message.rich?.type !== 'sticker');
  const hasCard = Boolean(isTask || isPoll || isCardTypeRich || (hasFile && !hasVoice));
  const sticker =
    (!hasImage && !album && !hasFile && hasText && isStickerText(message.content)) ||
    message.rich?.type === 'sticker';
  const link = !isPoll && hasText && !hasImage && !album && !hasFile && !sticker ? firstLink(message.content) : null;
  const previewLink = link && !inviteTokenOf(link) ? link : null;
  const menuProps: MenuProps = {
    items: [
      {
        key: 'reply',
        label: 'Trả lời tin nhắn',
        disabled: message.recalled,
      },
      ...(canForward(message) ? [{ key: 'forward', label: 'Chuyển tiếp' }] : []),
      ...(props.canSaveToCloud && canForward(message)
        ? [{ key: 'saveCloud', label: 'Lưu vào Cloud' }]
        : []),
      ...(chatImagesOf(message).length
        ? [{ key: 'shareLibrary', label: 'Đưa lên thư viện' }]
        : []),
      ...(hasText ? [{ key: 'copy', label: 'Sao chép tin nhắn' }] : []),
      ...(canEdit(message, props.userId) ? [{ key: 'edit', label: 'Sửa tin nhắn' }] : []),
      ...(hasImage ? [{ key: 'copyImage', label: 'Sao chép ảnh' }] : []),
      ...(props.canPin !== false
        ? [
            {
              key: 'pin',
              label: message.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn',
              disabled: message.recalled,
            },
          ]
        : []),
      ...(message.recalled ? [] : [{ key: 'select', label: 'Chọn nhiều tin' }]),
      { key: 'delete', label: 'Xóa tin nhắn' },
      ...(mine && !message.recalled
        ? [{ key: 'recall', label: 'Thu hồi tin nhắn', danger: true }]
        : []),
    ],
    onClick: ({ key }) => {
      props.onToggleBar?.('');
      void props.onAction(key, message);
    },
  };
  return (
    <div
      id={`msg-${message.id}`}
      className={cls}
      onClick={(e) => {
        props.onMarkRead();
        if (sendState) {
          return;
        }
        const target = e.target as Element | null;
        if (target?.closest('a, button, input, textarea, [role="button"], .msg-hover-bar, .react-summary')) {
          return;
        }
        props.onToggleBar?.(message.id);
      }}
    >
      <span className="avatar-spacer" />
      <div className="stack">
        {props.showName ? (
          <span className="who-line">{message.authorName}</span>
        ) : null}
        {message.replyTo ? (
          <button
            type="button"
            className="reply-quote"
            onClick={(event) => {
              event.stopPropagation();
              props.onMarkRead();
              void props.onJump(message.replyTo!.id);
            }}
          >
            <span className="reply-quote-head">↩ Trả lời {message.replyTo.authorName}</span>
            <span className="reply-quote-body">
              {message.replyTo.recalled
                ? 'Tin nhắn đã được thu hồi'
                : message.replyTo.content ||
                  (message.replyTo.fileName
                    ? `[Tệp] ${message.replyTo.fileName}`
                    : '') ||
                  (message.replyTo.imageUrl ? '[Ảnh]' : '')}
            </span>
          </button>
        ) : null}
        <div className="bubble-wrap">
          {!mine && last ? (
            <UserAvatar
              size={28}
              className="avatar-initials row-avatar"
              src={message.authorAvatarUrl}
              name={message.authorName}
              icon={agent ? <RobotOutlined /> : undefined}
              zoomable={false}
              style={{
                ...(agent ? { background: '#31a24c' } : undefined),
                cursor: !agent && message.userId ? 'pointer' : 'default',
              }}
              onClick={(e) => {
                if (!agent && message.userId) {
                  e?.stopPropagation();
                  props.onViewProfile(message.userId);
                }
              }}
            />
          ) : null}
          <Dropdown trigger={['contextMenu']} menu={menuProps} disabled={Boolean(sendState)}>
            <div className="bubble-hit">
              <SeenBubble viewers={props.viewers} disabled={hasReceipt}>
                <div
                  className={[
                    'bubble',
                    sendState === 'sending' && (hasImage || album || hasFile) ? 'is-uploading' : '',
                    hasImage || album ? 'has-image' : '',
                    hasFile && !hasVoice ? 'has-file' : '',
                    hasText ? 'has-text' : '',
                    hasCard ? 'has-card' : '',
                    sticker ? 'sticker' : '',
                    message.recalled ? 'recalled' : '',
                    message.pinned ? 'pinned' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {message.recalled ? (
                    <p className="recalled-text">Tin nhắn đã được thu hồi</p>
                  ) : (
                    <>
                      {album ? (
                        <ImageAlbum
                          images={message.images ?? []}
                          onOpen={props.onMarkRead}
                        />
                      ) : hasImage ? (
                        <CopyableImage
                          src={fileSrc(message.imageUrl as string)}
                          alt=""
                          className="chat-photo"
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onMarkRead();
                          }}
                        />
                      ) : null}
                      {hasFile ? (
                        isVoice(message) ? (
                          <VoiceBubble
                            url={fileSrc(message.fileUrl as string)}
                            durationMs={message.fileDurationMs ?? 0}
                          />
                        ) : (
                          <FileCard
                            name={message.fileName || 'Tệp'}
                            sizeBytes={message.fileSizeBytes}
                            url={message.fileUrl as string}
                            mimeType={message.fileMimeType}
                          />
                        )
                      ) : null}
                      {isRich ? (
                        <RichBubble
                          message={message}
                          currentUserId={props.userId}
                          onViewProfile={props.onViewProfile}
                          onOpenRoom={props.onOpenRoom}
                        />
                      ) : null}
                      {isTask ? (
                        <TaskCard message={message} userId={props.userId} />
                      ) : isPoll ? (
                        <PollCard
                          message={message}
                          userId={props.userId}
                          canManage={Boolean(props.canManage)}
                          onUpdated={(m) => props.onMessageUpdated?.(m)}
                        />
                      ) : hasText ? (
                        <RichText
                          text={message.content}
                          myHandle={props.myHandle}
                          mentionsEnabled={props.mentionsEnabled}
                        />
                      ) : null}
                      {message.editedAt ? (
                        <span
                          className="edited-mark"
                          title={new Date(message.editedAt).toLocaleString('vi-VN')}
                        >
                          đã chỉnh sửa
                        </span>
                      ) : null}
                    </>
                  )}
                  {message.pinned && !message.recalled ? (
                    <span className="pin-mark">
                      <PushpinOutlined /> Đã ghim
                    </span>
                  ) : null}
                </div>
              </SeenBubble>
            </div>
          </Dropdown>
          {hasReceipt ? (
            <ReadStatus
              read={props.readCount ?? 0}
              total={props.readTotal as number}
              open={props.readOpen}
              onOpen={(anchor) => props.onOpenReceipt?.(message, anchor)}
            />
          ) : null}
          <div className="msg-hover-bar" onClick={(e) => e.stopPropagation()}>
            {!message.recalled ? (
              <>
                <ReactionPicker
                  mine={message.reactions
                    .filter((r) => r.userIds.includes(props.userId))
                    .map((r) => r.emoji)}
                  onPick={(emoji) => {
                    props.onToggleBar?.('');
                    void props.onReact(message, emoji);
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<RollbackOutlined />}
                  className="msg-hover-btn"
                  aria-label="Trả lời"
                  title="Trả lời"
                  onClick={() => {
                    props.onToggleBar?.('');
                    void props.onAction('reply', message);
                  }}
                />
              </>
            ) : null}
            <Dropdown trigger={['click']} menu={menuProps} placement="top">
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                className="msg-hover-btn"
                aria-label="Thêm"
                title="Thêm"
              />
            </Dropdown>
          </div>
        </div>
        {previewLink ? (
          googleDocIdFromUrl(previewLink) ? (
            <DocLinkCard url={previewLink} roomId={message.roomId} />
          ) : (
            <LinkPreviewCard url={previewLink} />
          )
        ) : null}
        <ReactionSummary
          reactions={message.reactions}
          myId={props.userId}
          onToggle={(emoji) => void props.onReact(message, emoji)}
        />
        <SeenAvatars readers={props.lastReaders} />
        {status ? (
          <MessageStatus
            kind={status}
            error={message.sendError}
            onRetry={() => void props.onAction('retrySend', message)}
            onDiscard={() => void props.onAction('discardSend', message)}
          />
        ) : null}
        {last ? (
          <time className="msg-time">
            {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        ) : null}
      </div>
    </div>
  );
}

function sameElements(a: unknown[], b: unknown[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

// Vẽ lại một dòng chỉ khi dữ liệu của chính nó đổi; mảng (người đã xem…) so theo từng phần tử
function sameRow(a: Props, b: Props) {
  const keys = Object.keys(a) as (keyof Props)[];
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  return keys.every((key) => {
    const x = a[key];
    const y = b[key];
    return x === y || (Array.isArray(x) && Array.isArray(y) && sameElements(x, y));
  });
}

export const MessageRow = memo(MessageRowView, sameRow);

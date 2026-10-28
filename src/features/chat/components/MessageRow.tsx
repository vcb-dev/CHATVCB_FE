import { PushpinOutlined, RobotOutlined } from '@ant-design/icons';
import { Avatar, Dropdown } from 'antd';
import { fileSrc } from '@/api/client';
import { CopyableImage } from '@/components/CopyableImage';
import { avatarColor, initials } from '@/lib/avatar';
import type { ChatMessage, Room, RoomRead } from '@/types';
import { isVoice } from '../utils/attachments';
import { canEdit } from '../utils/edit';
import type { Delivery } from '../utils/seen';
import { canForward } from '../utils/forward';
import { isStickerText } from '../utils/stickers';
import { DeliveryStatus } from './DeliveryStatus';
import { FileCard } from './FileCard';
import { ImageAlbum } from './ImageAlbum';
import { LinkPreviewCard } from './LinkPreviewCard';
import { PollCard } from './PollCard';
import { RichBubble } from './RichBubble';
import { ReactionPicker } from './ReactionPicker';
import { ReactionSummary } from './ReactionSummary';
import { RichText } from './RichText';
import { SeenAvatars } from './SeenAvatars';
import { SeenBubble } from './SeenBubble';
import { VoiceBubble } from './VoiceBubble';
import { firstLink } from '../utils/format';
import { inviteTokenOf } from '../utils/invite';

export function MessageRow(props: {
  message: ChatMessage;
  userId: string;
  myHandle: string;
  mine: boolean;
  first: boolean;
  last: boolean;
  tagged: boolean;
  mentionsEnabled?: boolean;
  viewers: RoomRead[];
  lastReaders: RoomRead[];
  delivery?: Delivery | null;
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
}) {
  const { message, mine, first, last } = props;
  const agent = message.role === 'agent';
  const cls = [
    'row',
    mine ? 'mine' : 'theirs',
    agent ? 'agent' : '',
    props.tagged ? 'tagged' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const album = (message.images ?? []).length > 1 && !message.recalled;
  const hasImage = Boolean(message.imageUrl && !message.recalled) && !album;
  const hasFile = Boolean(message.fileUrl && !message.recalled);
  const isPoll = Boolean(message.poll && !message.recalled);
  const isRich = Boolean(message.rich && !message.recalled);
  const hasText = Boolean(message.content && !message.recalled) && !isPoll && !isRich;
  const sticker =
    (!hasImage && !album && !hasFile && hasText && isStickerText(message.content)) ||
    message.rich?.type === 'sticker';
  const link = !isPoll && hasText && !hasImage && !album && !hasFile && !sticker ? firstLink(message.content) : null;
  const previewLink = link && !inviteTokenOf(link) ? link : null;
  return (
    <div
      id={`msg-${message.id}`}
      className={cls}
      onClick={() => props.onMarkRead()}
    >
      {!mine && first ? (
        <Avatar
          size={28}
          className="avatar-initials"
          src={message.authorAvatarUrl ? fileSrc(message.authorAvatarUrl) : undefined}
          icon={agent ? <RobotOutlined /> : undefined}
          style={{
            background: agent ? '#31a24c' : avatarColor(message.authorName),
            cursor: !agent && message.userId ? 'pointer' : 'default',
          }}
          onClick={(e) => {
            if (!agent && message.userId) {
              e?.stopPropagation();
              props.onViewProfile(message.userId);
            }
          }}
        >
          {agent ? null : initials(message.authorName)}
        </Avatar>
      ) : (
        <span className="avatar-spacer" />
      )}
      <div className="stack">
        {first && !mine ? (
          <span className="who-line">{message.authorName}</span>
        ) : null}
        <div className="bubble-wrap">
          <Dropdown
            trigger={['contextMenu']}
            menu={{
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
              onClick: ({ key }) => void props.onAction(key, message),
            }}
          >
            <div className="bubble-hit">
              <SeenBubble viewers={props.viewers}>
                <div
                  className={[
                    'bubble',
                    hasImage || album ? 'has-image' : '',
                    hasFile ? 'has-file' : '',
                    hasText ? 'has-text' : '',
                    sticker ? 'sticker' : '',
                    message.recalled ? 'recalled' : '',
                    message.pinned ? 'pinned' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
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
                      <strong>{message.replyTo.authorName}</strong>
                      <span>
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
                      {isPoll ? (
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
          {!message.recalled ? (
            <ReactionPicker
              mine={message.reactions
                .filter((r) => r.userIds.includes(props.userId))
                .map((r) => r.emoji)}
              onPick={(emoji) => void props.onReact(message, emoji)}
            />
          ) : null}
        </div>
        {previewLink ? <LinkPreviewCard url={previewLink} /> : null}
        <ReactionSummary
          reactions={message.reactions}
          myId={props.userId}
          onToggle={(emoji) => void props.onReact(message, emoji)}
        />
        <SeenAvatars readers={props.lastReaders} />
        {props.delivery ? <DeliveryStatus status={props.delivery} /> : null}
        {last ? (
          <time>
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

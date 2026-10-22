import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Mentions, Typography } from 'antd';
import {
  useMemo,
  useRef,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';
import type {
  ChatMessage,
  PendingFile,
  PendingImage,
  PresenceUser,
  Room,
  RoomMember,
} from '@/types';
import { buildMentionOptions, mentionOpen } from '../utils/mentions';
import { filesFromClipboard } from '../utils/media';
import { AttachButton } from './AttachButton';
import { ComposerActions } from './ComposerActions';
import { PendingFiles } from './PendingFiles';
import { PendingPreviews } from './PendingPreviews';
import { StickerButton } from './StickerButton';

export function Composer(props: {
  room: Room | null;
  userId: string;
  members: RoomMember[];
  membersLoaded: boolean;
  online: PresenceUser[];
  disabled: boolean;
  error: string;
  draft: string;
  replyTo: ChatMessage | null;
  pendingImages: PendingImage[];
  pendingFiles: PendingFile[];
  onDraftChange: Dispatch<SetStateAction<string>>;
  onCancelReply: () => void;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (key: string) => void;
  onAddDocs: (files: File[]) => void;
  onRemoveDoc: (key: string) => void;
  onOpenGallery: () => Promise<void>;
  onSticker: (emoji: string) => Promise<void>;
  onGif: (url: string) => Promise<void>;
  onSend: (raw: string) => Promise<void>;
  onMarkRead: () => void;
}) {
  const { room, draft, replyTo, members, pendingImages, pendingFiles } = props;
  const mentionMeasuringRef = useRef(false);
  const mentionOptions = useMemo(
    () => buildMentionOptions(members, props.online, props.userId, room),
    [members, props.online, room, props.userId],
  );
  const canSend = Boolean(
    !props.disabled && (draft.trim() || pendingImages.length || pendingFiles.length),
  );

  function shouldSkipSend(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return true;
    }
    if (mentionMeasuringRef.current || mentionOpen(draft)) {
      return true;
    }
    return false;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void props.onSend(draft);
  }

  function handlePressEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.shiftKey || shouldSkipSend(event)) {
      return;
    }
    event.preventDefault();
    void props.onSend(event.currentTarget.value);
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (shouldSkipSend(event)) {
        return;
      }
      event.preventDefault();
    }
  }

  return (
    <form
      className="composer"
      onSubmit={handleSubmit}
      onPaste={(event) => {
        const files = filesFromClipboard(event);
        if (!files.length) {
          return;
        }
        event.preventDefault();
        props.onAddImages(files);
      }}
      onMouseDown={() => props.onMarkRead()}
    >
      {props.error ? <Typography.Text type="danger">{props.error}</Typography.Text> : null}
      {replyTo ? (
        <div className="reply-bar">
          <div>
            <strong>Trả lời {replyTo.authorName}</strong>
            <span>
              {replyTo.recalled
                ? 'Tin nhắn đã được thu hồi'
                : replyTo.content ||
                  (replyTo.fileName ? `[Tệp] ${replyTo.fileName}` : '') ||
                  (replyTo.imageUrl ? '[Ảnh]' : '')}
            </span>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={props.onCancelReply}
          />
        </div>
      ) : null}
      {props.membersLoaded && members.length === 0 && mentionOptions.length <= 2 ? (
        <Typography.Text type="warning" style={{ width: '100%' }}>
          Chưa tải được danh sách đồng đội — redeploy BE mới trên Railway rồi tải lại trang.
        </Typography.Text>
      ) : null}
      <PendingPreviews items={pendingImages} onRemove={props.onRemoveImage} />
      <PendingFiles items={pendingFiles} onRemove={props.onRemoveDoc} />
      <div className="composer-row">
        <ComposerActions
          disabled={props.disabled}
          onAddFiles={props.onAddImages}
          onOpenGallery={() => void props.onOpenGallery()}
        />
        <AttachButton
          disabled={props.disabled}
          onAddFiles={props.onAddDocs}
        />
        <StickerButton
          disabled={props.disabled}
          onEmoji={(emoji) => props.onDraftChange((current) => `${current}${emoji}`)}
          onSticker={(emoji) => void props.onSticker(emoji)}
          onGif={(url) => void props.onGif(url)}
        />
        <Mentions
          value={draft}
          onChange={props.onDraftChange}
          onFocus={() => props.onMarkRead()}
          onClick={() => props.onMarkRead()}
          onSearch={() => {
            mentionMeasuringRef.current = true;
          }}
          onSelect={() => {
            mentionMeasuringRef.current = false;
          }}
          onBlur={() => {
            mentionMeasuringRef.current = false;
          }}
          onPressEnter={handlePressEnter}
          onKeyDown={handleKey}
          autoSize={{ minRows: 1, maxRows: 5 }}
          options={mentionOptions}
          prefix="@"
          placement="top"
          getPopupContainer={() => document.body}
          styles={{ popup: { zIndex: 2000 } }}
          placeholder={
            room
              ? `Nhắn ${room.title || room.name} · Ctrl+V ảnh · @agent`
              : 'Chọn phòng'
          }
          disabled={props.disabled}
          notFoundContent="Không có người khớp"
        />
        <Button
          type="primary"
          shape="circle"
          size="large"
          className="composer-send"
          htmlType="button"
          icon={<SendOutlined />}
          disabled={!canSend}
          onClick={() => void props.onSend(draft)}
        />
      </div>
    </form>
  );
}

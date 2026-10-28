import { AudioOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Mentions, Tooltip, Typography } from 'antd';
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
  ToolKind,
} from '@/types';
import { buildMentionOptions, mentionOpen } from '../utils/mentions';
import { filesFromClipboard } from '../utils/media';
import { isDirectRoom } from '../utils/rooms';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AttachButton } from './AttachButton';
import { ComposerActions } from './ComposerActions';
import { ComposerToolsMenu } from './ComposerToolsMenu';
import { PendingFiles } from './PendingFiles';
import { PendingPreviews } from './PendingPreviews';
import { StickerButton } from './StickerButton';
import { VoiceRecorderBar } from './VoiceRecorderBar';

export function Composer(props: {
  room: Room | null;
  userId: string;
  members: RoomMember[];
  membersLoaded: boolean;
  online: PresenceUser[];
  disabled: boolean;
  locked?: boolean;
  error: string;
  draft: string;
  replyTo: ChatMessage | null;
  editing: ChatMessage | null;
  pendingImages: PendingImage[];
  pendingFiles: PendingFile[];
  onDraftChange: Dispatch<SetStateAction<string>>;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (key: string) => void;
  onAddDocs: (files: File[]) => void;
  onRemoveDoc: (key: string) => void;
  onOpenGallery: () => Promise<void>;
  onSticker: (emoji: string) => Promise<void>;
  onPackSticker: (id: string) => Promise<void>;
  onGif: (url: string) => Promise<void>;
  onSend: (raw: string) => Promise<void>;
  onSendVoice: (blob: Blob) => Promise<void>;
  onMarkRead: () => void;
  onTool?: (kind: ToolKind) => void;
  onLocation: () => void;
  onCard: () => void;
  blockedByMe?: boolean;
  onUnblock?: () => void;
}) {
  const { room, draft, replyTo, members, pendingImages, pendingFiles } = props;
  const voiceRecorder = useVoiceRecorder({
    roomId: room?.id ?? '',
    onDone: (blob) => void props.onSendVoice(blob),
  });
  const mentionMeasuringRef = useRef(false);
  const mentionOptions = useMemo(
    () => buildMentionOptions(members, props.online, props.userId, room),
    [members, props.online, room, props.userId],
  );
  const canSend = props.editing
    ? !props.disabled && Boolean(draft.trim())
    : Boolean(!props.disabled && (draft.trim() || pendingImages.length || pendingFiles.length));

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
    if (event.key === 'Escape' && props.editing && !mentionOpen(draft)) {
      event.preventDefault();
      props.onCancelEdit();
      return;
    }
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
        if (props.editing) {
          return;
        }
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
      {props.editing ? (
        <div className="reply-bar">
          <div>
            <strong>Sửa tin nhắn</strong>
            <span>{props.editing.content}</span>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={props.onCancelEdit}
          />
        </div>
      ) : replyTo ? (
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
      {props.editing ? null : (
        <>
          <PendingPreviews items={pendingImages} onRemove={props.onRemoveImage} />
          <PendingFiles items={pendingFiles} onRemove={props.onRemoveDoc} />
        </>
      )}
      <div className="composer-row">
        {props.locked ? (
          <div className="composer-locked">
            Chỉ trưởng nhóm và phó nhóm được gửi tin trong nhóm này.
          </div>
        ) : props.blockedByMe ? (
          <div className="composer-locked">
            Bạn đã chặn người này.{' '}
            <Button type="link" size="small" onClick={props.onUnblock}>
              Bỏ chặn
            </Button>
          </div>
        ) : voiceRecorder.state === 'recording' ? (
          <VoiceRecorderBar
            elapsedMs={voiceRecorder.elapsedMs}
            onCancel={voiceRecorder.cancel}
            onSend={voiceRecorder.stop}
          />
        ) : (
          <>
            {props.editing ? null : (
              <>
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
                  onPackSticker={(id) => void props.onPackSticker(id)}
                  onGif={(url) => void props.onGif(url)}
                />
                <ComposerToolsMenu
                  isGroup={Boolean(room && !isDirectRoom(room) && !room.isCloud)}
                  locked={Boolean(props.locked)}
                  disabled={props.disabled}
                  onPick={(kind) => props.onTool?.(kind)}
                  onLocation={props.onLocation}
                  onCard={props.onCard}
                />
                {voiceRecorder.supported ? (
                  <Tooltip title="Ghi tin nhắn thoại">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<AudioOutlined />}
                      className="composer-icon"
                      disabled={props.disabled}
                      onClick={() => void voiceRecorder.start()}
                    />
                  </Tooltip>
                ) : null}
              </>
            )}
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
                room?.isCloud
                  ? 'Lưu ghi chú, ảnh, tệp vào Cloud của tôi'
                  : room
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
          </>
        )}
      </div>
    </form>
  );
}

import { AudioOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Mentions, Tooltip, Typography, type MentionsRef } from 'antd';
import { useMemo, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import type {
  ChatMessage,
  PendingFile,
  PendingImage,
  PresenceUser,
  Room,
  RoomMember,
  ToolKind,
} from '@/types';
import { canAssignTask } from '@/lib/tasks';
import { applyEmoticon, withTrailingEmoticon } from '../utils/emoticons';
import {
  buildMentionOptions,
  mentionKind,
  mentionOpen,
  mentionPeople,
  mentionsAllowed,
  startsTag,
} from '../utils/mentions';
import { filesFromClipboard } from '../utils/media';
import { isDirectRoom } from '../utils/rooms';
import type { ComposerForm } from '../hooks/useComposer';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useTypingSignal } from '../hooks/useTypingSignal';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AttachButton } from './AttachButton';
import { ComposerActions } from './ComposerActions';
import { ComposerToolsMenu } from './ComposerToolsMenu';
import { MentionOption } from './MentionOption';
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
  /** Chữ đang gõ (useComposer): gõ phím chỉ vẽ lại ô soạn tin, không vẽ lại cả ChatPage. */
  form: UseFormReturn<ComposerForm>;
  /** Báo "đang gõ" cho người khác trong phòng. */
  emitTyping: (roomId: string, active: boolean) => void;
  replyTo: ChatMessage | null;
  editing: ChatMessage | null;
  pendingImages: PendingImage[];
  pendingFiles: PendingFile[];
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
  /** Người bên kia đã chặn mình: không gửi được tin. */
  blockedMe?: boolean;
  onUnblock?: () => void;
}) {
  const { room, form, replyTo, members, pendingImages, pendingFiles } = props;
  const narrow = useMediaQuery('(max-width: 800px)');
  const draft = useWatch({ control: form.control, name: 'text' }) ?? '';
  useTypingSignal({ roomId: room?.id ?? '', draft, emitTyping: props.emitTyping });
  const voiceRecorder = useVoiceRecorder({
    roomId: room?.id ?? '',
    onDone: (blob) => void props.onSendVoice(blob),
  });
  const mentionsRef = useRef<MentionsRef>(null);
  // rc-mentions lọc theo `value` (handle) nên `label` là JSX có avatar vẫn lọc đúng.
  const mentionOptions = useMemo(() => {
    const people = mentionPeople(members, props.online);
    return buildMentionOptions(members, props.online, props.userId, room).map((option) => ({
      value: option.value,
      label: (
        <MentionOption
          label={option.label}
          kind={mentionKind(option.value, room)}
          person={people.get(option.value)}
        />
      ),
    }));
  }, [members, props.online, room, props.userId]);
  const hasContent = Boolean(draft.trim() || pendingImages.length || pendingFiles.length);
  // Nút "+" (bộ sưu tập, giao việc, nhắc hẹn, ghi chú, vị trí, danh thiếp): dùng cả khi nhóm khoá gửi tin.
  const toolsMenu = (
    <ComposerToolsMenu
      isGroup={Boolean(room && !isDirectRoom(room) && !room.isCloud)}
      canAssign={Boolean(room && canAssignTask(room))}
      locked={Boolean(props.locked)}
      disabled={props.disabled}
      onOpenGallery={() => void props.onOpenGallery()}
      onPick={(kind) => props.onTool?.(kind)}
      onLocation={props.onLocation}
      onCard={props.onCard}
    />
  );
  const canSend = props.editing
    ? !props.disabled && Boolean(draft.trim())
    : !props.disabled && hasContent;

  // Popup @ đang mở thì rc-mentions tự không gọi onPressEnter (Enter để chọn người),
  // nên ở đây chỉ còn chặn Enter của bộ gõ IME đang ghép chữ.
  function shouldSkipSend(event: KeyboardEvent<HTMLTextAreaElement>) {
    return event.nativeEvent.isComposing || event.keyCode === 229;
  }

  // rc-mentions mở popup ở mọi dấu `@` và chỉ coi dấu cách là hết tag; ở đây chỉ mở khi `@`
  // bắt đầu một tag thật như BE đếm, và mọi khoảng trắng (cả xuống dòng) đều kết thúc tag.
  function validateMention(search: string) {
    if (/\s/.test(search)) {
      return false;
    }
    const textarea = textareaEl();
    if (!textarea) {
      return true;
    }
    const before = textarea.value.slice(0, textarea.selectionStart);
    return startsTag(before, before.length - search.length - 1);
  }

  function textareaEl() {
    return mentionsRef.current?.nativeElement?.querySelector('textarea') ?? null;
  }

  // Gõ `:)` rồi cách/xuống dòng thì thành 🙂; đổi chữ làm con trỏ nhảy về cuối nên đặt lại.
  function changeText(next: string, onChange: (value: string) => void) {
    const textarea = textareaEl();
    const hit = textarea ? applyEmoticon(form.getValues('text') ?? '', next, textarea.selectionStart) : null;
    if (!textarea || !hit) {
      onChange(next);
      return;
    }
    onChange(hit.text);
    requestAnimationFrame(() => textarea.setSelectionRange(hit.caret, hit.caret));
  }

  function send(raw: string) {
    void props.onSend(withTrailingEmoticon(raw));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  function handlePressEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.shiftKey || shouldSkipSend(event)) {
      return;
    }
    event.preventDefault();
    send(event.currentTarget.value);
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
      {props.membersLoaded && mentionsAllowed(room) && members.length === 0 && mentionOptions.length <= 2 ? (
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
      <div className="composer-pill">
        {props.locked ? (
          <>
            {toolsMenu}
            <div className="composer-locked">
              Chỉ trưởng nhóm và phó nhóm được gửi tin trong nhóm này.
            </div>
          </>
        ) : props.blockedByMe ? (
          <div className="composer-locked">
            Bạn đã chặn người này.{' '}
            <Button type="link" size="small" onClick={props.onUnblock}>
              Bỏ chặn
            </Button>
          </div>
        ) : props.blockedMe ? (
          <div className="composer-locked">Bạn không thể nhắn tin cho người này.</div>
        ) : voiceRecorder.state === 'recording' ? (
          <VoiceRecorderBar
            elapsedMs={voiceRecorder.elapsedMs}
            onCancel={voiceRecorder.cancel}
            onSend={voiceRecorder.stop}
          />
        ) : (
          <>
            {props.editing ? null : toolsMenu}
            <Controller
              control={form.control}
              name="text"
              render={({ field }) => (
                <Mentions
                  ref={mentionsRef}
                  value={field.value}
                  onChange={(next) => changeText(next, field.onChange)}
                  onFocus={() => props.onMarkRead()}
                  onClick={() => props.onMarkRead()}
                  onBlur={field.onBlur}
                  validateSearch={validateMention}
                  onPressEnter={handlePressEnter}
                  onKeyDown={handleKey}
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  options={mentionOptions}
                  prefix="@"
                  placement="top"
                  getPopupContainer={() => document.body}
                  styles={{ popup: { zIndex: 2000 } }}
                  placeholder={
                    // autoSize đo cả placeholder khi ô trống: câu dài ở khổ hẹp làm ô cao 3–4 dòng
                    narrow
                      ? room?.isCloud
                        ? 'Ghi chú…'
                        : 'Nhắn tin…'
                      : room?.isCloud
                      ? 'Lưu ghi chú, ảnh, tệp vào Cloud của tôi'
                      : room
                      ? `Nhắn ${room.title || room.name} · Ctrl+V ảnh · @agent`
                      : 'Chọn phòng'
                  }
                  disabled={props.disabled}
                  notFoundContent="Không có người khớp"
                />
              )}
            />
            {props.editing ? null : (
              <>
                <StickerButton
                  disabled={props.disabled}
                  onEmoji={(emoji) => form.setValue('text', `${form.getValues('text')}${emoji}`)}
                  onSticker={(emoji) => void props.onSticker(emoji)}
                  onPackSticker={(id) => void props.onPackSticker(id)}
                  onGif={(url) => void props.onGif(url)}
                />
                <ComposerActions
                  disabled={props.disabled}
                  onAddFiles={props.onAddImages}
                />
                <AttachButton
                  disabled={props.disabled}
                  onAddFiles={props.onAddDocs}
                />
              </>
            )}
            {!props.editing && !hasContent && voiceRecorder.supported ? (
              <Tooltip title="Ghi tin nhắn thoại">
                <Button
                  type="text"
                  icon={<AudioOutlined />}
                  className="composer-tool composer-voice-btn"
                  aria-label="Ghi tin nhắn thoại"
                  disabled={props.disabled}
                  onClick={() => void voiceRecorder.start()}
                />
              </Tooltip>
            ) : (
              <Button
                type="text"
                className={`composer-send ${canSend ? 'can-send' : ''}`}
                htmlType="button"
                icon={<SendOutlined />}
                aria-label="Gửi"
                disabled={!canSend}
                onClick={() => send(draft)}
              />
            )}
          </>
        )}
      </div>
    </form>
  );
}

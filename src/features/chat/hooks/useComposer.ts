import { useQueryClient } from '@tanstack/react-query';
import { Modal, message as antMessage } from 'antd';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ChatMessage, GalleryImage, PendingFile, PendingImage, RichPayload } from '@/types';
import { addPendingDocs } from '../utils/attachments';
import { loadDrafts, saveDrafts, withDraft, type Drafts } from '../utils/drafts';
import { currentPosition, formatCoords } from '../utils/location';
import {
  addGalleryPick,
  addPendingFiles,
  mergePhotos,
  photosFromMessages,
  revokePending,
} from '../utils/media';
import { isTemp } from '../utils/messageCache';
import type { SendInput } from './useSendMessage';

/** Ô soạn tin (react-hook-form): chữ đang gõ nằm trong form, `ChatPage` không vẽ lại mỗi phím. */
export type ComposerForm = { text: string };

// Gom các phím gõ liền nhau thành một lần ghi nháp xuống localStorage
const DRAFT_SAVE_MS = 300;

export function useComposer({
  roomId,
  messages,
  send,
  setMessages,
  setError,
}: {
  roomId: string;
  messages: ChatMessage[];
  /** Gửi một tin hiện ngay (useSendMessage). */
  send: (input: SendInput) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setError: (error: string) => void;
}) {
  const queryClient = useQueryClient();
  // `draftsRef` là nháp mới nhất đã lưu; `drafts` là ảnh chụp lúc đổi phòng cho danh sách phòng,
  // nhờ đó gõ phím không làm cả danh sách phòng vẽ lại.
  const draftsRef = useRef<Drafts>(loadDrafts());
  const [drafts, setDrafts] = useState<Drafts>(draftsRef.current);
  // Chữ đang gõ: form không gây vẽ lại ở đây; chỉ ô nhập (Controller/useWatch trong Composer) vẽ lại
  const form = useForm<ComposerForm>({ defaultValues: { text: '' } });
  const { getValues, setValue, reset } = form;
  // Phòng mà chữ trong form đang thuộc về (đổi phòng thì lưu nháp phòng cũ trước khi nạp phòng mới)
  const draftRoomRef = useRef('');
  const saveTimerRef = useRef(0);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const lastSentRef = useRef<{ at: number; text: string }>({ at: 0, text: '' });
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const editingRef = useRef<ChatMessage | null>(null);

  // Ghi nháp đang chờ xuống draftsRef + localStorage ngay (đổi phòng, bắt đầu sửa tin, đóng trang)
  const flushDraft = useCallback(() => {
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = 0;
    const draftRoom = draftRoomRef.current;
    if (editingRef.current || !draftRoom) {
      return;
    }
    const text = getValues('text') ?? '';
    if ((draftsRef.current[draftRoom] ?? '') === (text.trim() ? text : '')) {
      return;
    }
    const next = withDraft(draftsRef.current, draftRoom, text);
    draftsRef.current = next;
    saveDrafts(next);
  }, [getValues]);

  // Mỗi lần chữ đổi (gõ, chèn emoji, xóa sau khi gửi): hẹn ghi nháp, không vẽ lại gì
  useEffect(() => {
    const subscription = form.watch(() => {
      if (editingRef.current) {
        return;
      }
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(flushDraft, DRAFT_SAVE_MS);
    });
    window.addEventListener('pagehide', flushDraft);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pagehide', flushDraft);
      flushDraft();
    };
  }, [form, flushDraft]);

  /** Đặt chữ trong ô soạn tin (gửi xong thì xóa, sửa tin, trả lại khi sửa lỗi). */
  const setDraft = useCallback(
    (text: string) => setValue('text', text),
    [setValue],
  );

  // Hết sửa tin thì trả lại nháp của phòng, không để nội dung sửa ghi đè nháp.
  function restoreDraft() {
    editingRef.current = null;
    setDraft(draftsRef.current[roomId] ?? '');
  }
  pendingImagesRef.current = pendingImages;
  editingRef.current = editing;

  // Đổi phòng: lưu nháp phòng cũ rồi nạp nháp phòng mới trước khi vẽ (không nháy chữ của phòng cũ)
  useLayoutEffect(() => {
    if (!roomId) {
      return;
    }
    flushDraft();
    editingRef.current = null;
    draftRoomRef.current = roomId;
    reset({ text: draftsRef.current[roomId] ?? '' });
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    revokePending(pendingImagesRef.current);
    setPendingImages([]);
    setPendingFiles([]);
    setGalleryOpen(false);
    setReplyTo(null);
    setEditing(null);
    setDrafts(draftsRef.current);
  }, [roomId]);

  useEffect(() => {
    return () => revokePending(pendingImagesRef.current);
  }, []);

  function startEdit(message: ChatMessage) {
    // Lưu nháp đang gõ trước, rồi mới đổi chữ thành nội dung tin cần sửa (không ghi đè nháp)
    flushDraft();
    editingRef.current = message;
    setReplyTo(null);
    setEditing(message);
    setDraft(message.content);
  }

  function cancelEdit() {
    setEditing(null);
    restoreDraft();
  }

  function addImages(files: File[]) {
    setPendingImages((current) => addPendingFiles(current, files));
  }

  function removeImage(key: string) {
    setPendingImages((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed) {
        revokePending([removed]);
      }
      return current.filter((item) => item.key !== key);
    });
  }

  function addDocs(files: File[]) {
    const { next, error } = addPendingDocs(pendingFiles, files);
    if (error) {
      antMessage.error(error);
    }
    setPendingFiles(next);
  }

  function removeDoc(key: string) {
    setPendingFiles((current) => current.filter((item) => item.key !== key));
  }

  async function openGallery() {
    if (!roomId) {
      return;
    }
    setGalleryOpen(true);
    setGalleryLoading(true);
    try {
      // Tin tạm còn ảnh blob sắp bị giải phóng, không đưa vào bộ sưu tập
      const sent = messages.filter((item) => !isTemp(item));
      const photos = await queryClient.query({
        queryKey: queryKeys.gallery(roomId),
        queryFn: () => api.gallery(roomId),
      });
      setGallery(mergePhotos(photosFromMessages(sent), photos));
    } catch {
      setError('Không tải được bộ sưu tập ảnh.');
    } finally {
      setGalleryLoading(false);
    }
  }

  async function addToGallery(files: File[]) {
    if (!roomId) {
      return;
    }
    setGalleryLoading(true);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of files) {
        uploaded.push(await api.uploadImage(roomId, file));
      }
      setGallery((current) => [...uploaded, ...current]);
    } catch {
      setError('Không thêm được ảnh vào bộ sưu tập.');
    } finally {
      setGalleryLoading(false);
    }
  }

  function pickFromGallery(image: GalleryImage) {
    setPendingImages((current) => addGalleryPick(current, image));
    setGalleryOpen(false);
  }

  // Các hàm gửi dưới đây chỉ dựng tin rồi giao cho `send`: tin hiện ngay, lỗi thì nằm lại
  // trong khung tin với "Gửi lỗi · Thử lại | Xóa" (không trả chữ về ô nhập)
  async function sendSticker(emoji: string) {
    if (!roomId) {
      return;
    }
    send({ content: emoji, replyTo });
    setReplyTo(null);
  }

  async function sendGif(url: string) {
    if (!roomId) {
      return;
    }
    send({ content: '', replyTo, gifUrl: url });
    setReplyTo(null);
  }

  async function sendContent(raw: string) {
    if (!roomId) {
      return;
    }
    if (editing) {
      const content = raw.trim();
      if (!content) {
        return;
      }
      const target = editing;
      setEditing(null);
      restoreDraft();
      try {
        const next = await api.editMessage(roomId, target.id, content);
        setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
      } catch (err) {
        editingRef.current = target;
        setEditing(target);
        setDraft(content);
        antMessage.error(err instanceof Error ? err.message : 'Không sửa được tin nhắn.');
      }
      return;
    }
    const content = raw.trim();
    const attachments = pendingImages;
    const filesToSend = pendingFiles;
    if (!content && attachments.length === 0 && filesToSend.length === 0) {
      return;
    }
    const now = Date.now();
    const imageKeys = attachments.map((item) => item.imageId || item.key).join(',');
    const fileKeys = filesToSend.map((item) => item.key).join(',');
    const fingerprint = `${content}|img:${imageKeys}|file:${fileKeys}`;
    if (lastSentRef.current.text === fingerprint && now - lastSentRef.current.at < 800) {
      return;
    }
    lastSentRef.current = { at: now, text: fingerprint };
    const reply = replyTo;
    setDraft('');
    // Không giải phóng blob của ảnh chờ gửi: tin tạm dùng tiếp làm ảnh xem trước tới khi gửi xong
    setPendingImages([]);
    setPendingFiles([]);
    setReplyTo(null);
    setError('');
    // Ảnh (một tấm hoặc album) là một tin, mỗi tệp một tin; chữ + trả lời đi kèm tin cuối cùng
    const last = filesToSend.length === 0;
    if (attachments.length) {
      send({ content: last ? content : '', replyTo: last ? reply : null, images: attachments });
    }
    filesToSend.forEach((fileItem, index) => {
      const isLastOverall = index === filesToSend.length - 1;
      send({
        content: isLastOverall ? content : '',
        replyTo: isLastOverall ? reply : null,
        file: { blob: fileItem.file, name: fileItem.file.name },
      });
    });
    if (attachments.length === 0 && filesToSend.length === 0) {
      send({ content, replyTo: reply });
    }
  }

  async function sendRich(rich: RichPayload) {
    if (!roomId) {
      return;
    }
    send({ content: '', replyTo, rich });
    setReplyTo(null);
  }

  async function sendLocation() {
    const hide = antMessage.loading('Đang lấy vị trí…', 0);
    let position: { lat: number; lng: number };
    try {
      position = await currentPosition();
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không lấy được vị trí, thử lại sau.');
      return;
    } finally {
      hide();
    }
    Modal.confirm({
      title: 'Gửi vị trí hiện tại của bạn?',
      content: formatCoords(position.lat, position.lng),
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: () => sendRich({ type: 'location', ...position }),
    });
  }

  async function sendVoice(blob: Blob) {
    if (!roomId) return;
    let ext = 'webm';
    if (blob.type.includes('mp4')) {
      ext = 'm4a';
    } else if (blob.type.includes('ogg')) {
      ext = 'ogg';
    }
    send({ content: '', replyTo, file: { blob, name: `voice.${ext}`, voice: true } });
    setReplyTo(null);
  }

  return {
    form,
    drafts,
    pendingImages,
    pendingFiles,
    replyTo,
    setReplyTo,
    editing,
    startEdit,
    cancelEdit,
    galleryOpen,
    setGalleryOpen,
    gallery,
    galleryLoading,
    addImages,
    removeImage,
    addDocs,
    removeDoc,
    openGallery,
    addToGallery,
    pickFromGallery,
    sendSticker,
    sendGif,
    sendContent,
    sendRich,
    sendLocation,
    sendVoice,
  };
}

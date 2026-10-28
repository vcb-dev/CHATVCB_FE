import { message as antMessage } from 'antd';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from '@/api/client';
import type { ChatMessage, GalleryImage, PendingFile, PendingImage } from '@/types';
import { addPendingDocs } from '../utils/attachments';
import { loadDrafts, saveDrafts, withDraft, type Drafts } from '../utils/drafts';
import {
  addGalleryPick,
  addPendingFiles,
  mergePhotos,
  photosFromMessages,
  revokePending,
} from '../utils/media';

export function useComposer({
  roomId,
  messages,
  appendMessage,
  setMessages,
  setError,
}: {
  roomId: string;
  messages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setError: (error: string) => void;
}) {
  const [drafts, setDrafts] = useState<Drafts>(loadDrafts);
  // Chữ đang gõ thuộc về đúng một phòng; phòng khác thì lấy nháp đã lưu của phòng đó.
  const [draftState, setDraftState] = useState({ roomId, text: '' });
  const draftsRef = useRef<Drafts>(drafts);
  draftsRef.current = drafts;
  const draft = draftState.roomId === roomId ? draftState.text : (drafts[roomId] ?? '');
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

  const setDraft: Dispatch<SetStateAction<string>> = (value) => {
    setDraftState((prev) => {
      const base = prev.roomId === roomId ? prev.text : (draftsRef.current[roomId] ?? '');
      return { roomId, text: typeof value === 'function' ? value(base) : value };
    });
  };

  // Hết sửa tin thì trả lại nháp của phòng, không để nội dung sửa ghi đè nháp.
  function restoreDraft() {
    setDraftState({ roomId, text: draftsRef.current[roomId] ?? '' });
  }

  useEffect(() => {
    if (editingRef.current || !draftState.roomId) {
      return;
    }
    const next = withDraft(draftsRef.current, draftState.roomId, draftState.text);
    draftsRef.current = next;
    setDrafts(next);
    saveDrafts(next);
  }, [draftState]);
  pendingImagesRef.current = pendingImages;
  editingRef.current = editing;

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
    setDraftState({ roomId, text: draftsRef.current[roomId] ?? '' });
  }, [roomId]);

  useEffect(() => {
    return () => revokePending(pendingImagesRef.current);
  }, []);

  function startEdit(message: ChatMessage) {
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
      setGallery(mergePhotos(photosFromMessages(messages), await api.gallery(roomId)));
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

  async function sendSticker(emoji: string) {
    if (!roomId) {
      return;
    }
    try {
      appendMessage(await api.sendMessage(roomId, emoji, undefined, replyTo?.id));
      setReplyTo(null);
    } catch {
      setError('Gửi sticker thất bại.');
    }
  }

  async function sendGif(url: string) {
    if (!roomId) {
      return;
    }
    try {
      const image = await api.attachRemoteImage(roomId, url);
      appendMessage(await api.sendMessage(roomId, '', image.id, replyTo?.id));
      setReplyTo(null);
    } catch {
      setError('Gửi GIF thất bại.');
    }
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
    const replyId = replyTo?.id;
    setDraft('');
    setPendingImages([]);
    setPendingFiles([]);
    setReplyTo(null);
    setError('');
    const unsentFiles = [...filesToSend];
    try {
      const imageIds: string[] = [];
      for (const item of attachments) {
        if (item.imageId) {
          imageIds.push(item.imageId);
          continue;
        }
        if (item.file) {
          const image = await api.uploadImage(roomId, item.file);
          imageIds.push(image.id);
        }
      }
      const last = filesToSend.length === 0;
      if (imageIds.length >= 2) {
        const message = await api.sendMessage(
          roomId,
          last ? content : '',
          undefined,
          last ? replyId : undefined,
          undefined,
          imageIds,
        );
        appendMessage(message);
      } else if (imageIds.length === 1) {
        const message = await api.sendMessage(
          roomId,
          last ? content : '',
          imageIds[0],
          last ? replyId : undefined,
        );
        appendMessage(message);
      }
      revokePending(attachments);

      for (const [index, fileItem] of filesToSend.entries()) {
        const uploadedDoc = await api.uploadFile(roomId, fileItem.file);
        const isLastOverall = index === filesToSend.length - 1;
        const caption = isLastOverall ? content : '';
        const reply = isLastOverall ? replyId : undefined;
        const message = await api.sendMessage(
          roomId,
          caption,
          undefined,
          reply,
          uploadedDoc.id,
        );
        appendMessage(message);
        unsentFiles.shift();
      }

      if (attachments.length === 0 && filesToSend.length === 0) {
        const message = await api.sendMessage(roomId, content, undefined, replyId);
        appendMessage(message);
      }
    } catch (err) {
      setDraft(content);
      setPendingImages(attachments);
      setPendingFiles(unsentFiles);
      setError('Gửi tin thất bại.');
      antMessage.error(err instanceof Error ? err.message : 'Gửi tin thất bại.');
    }
  }

  async function sendVoice(blob: Blob) {
    if (!roomId) return;
    try {
      let ext = 'webm';
      if (blob.type.includes('mp4')) {
        ext = 'm4a';
      } else if (blob.type.includes('ogg')) {
        ext = 'ogg';
      }
      const file = await api.uploadVoice(roomId, blob, `voice.${ext}`);
      const sent = await api.sendMessage(roomId, '', undefined, replyTo?.id, file.id);
      appendMessage(sent);
      setReplyTo(null);
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Gửi tin nhắn thoại thất bại.');
    }
  }

  return {
    draft,
    setDraft,
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
    sendVoice,
  };
}

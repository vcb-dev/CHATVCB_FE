import { message as antMessage } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import type { ChatMessage, GalleryImage, PendingFile, PendingImage } from '@/types';
import { addPendingDocs } from '../utils/attachments';
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
  setError,
}: {
  roomId: string;
  messages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
  setError: (error: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const lastSentRef = useRef<{ at: number; text: string }>({ at: 0, text: '' });
  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    if (!roomId) {
      return;
    }
    revokePending(pendingImagesRef.current);
    setPendingImages([]);
    setPendingFiles([]);
    setGalleryOpen(false);
    setReplyTo(null);
  }, [roomId]);

  useEffect(() => {
    return () => revokePending(pendingImagesRef.current);
  }, []);

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
      const uploadedImages: { imageId?: string; caption: string }[] = [];
      for (const [index, item] of attachments.entries()) {
        const isLastOverall = filesToSend.length === 0 && index === attachments.length - 1;
        const caption = isLastOverall ? content : '';
        if (item.imageId) {
          uploadedImages.push({ imageId: item.imageId, caption });
          continue;
        }
        if (item.file) {
          const image = await api.uploadImage(roomId, item.file);
          uploadedImages.push({ imageId: image.id, caption });
        }
      }
      for (const [index, item] of uploadedImages.entries()) {
        const isLastOverall = filesToSend.length === 0 && index === uploadedImages.length - 1;
        const message = await api.sendMessage(
          roomId,
          item.caption,
          item.imageId,
          isLastOverall ? replyId : undefined,
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

  return {
    draft,
    setDraft,
    pendingImages,
    pendingFiles,
    replyTo,
    setReplyTo,
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
  };
}

import type { ClipboardEvent } from 'react';
import { fileSrc } from '@/api/client';
import type { ChatMessage, GalleryImage, PendingImage } from '@/types';

export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/gif,image/webp';

const MAX_ALBUM_IMAGES = 20;

export function filesFromClipboard(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  );
  return files;
}

export function splitDropped(files: File[]): { images: File[]; docs: File[] } {
  const imageTypes = new Set(ACCEPT_IMAGES.split(','));
  const images: File[] = [];
  const docs: File[] = [];
  for (const file of files) {
    if (imageTypes.has(file.type)) {
      images.push(file);
    } else {
      docs.push(file);
    }
  }
  return { images, docs };
}

export function addPendingFiles(current: PendingImage[], files: File[]) {
  const next = [...current];
  for (const file of files) {
    if (next.length >= MAX_ALBUM_IMAGES) {
      break;
    }
    next.push({
      key: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
      preview: URL.createObjectURL(file),
      file,
    });
  }
  return next;
}

export function addGalleryPick(current: PendingImage[], image: GalleryImage) {
  if (current.length >= MAX_ALBUM_IMAGES || current.some((item) => item.imageId === image.id)) {
    return current;
  }
  return [
    ...current,
    {
      key: image.id,
      preview: fileSrc(image.url),
      imageId: image.id,
    },
  ];
}

export function photosFromMessages(messages: ChatMessage[]) {
  const seen = new Set<string>();
  const list: GalleryImage[] = [];
  for (const item of messages) {
    if (item.recalled) {
      continue;
    }
    const images = item.images && item.images.length > 0
      ? item.images
      : item.imageUrl
        ? [{ id: item.imageId || item.id, url: item.imageUrl }]
        : [];
    for (const img of images) {
      if (seen.has(img.id) || seen.has(img.url)) {
        continue;
      }
      seen.add(img.id);
      seen.add(img.url);
      list.push({
        id: img.id,
        filename: 'Ảnh',
        url: img.url,
        createdAt: item.createdAt,
      });
    }
  }
  return list;
}

export function mergePhotos(...groups: GalleryImage[][]) {
  const seen = new Set<string>();
  const list: GalleryImage[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (!item.url || seen.has(item.id) || seen.has(item.url)) {
        continue;
      }
      seen.add(item.id);
      seen.add(item.url);
      list.push(item);
    }
  }
  return list;
}

export function revokePending(items: PendingImage[]) {
  for (const item of items) {
    if (item.preview.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
  }
}

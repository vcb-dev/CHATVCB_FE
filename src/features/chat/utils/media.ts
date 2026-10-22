import type { ClipboardEvent } from 'react';
import { fileSrc } from '@/api/client';
import type { ChatMessage, GalleryImage, PendingImage } from '@/types';

export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/gif,image/webp';

const MAX_PENDING = 8;

export function filesFromClipboard(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  );
  return files;
}

export function addPendingFiles(current: PendingImage[], files: File[]) {
  const next = [...current];
  for (const file of files) {
    if (next.length >= MAX_PENDING) {
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
  if (current.length >= MAX_PENDING || current.some((item) => item.imageId === image.id)) {
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
    if (item.recalled || !item.imageUrl) {
      continue;
    }
    const id = item.imageId || item.id;
    if (seen.has(id) || seen.has(item.imageUrl)) {
      continue;
    }
    seen.add(id);
    seen.add(item.imageUrl);
    list.push({
      id,
      filename: 'Ảnh',
      url: item.imageUrl,
      createdAt: item.createdAt,
    });
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

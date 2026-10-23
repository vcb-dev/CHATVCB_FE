import type { RoomMessageSearch } from '@/types';

export const queryKeys = {
  rooms: ['rooms'] as const,
  reads: (roomId: string) => ['reads', roomId] as const,
  members: (roomId: string) => ['members', roomId] as const,
  pins: (roomId: string) => ['pins', roomId] as const,
  roomMedia: (roomId: string) => ['room-media', roomId] as const,
  gallery: (roomId: string) => ['room-media', roomId, 'gallery'] as const,
  files: (roomId: string) => ['room-media', roomId, 'files'] as const,
  links: (roomId: string) => ['room-media', roomId, 'links'] as const,
  labels: ['labels'] as const,
  roomSearch: (roomId: string, params: RoomMessageSearch) => ['room-search', roomId, params] as const,
};

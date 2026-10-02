export type User = {
  id: string;
  name: string;
  email?: string;
  team?: string;
  avatarUrl?: string;
  createdAt?: string;
};

export type Room = {
  id: string;
  slug: string;
  name: string;
  team?: string;
  agentName: string;
  avatarUrl?: string;
};

export type MessageReply = {
  id: string;
  authorName: string;
  content: string;
  imageUrl?: string | null;
  recalled?: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string | null;
  authorName: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  imageId?: string | null;
  imageUrl?: string | null;
  replyToId?: string | null;
  replyTo?: MessageReply | null;
  pinned?: boolean;
  recalled?: boolean;
  createdAt: string;
};

export type PresenceUser = {
  id: string;
  name: string;
  handle?: string;
};

export type RoomMember = {
  id: string;
  name: string;
  nickname?: string;
  displayName?: string;
  handle: string;
  avatarUrl?: string;
};

export type RoomRead = {
  userId: string;
  name: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
};

export type GalleryImage = {
  id: string;
  filename: string;
  url: string;
  createdAt: string;
};

export type RoomLink = {
  url: string;
  messageId: string;
  authorName: string;
  createdAt: string;
};

export type PendingImage = {
  key: string;
  preview: string;
  file?: File;
  imageId?: string;
};

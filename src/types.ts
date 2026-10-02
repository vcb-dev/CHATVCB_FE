export type User = {
  id: string;
  name: string;
  email?: string;
  team?: string;
  createdAt?: string;
};

export type Room = {
  id: string;
  slug: string;
  name: string;
  team?: string;
  agentName: string;
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
  handle: string;
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

export type PendingImage = {
  key: string;
  preview: string;
  file?: File;
  imageId?: string;
};

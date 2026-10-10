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

export type Meeting = {
  id: string;
  code: string;
  title: string;
  team: string;
  hostId: string;
  hostName: string;
  notes: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  participants: { id: string; name: string; avatarUrl?: string }[];
};

export type MailAccount = {
  id: string;
  email: string;
  provider?: string;
  imapHost: string;
  imapPort: number;
  displayName: string;
  createdAt: string;
};

export type MailItem = {
  uid: string;
  subject: string;
  from: string;
  date: string | null;
  seen: boolean;
};

export type DocKind = 'doc' | 'sheet' | 'slides' | 'form' | 'mind' | 'folder' | 'board' | 'flow';

export type DocItem = {
  id: string;
  team: string;
  ownerId: string;
  title: string;
  kind: DocKind;
  content: string;
  folder: string;
  googleId?: string;
  googleUrl?: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  owner: { id: string; name: string; avatarUrl?: string };
};

export type MailMessage = {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  text: string;
  html: string;
};

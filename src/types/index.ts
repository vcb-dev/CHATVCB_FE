export type User = {
  id: string;
  name: string;
  email?: string;
  team?: string;
  avatarUrl?: string;
  createdAt?: string;
};

export type GroupRole = 'owner' | 'admin' | 'member';

export type GroupSettings = {
  adminOnlySend: boolean;
  adminOnlyInfo: boolean;
  adminOnlyPin: boolean;
  joinApproval: boolean;
};

export type Room = {
  id: string;
  title: string;
  name: string;
  type: 'direct' | 'group';
  kind: 'direct' | 'group';
  avatarUrl?: string;
  lastMessagePreview: string;
  updatedAt: string;
  canDelete: boolean;
  createdById: string | null;
  unreadCount: number;
  peerUserId: string | null;
  memberIds?: string[];
  /** Có ở GET /rooms; kết quả tìm kiếm và room.updated không có. */
  muted?: boolean;
  mutedUntil?: string | null;
  pinned?: boolean;
  hidden?: boolean;
  markedUnread?: boolean;
  lastMessageId?: string | null;
  labelId?: string | null;
  isCloud?: boolean;
  canLeave?: boolean;
  slug?: string;
  team?: string;
  agentName?: string;
  myRole?: GroupRole;
  canManage?: boolean;
  settings?: GroupSettings;
};

export type ConversationLabel = {
  id: string;
  name: string;
  color: string;
};

export type RoomPrefs = {
  roomId: string;
  pinned: boolean;
  hidden: boolean;
  markedUnread: boolean;
  labelId: string | null;
};

export type MessageReply = {
  id: string;
  authorName: string;
  content: string;
  imageUrl?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  recalled?: boolean;
};

export type MessageReaction = {
  emoji: string;
  count: number;
  userIds: string[];
  users: { id: string; name: string; avatarUrl?: string }[];
};

export type SystemData = {
  actorId: string;
  targetId?: string;
  messageId?: string;
};

export type ToolKind = 'poll' | 'reminder' | 'note';

export type PollVoter = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type PollOption = {
  id: string;
  text: string;
  count: number;
  voterIds: string[];
  voters: PollVoter[];
};

export type ChatPoll = {
  id: string;
  question: string;
  multiple: boolean;
  allowAddOptions: boolean;
  closesAt: string | null;
  closed: boolean;
  creatorId: string;
  totalVoters: number;
  options: PollOption[];
};

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string | null;
  authorName: string;
  authorAvatarUrl?: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  systemKind?: string | null;
  systemData?: SystemData | null;
  imageId?: string | null;
  imageUrl?: string | null;
  images?: { id: string; url: string }[];
  fileId?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  fileDurationMs?: number | null;
  replyToId?: string | null;
  replyTo?: MessageReply | null;
  pinned?: boolean;
  recalled?: boolean;
  editedAt?: string | null;
  reactions: MessageReaction[];
  poll?: ChatPoll | null;
  createdAt: string;
};

export type PageMeta = {
  hasMore: boolean;
  nextCursor: string | null;
};

export type MessagesPage = {
  data: ChatMessage[];
  meta: PageMeta;
};

export type RoomsPage = {
  data: Room[];
  meta: PageMeta;
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
  role?: GroupRole;
};

export type JoinRequest = {
  userId: string;
  name: string;
  avatarUrl: string;
  invitedById: string | null;
  invitedByName: string | null;
  createdAt: string;
};

export type InviteInfo = {
  roomId: string;
  name: string;
  avatarUrl: string;
  memberCount: number;
  joinApproval: boolean;
  status: 'member' | 'requested' | 'none';
};

export type JoinResult =
  | { status: 'joined'; room: Room }
  | { status: 'requested' };

export type RoomRead = {
  userId: string;
  name: string;
  avatarUrl?: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
};

export type RoomMessageSearch = {
  q?: string;
  senderId?: string;
  from?: string;
  to?: string;
};

export type RichInline =
  | { type: 'text'; text: string }
  | { type: 'bold' | 'italic' | 'strike'; children: RichInline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; url: string };

export type RichBlock =
  | { type: 'paragraph'; lines: RichInline[][] }
  | { type: 'code'; text: string }
  | { type: 'list'; ordered: boolean; items: RichInline[][] };

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

/** Payload socket `room.reads` (BE emit `{ roomId, reads }`, khác HTTP trả mảng). */
export type RoomReadsEvent = {
  roomId: string;
  reads: RoomRead[];
};

export type AgentPendingEvent = {
  roomId: string;
  agentName: string;
};

export type TypingEvent = {
  roomId: string;
  userId: string;
  name: string;
  typing: boolean;
};

export type RoomRemovedEvent = {
  roomId: string;
};

export type RoomClosedEvent = {
  roomId: string;
  reason: 'left' | 'dissolved';
};

export type RoomRequestsEvent = {
  roomId: string;
  pending: number;
  created: boolean;
};

export type RoomMute = {
  roomId: string;
  muted: boolean;
  mutedUntil: string | null;
};

export type GalleryImage = {
  id: string;
  filename: string;
  url: string;
  createdAt: string;
};

export type ChatFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number | null;
  url: string;
  createdAt: string;
};

export type PendingFile = {
  key: string;
  file: File;
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

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  team: string;
  avatarUrl?: string;
};

export type RoomHit = Pick<
  Room,
  | 'id'
  | 'title'
  | 'name'
  | 'type'
  | 'kind'
  | 'avatarUrl'
  | 'lastMessagePreview'
  | 'canDelete'
  | 'unreadCount'
  | 'peerUserId'
  | 'hidden'
>;

export type MessageHit = {
  id: string;
  roomId: string;
  content: string;
  authorName: string;
  createdAt: string;
  roomTitle: string;
  roomAvatarUrl: string;
  roomKind: 'direct' | 'group';
  peerUserId: string | null;
  canDelete: boolean;
};

export type RoomSearch = {
  users: DirectoryUser[];
  rooms: RoomHit[];
  messages: MessageHit[];
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

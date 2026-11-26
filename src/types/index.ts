export type PublicRole = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  team?: string;
  avatarUrl?: string;
  createdAt?: string;
  roles?: PublicRole[];
  permissions?: string[];
};

export type GroupRole = "owner" | "admin" | "member";

export type GroupSettings = {
  adminOnlySend: boolean;
  adminOnlyInfo: boolean;
  adminOnlyPin: boolean;
  adminOnlyTask: boolean;
  joinApproval: boolean;
};

export type Room = {
  id: string;
  title: string;
  name: string;
  type: "direct" | "group";
  kind: "direct" | "group";
  avatarUrl?: string;
  lastMessagePreview: string;
  updatedAt: string;
  canDelete: boolean;
  createdById: string | null;
  unreadCount: number;
  peerUserId: string | null;
  /** DM mà người xem đã chặn đối phương; có ở GET /rooms. */
  blockedByMe?: boolean;
  /** DM mà đối phương đã chặn người xem (không gửi tin được); có ở GET /rooms. */
  blockedMe?: boolean;
  memberIds?: string[];
  /** Có ở GET /rooms; kết quả tìm kiếm và room.updated không có. */
  muted?: boolean;
  mutedUntil?: string | null;
  pinned?: boolean;
  hidden?: boolean;
  markedUnread?: boolean;
  /** Bị tag (@tên hoặc @all) trong tin chưa đọc; có ở GET /rooms. */
  mentioned?: boolean;
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
  reminderId?: string;
  noteId?: string;
};

export type ToolKind = "poll" | "reminder" | "note" | "task";

export type TaskStatus = "open" | "done" | "cancelled";

export type TaskScope = "all" | "assigned" | "created";

export type MyTasksQuery = {
  scope: TaskScope;
  from?: string;
  to?: string;
  noDue?: boolean;
};

/** Kỳ của việc lặp lại chưa tạo, do BE tính; chưa là việc thật nên không thao tác trạng thái được. */
export type PlannedTask = {
  seriesId: string;
  title: string;
  dueAt: string;
  roomId: string;
  /** Rỗng với phòng 1-1. */
  roomName: string;
  frequency: TaskFrequency;
  endsAt: string | null;
  creator: TaskPerson;
  assignee: TaskPerson;
};

export type TaskRoom = {
  roomId: string;
  /** Rỗng với phòng 1-1. */
  roomName: string;
  creator: TaskPerson;
  assignee: TaskPerson;
};

export type TaskFrequency = "weekly" | "monthly";

export type TaskSeriesInfo = {
  id: string;
  frequency: TaskFrequency;
  endsAt: string | null;
  stopped: boolean;
};

export type TaskPerson = {
  id: string;
  name: string;
  avatarUrl: string;
};

/** Việc gắn trong tin nhắn; payload phát chung cho cả phòng nên không có quyền theo người xem. */
export type MessageTask = {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  assigneeCanCancel: boolean;
  dueAt: string | null;
  creatorId: string;
  assigneeId: string;
  creatorName: string;
  assigneeName: string;
  series: TaskSeriesInfo | null;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  assigneeCanCancel: boolean;
  dueAt: string | null;
  roomId: string;
  /** Rỗng với phòng 1-1. */
  roomName: string;
  messageId: string | null;
  /** Tin việc đã bị thu hồi: việc chỉ còn để xem, không thao tác được. */
  recalled: boolean;
  series: TaskSeriesInfo | null;
  creator: TaskPerson;
  assignee: TaskPerson;
  createdAt: string;
};

export type TaskEvent = {
  action: "created" | "updated";
  actorId: string;
  actorName: string;
  actorAvatarUrl: string;
  highlightMessageId: string | null;
  task: Task;
};

export type Reminder = {
  id: string;
  roomId: string;
  title: string;
  remindAt: string;
  repeat: "none" | "daily" | "weekly";
  creatorId: string;
  creatorName: string;
};

export type RoomNote = {
  id: string;
  roomId: string;
  title: string;
  content: string;
  creatorId: string;
  creatorName: string;
  updatedById: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomRefreshEvent = {
  roomId: string;
};

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
  role: "user" | "agent" | "system";
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
  rich?: RichPayload | null;
  type?: string;
  task?: MessageTask | null;
  createdAt: string;
  /** Mã máy gửi tự sinh; BE trả lại trong sự kiện socket `message` để thay đúng tin tạm. */
  clientId?: string;
  /** Chỉ có ở tin tạm (chưa có id thật): đang gửi hoặc gửi lỗi. */
  sendState?: 'sending' | 'failed';
  /** Câu lỗi server của tin tạm gửi hỏng. */
  sendError?: string;
};

export type CallMode = "audio" | "video";
export type CallKind = "direct" | "group";
export type CallStatus =
  | "active"
  | "ended"
  | "missed"
  | "rejected"
  | "busy"
  | "cancelled";

/** Tin có cấu trúc (BE: Message.rich). `content` của tin luôn có câu dự phòng cho app cũ. */
export type RichPayload =
  | { type: "sticker"; id: string }
  | { type: "location"; lat: number; lng: number; label?: string }
  | { type: "card"; userId: string }
  | { type: "meeting"; code: string; title: string }
  | {
      type: "call";
      callId: string;
      mode: CallMode;
      kind: CallKind;
      status: CallStatus;
      durationSec?: number;
    };

export type CallPeer = {
  socketId: string;
  userId: string;
  name: string;
  avatarUrl: string;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
};

export type CallIncomingEvent = {
  callId: string;
  roomId: string;
  roomTitle: string;
  roomAvatarUrl: string;
  kind: CallKind;
  mode: CallMode;
  callerId: string;
  callerName: string;
  callerAvatarUrl: string;
};

export type CallStartedEvent = CallIncomingEvent & {
  micOn: boolean;
  camOn: boolean;
  connectedAt?: number | null;
};

export type CallPeerLeftEvent = {
  callId: string;
  socketId: string;
  userId?: string;
};

export type CallPeerMediaEvent = {
  callId: string;
  socketId: string;
  userId: string;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
};

export type CallSignalPayload = {
  type: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type CallSignalEvent = {
  callId: string;
  from: string;
  userId?: string;
  name?: string;
  avatarUrl?: string;
  payload: CallSignalPayload;
};

export type CallEndedEvent = {
  callId: string;
  roomId?: string;
  reason: CallStatus;
  durationSec?: number;
};

export type CallAnsweredElsewhereEvent = {
  callId: string;
  acceptedBySocketId: string;
};

export type CallErrorEvent = {
  message: string;
  /** Có khi BE từ chối cho vào một cuộc cụ thể (vd máy khác của mình đang ở cuộc gọi khác) */
  callId?: string;
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
  status: "member" | "requested" | "none";
};

export type JoinResult =
  | { status: "joined"; room: Room }
  | { status: "requested" };

export type RoomRead = {
  userId: string;
  name: string;
  avatarUrl?: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  /** Mốc "đã nhận"; BE cũ không có. */
  lastDeliveredAt?: string | null;
};

export type RoomMessageSearch = {
  q?: string;
  senderId?: string;
  from?: string;
  to?: string;
};

export type RichInline =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "strike"; children: RichInline[] }
  | { type: "code"; text: string }
  | { type: "link"; url: string };

export type RichBlock =
  | { type: "paragraph"; lines: RichInline[][] }
  | { type: "code"; text: string }
  | { type: "list"; ordered: boolean; items: RichInline[][] };

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
  reason: "left" | "dissolved";
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

/** Nhóm loại tài liệu để lọc ở tab "Tệp từ chat" của Docs */
export type ChatDocType = 'pdf' | 'word' | 'excel' | 'slide' | 'archive' | 'other';

/** Tài liệu đã gửi trong một tin nhắn, kèm hội thoại và người gửi */
export type ChatDocFile = {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
  room: { id: string; title: string; kind: 'direct' | 'group'; avatarUrl: string };
  sender: { id: string | null; name: string; avatarUrl: string };
};

export type ChatDocQuery = { q: string; type: ChatDocType | null; roomId: string | null };

export type ChatDocPage = { items: ChatDocFile[]; nextCursor: string | null };

/** Google của người đang đăng nhập + Drive công ty có dùng được không */
export type DocsGoogleStatus = { ready: boolean; connected: boolean; email: string; drive: boolean };

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
  /** Từ hồ sơ nhân sự (rỗng nếu chưa có). */
  department?: string;
  departmentGroup?: string;
  /** Chỉ có ở GET /users/:id. */
  jobTitle?: string;
  phone?: string;
  /** Có ở GET /users/:id: người xem đã chặn người này. */
  blockedByMe?: boolean;
  /** Có ở GET /users/:id: người này đã chặn người xem. */
  blockedMe?: boolean;
};

/** GET /users/:id/common-rooms: nhóm mà hai người cùng tham gia. */
export type CommonRoom = {
  id: string;
  name: string;
  avatarUrl: string;
  memberCount: number;
};

/** GET /users/blocked */
export type BlockedUser = {
  id: string;
  name: string;
  avatarUrl: string;
};

/** GET /users/teams: số người của mỗi team (không tính người xem). */
export type TeamCount = {
  team: string;
  count: number;
};

export type RoomHit = Pick<
  Room,
  | "id"
  | "title"
  | "name"
  | "type"
  | "kind"
  | "avatarUrl"
  | "lastMessagePreview"
  | "canDelete"
  | "unreadCount"
  | "peerUserId"
  | "hidden"
>;

export type MessageHit = {
  id: string;
  roomId: string;
  content: string;
  authorName: string;
  createdAt: string;
  roomTitle: string;
  roomAvatarUrl: string;
  roomKind: "direct" | "group";
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
  isLive?: boolean;
  participants: { id: string; name: string; avatarUrl?: string }[];
};

export type MeetingPeer = {
  socketId: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
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

export type DocKind =
  | "doc"
  | "sheet"
  | "slides"
  | "form"
  | "mind"
  | "folder"
  | "board"
  | "flow";

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
  myRole: DocRole;
  /** thư mục team; null = chưa xếp */
  folderId: string | null;
  folderName: string;
};

/** GET /docs/folders — danh sách phẳng, dựng cây bằng parentId */
export type DocFolder = { id: string; name: string; parentId: string | null; docCount: number };

export type DocTemplate = 'blank' | 'meeting' | 'weekly' | 'plan' | 'proposal' | 'oneonone' | 'handover';

/** Mức quyền với tài liệu; chia sẻ cho nhóm chat chỉ có sửa hoặc xem */
export type DocRole = 'owner' | 'writer' | 'reader';
export type ShareRole = 'writer' | 'reader';

/** GET /docs/card — thẻ tài liệu cho link Google trong một nhóm chat */
export type DocCard =
  | { found: false }
  | {
      found: true;
      doc: { id: string; title: string; kind: DocKind; owner: { id: string; name: string; avatarUrl?: string } };
      myRole: DocRole | null;
      canShare: boolean;
      roomShare: ShareRole | null;
      missing: number;
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

/** Điền sẵn cho form giao việc khi mở từ lịch. */
export type AssignKind = 'group' | 'direct';

export type TaskPreset = {
  dueAt?: string;
  title?: string;
  kind?: AssignKind;
  roomId?: string;
  roomLabel?: string;
  assigneeId?: string;
  notes?: string;
  repeat?: TaskFrequency;
};

export type NewsBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'image'; imageId: string; caption: string };

export type NewsImage = {
  id: string;
  url: string;
  displayUrl: string;
  thumbUrl: string;
};

export type NewsReactionKind = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

/** Bài kéo từ Page Facebook; `name` là tên Page lúc kéo, `url` là bài gốc */
export type NewsSource = { kind: 'facebook'; name: string; url: string };

export type NewsUserRef = { id: string; name: string; avatarUrl: string };

export type NewsCard = {
  id: string;
  title: string;
  excerpt: string;
  cover: NewsImage | null;
  author: NewsUserRef | null;
  source: NewsSource | null;
  status: 'draft' | 'published';
  publishedAt: string | null;
  updatedAt: string;
  reactions: { total: number; top: NewsReactionKind[] };
  commentCount: number;
};

export type NewsReactionSummary = {
  total: number;
  counts: Record<NewsReactionKind, number>;
  top: NewsReactionKind[];
  mine: NewsReactionKind | null;
};

export type NewsPost = NewsCard & {
  reactions: NewsReactionSummary;
  blocks: NewsBlock[];
  images: NewsImage[];
};

export type NewsCardPage = { items: NewsCard[]; nextCursor: string | null };

export type NewsReactionUser = { kind: NewsReactionKind; user: NewsUserRef };

export type NewsComment = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  author: NewsUserRef | null;
  createdAt: string;
  editedAt: string | null;
  replies: NewsComment[];
  replyCount: number;
};

export type NewsCommentPage = { items: NewsComment[]; nextCursor: string | null };

export type NewsFeedPost = NewsPost & { comments: NewsCommentPage };

export type NewsFeedPage = { items: NewsFeedPost[]; nextCursor: string | null };

export type NewsPublishedEvent = { id: string; title: string; source?: string };

export type NewsReactionsEvent = Omit<NewsReactionSummary, 'mine'> & {
  postId: string;
  userId: string;
  kind: NewsReactionKind | null;
};

export type NewsCommentsEvent = { postId: string; commentCount: number };

export type NewsFacebookStatus = { ready: boolean; webhookReady: boolean };

export type NewsFacebookPage = {
  id: string;
  pageId: string;
  name: string;
  pictureUrl: string;
  enabled: boolean;
  webhookSubscribed: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  connectedBy: { id: string; name: string } | null;
  createdAt: string;
};

export type NewsPostInput = {
  title: string;
  blocks: NewsBlock[];
  coverImageId: string | null;
  expectedUpdatedAt: string;
};

export type GalleryPhotoStatus = 'pending' | 'approved' | 'rejected';
export type GalleryVisibility = 'public' | 'private';

export type GalleryPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  filename: string;
  bytes: number;
  caption: string;
  status: GalleryPhotoStatus;
  visibility: GalleryVisibility;
  albumId: string | null;
  uploader: { id: string; name: string; avatarUrl: string } | null;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  canEdit: boolean;
  canEditDetails: boolean;
  canDelete: boolean;
};

export type GalleryPhotoPage = { items: GalleryPhoto[]; nextCursor: string | null };

export type GalleryAlbum = {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  photoCount: number;
};

export type GalleryAccess = { canReview: boolean; canReadPrivate: boolean };

export type GalleryPhotoInput = {
  albumId?: string;
  caption?: string;
  visibility?: GalleryVisibility;
};

export type GalleryPhotoPatch = {
  albumId?: string | null;
  caption?: string;
  visibility?: GalleryVisibility;
};

export type GalleryPendingEvent = { pending: number; added: boolean };

export type GalleryReviewedEvent = {
  photoId: string;
  status: 'approved' | 'rejected';
  rejectReason: string | null;
};

export type LastSeenMap = Record<string, string>;

export type PresenceLastSeenEvent = {
  userId: string;
  lastSeenAt: string;
};

/** Ai đó vừa đổi tên hoặc ảnh đại diện (tự đổi, admin hay HR sửa). */
export type UserUpdatedEvent = {
  id: string;
  name: string;
  avatarUrl: string;
};

import { AdminRole, AdminUser, UserAccess } from "@/features/admin/types";
import type { EmployeeProfile } from "@/features/hr/types";
import type {
  ChatFile,
  ChatMessage,
  ConversationLabel,
  DirectoryUser,
  DocItem,
  GalleryAccess,
  GalleryAlbum,
  GalleryImage,
  GalleryPhoto,
  GalleryPhotoInput,
  GalleryPhotoPage,
  GalleryPhotoPatch,
  GroupSettings,
  InviteInfo,
  JoinRequest,
  JoinResult,
  LinkPreview,
  MailAccount,
  MailItem,
  MailMessage,
  Meeting,
  MessagesPage,
  MyTasksQuery,
  PlannedTask,
  Reminder,
  RichPayload,
  Room,
  RoomLink,
  RoomMember,
  RoomMessageSearch,
  RoomMute,
  RoomNote,
  RoomPrefs,
  RoomRead,
  RoomSearch,
  RoomsPage,
  Task,
  TaskFrequency,
  TaskRoom,
  TaskStatus,
  TeamCount,
  User,
} from "@/types";
import { API_URL, authHeaders, authedFetch, setCsrf } from "./session";

type AuthSession = { user: User; csrfToken?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authedFetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function keepCsrf<T extends { csrfToken?: string }>(pending: Promise<T>) {
  const body = await pending;
  if (body.csrfToken) {
    setCsrf(body.csrfToken);
  }
  return body;
}

async function errorMessage(response: Response) {
  let message = response.statusText;
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    message = (await response.text()) || message;
  }
  return message;
}

async function uploadChatFile(
  roomId: string,
  path: "files" | "voice",
  blob: Blob,
  filename: string,
): Promise<ChatFile> {
  const body = new FormData();
  body.append("file", blob, filename);
  const response = await authedFetch(`${API_URL}/rooms/${roomId}/${path}`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return response.json() as Promise<ChatFile>;
}

export function fileSrc(url: string) {
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/api/")) {
    return url;
  }
  return `${API_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export const api = {
  login(email: string, password: string) {
    return keepCsrf(
      request<AuthSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    );
  },
  register(name: string, email: string, password: string) {
    return keepCsrf(
      request<AuthSession>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    );
  },
  session() {
    return keepCsrf(request<AuthSession>("/auth/session"));
  },
  async logout() {
    await request<void>("/auth/logout", { method: "POST" });
    setCsrf(null);
  },
  me() {
    return request<User>("/auth/me");
  },
  async socketToken() {
    const { token } = await request<{ token: string }>("/auth/socket-token");
    return token;
  },
  updateProfile(payload: {
    name?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
  }) {
    return keepCsrf(
      request<AuthSession>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  },
  async uploadMyAvatar(file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await authedFetch(`${API_URL}/auth/me/avatar`, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<{ user: User }>;
  },
  async rooms(cursor?: string, limit = 50): Promise<RoomsPage> {
    const params = new URLSearchParams();
    if (limit) {
      params.set("limit", String(limit));
    }
    if (cursor) {
      params.set("cursor", cursor);
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await request<
      | Room[]
      | { data: Room[]; meta?: { hasMore: boolean; nextCursor: string | null } }
    >(`/rooms${qs}`);
    if (Array.isArray(res)) {
      return { data: res, meta: { hasMore: false, nextCursor: null } };
    }
    return {
      data: res.data ?? [],
      meta: {
        hasMore: Boolean(res.meta?.hasMore),
        nextCursor: res.meta?.nextCursor ?? null,
      },
    };
  },
  async members(roomId: string) {
    const res = await request<RoomMember[] | { data: RoomMember[] }>(
      `/rooms/${roomId}/members`,
    );
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
  async messages(roomId: string, cursor?: string): Promise<MessagesPage> {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await request<
      | ChatMessage[]
      | {
          data: ChatMessage[];
          meta?: { hasMore: boolean; nextCursor: string | null };
        }
    >(`/rooms/${roomId}/messages${q}`);
    if (Array.isArray(res)) {
      return { data: res, meta: { hasMore: false, nextCursor: null } };
    }
    return {
      data: res.data ?? [],
      meta: {
        hasMore: Boolean(res.meta?.hasMore),
        nextCursor: res.meta?.nextCursor ?? null,
      },
    };
  },
  searchRoomMessages(
    roomId: string,
    params: RoomMessageSearch & { cursor?: string },
  ): Promise<MessagesPage> {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.senderId) sp.set("senderId", params.senderId);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (params.cursor) sp.set("cursor", params.cursor);
    const qs = sp.toString();
    return request<MessagesPage>(
      `/rooms/${roomId}/messages/search${qs ? `?${qs}` : ""}`,
    );
  },
  sendMessage(
    roomId: string,
    content: string,
    imageId?: string,
    replyToId?: string,
    fileId?: string,
    imageIds?: string[],
    rich?: RichPayload,
  ) {
    return request<ChatMessage>(`/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        imageId,
        replyToId,
        fileId,
        imageIds,
        rich,
      }),
    });
  },
  reactMessage(roomId: string, messageId: string, emoji: string) {
    return request<ChatMessage>(
      `/rooms/${roomId}/messages/${messageId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ emoji }),
      },
    );
  },
  uploadFile(roomId: string, file: File): Promise<ChatFile> {
    return uploadChatFile(roomId, "files", file, file.name);
  },
  uploadVoice(roomId: string, blob: Blob, filename: string): Promise<ChatFile> {
    return uploadChatFile(roomId, "voice", blob, filename);
  },
  async download(url: string): Promise<Blob> {
    const response = await fetch(fileSrc(url));
    if (!response.ok) {
      throw new Error("Không tải được tệp.");
    }
    return response.blob();
  },
  files(roomId: string) {
    return request<ChatFile[]>(`/rooms/${roomId}/files`);
  },
  users(q?: string, team?: string) {
    const params = new URLSearchParams();
    if (q?.trim()) {
      params.set("q", q.trim());
    }
    if (team) {
      params.set("team", team);
    }
    const query = params.toString();
    return request<DirectoryUser[]>(`/users${query ? `?${query}` : ""}`);
  },
  userTeams() {
    return request<TeamCount[]>("/users/teams");
  },
  blockUser(id: string) {
    return request<{ ok: boolean }>(`/users/${id}/block`, { method: "POST" });
  },
  unblockUser(id: string) {
    return request<{ ok: boolean }>(`/users/${id}/block`, { method: "DELETE" });
  },
  user(id: string) {
    return request<DirectoryUser>(`/users/${id}`);
  },
  room(roomId: string) {
    return request<Room>(`/rooms/${roomId}`);
  },
  searchRooms(q: string) {
    return request<RoomSearch>(
      `/rooms/search?q=${encodeURIComponent(q.trim())}`,
    );
  },
  createDirectRoom(userId: string) {
    return request<Room>("/rooms/direct", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  createGroupRoom(name: string, memberIds: string[]) {
    return request<Room>("/rooms", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    });
  },
  cloudRoom(): Promise<Room> {
    return request<Room>("/rooms/cloud", {
      method: "POST",
    });
  },
  addRoomMember(roomId: string, userId: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  removeRoomMember(roomId: string, userId: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/members/${userId}`, {
      method: "DELETE",
    });
  },
  setMemberRole(
    roomId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<RoomMember[]> {
    return request<RoomMember[]>(`/rooms/${roomId}/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
  transferOwner(roomId: string, userId: string): Promise<RoomMember[]> {
    return request<RoomMember[]>(`/rooms/${roomId}/owner`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  updatePermissions(
    roomId: string,
    patch: Partial<GroupSettings>,
  ): Promise<Room> {
    return request<Room>(`/rooms/${roomId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  getInvite(roomId: string): Promise<{ token: string | null }> {
    return request<{ token: string | null }>(`/rooms/${roomId}/invite`);
  },
  resetInvite(roomId: string): Promise<{ token: string }> {
    return request<{ token: string }>(`/rooms/${roomId}/invite`, {
      method: "POST",
    });
  },
  disableInvite(roomId: string): Promise<void> {
    return request<void>(`/rooms/${roomId}/invite`, {
      method: "DELETE",
    });
  },
  inviteInfo(token: string): Promise<InviteInfo> {
    return request<InviteInfo>(`/invites/${token}`);
  },
  joinByInvite(token: string): Promise<JoinResult> {
    return request<JoinResult>(`/invites/${token}/join`, {
      method: "POST",
    });
  },
  requestMember(roomId: string, userId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/rooms/${roomId}/join-requests`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  joinRequests(roomId: string): Promise<JoinRequest[]> {
    return request<JoinRequest[]>(`/rooms/${roomId}/join-requests`);
  },
  approveRequest(roomId: string, userId: string): Promise<RoomMember[]> {
    return request<RoomMember[]>(
      `/rooms/${roomId}/join-requests/${userId}/approve`,
      {
        method: "POST",
      },
    );
  },
  rejectRequest(roomId: string, userId: string): Promise<void> {
    return request<void>(`/rooms/${roomId}/join-requests/${userId}`, {
      method: "DELETE",
    });
  },
  deleteRoom(roomId: string) {
    return request<void>(`/rooms/${roomId}`, {
      method: "DELETE",
    });
  },
  leaveRoom(roomId: string) {
    return request<void>(`/rooms/${roomId}/leave`, {
      method: "POST",
    });
  },
  updateRoom(roomId: string, name: string) {
    return request<Room>(`/rooms/${roomId}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },
  async uploadRoomAvatar(roomId: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await authedFetch(`${API_URL}/rooms/${roomId}/avatar`, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<Room>;
  },
  updateNickname(roomId: string, userId: string, nickname: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/nickname`, {
      method: "PATCH",
      body: JSON.stringify({ userId, nickname }),
    });
  },
  muteRoom(roomId: string, muted: boolean, minutes?: number) {
    return request<RoomMute>(`/rooms/${roomId}/mute`, {
      method: "PATCH",
      body: JSON.stringify({ muted, ...(minutes != null ? { minutes } : {}) }),
    });
  },
  updateRoomPrefs(roomId: string, patch: Partial<Omit<RoomPrefs, "roomId">>) {
    return request<RoomPrefs>(`/rooms/${roomId}/prefs`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  labels(): Promise<ConversationLabel[]> {
    return request<ConversationLabel[]>("/labels");
  },
  createLabel(input: {
    name: string;
    color: string;
  }): Promise<ConversationLabel> {
    return request<ConversationLabel>("/labels", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateLabel(
    id: string,
    input: Partial<{ name: string; color: string }>,
  ): Promise<ConversationLabel> {
    return request<ConversationLabel>(`/labels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteLabel(id: string): Promise<void> {
    return request<void>(`/labels/${id}`, {
      method: "DELETE",
    });
  },
  links(roomId: string) {
    return request<RoomLink[]>(`/rooms/${roomId}/links`);
  },
  pins(roomId: string) {
    return request<ChatMessage[]>(`/rooms/${roomId}/pins`);
  },
  pinMessage(roomId: string, messageId: string, pinned: boolean) {
    return request<ChatMessage>(`/rooms/${roomId}/messages/${messageId}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    });
  },
  recallMessage(roomId: string, messageId: string) {
    return request<ChatMessage>(
      `/rooms/${roomId}/messages/${messageId}/recall`,
      {
        method: "POST",
      },
    );
  },
  editMessage(roomId: string, messageId: string, content: string) {
    return request<ChatMessage>(`/rooms/${roomId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  },
  deleteMessage(roomId: string, messageId: string) {
    return request<{ ok: boolean; id: string }>(
      `/rooms/${roomId}/messages/${messageId}`,
      {
        method: "DELETE",
      },
    );
  },
  gallery(roomId: string) {
    return request<GalleryImage[]>(`/rooms/${roomId}/images`);
  },
  reads(roomId: string) {
    return request<RoomRead[]>(`/rooms/${roomId}/reads`);
  },
  markRead(roomId: string, messageId: string) {
    return request<RoomRead[]>(`/rooms/${roomId}/read`, {
      method: "POST",
      body: JSON.stringify({ messageId }),
    });
  },
  gifs(query?: string) {
    const q = query?.trim();
    return request<{ items: { id: string; url: string; preview: string }[] }>(
      `/gifs${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ).then((body) => body.items);
  },
  attachRemoteImage(roomId: string, url: string) {
    return request<GalleryImage>(`/rooms/${roomId}/images/remote`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },
  linkPreview(url: string): Promise<LinkPreview> {
    return request<LinkPreview>(`/link-preview?url=${encodeURIComponent(url)}`);
  },
  async uploadImage(roomId: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await authedFetch(`${API_URL}/rooms/${roomId}/images`, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<GalleryImage>;
  },
  listMeetings() {
    return request<{ upcoming: Meeting[]; history: Meeting[] }>("/meetings");
  },
  getMeetingByCode(code: string) {
    return request<Meeting>(
      `/meetings/code/${encodeURIComponent(code.trim())}`,
    );
  },
  createMeeting(payload?: { title?: string; scheduledAt?: string }) {
    return request<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    });
  },
  updateMeeting(
    id: string,
    payload: { title?: string; scheduledAt?: string },
  ) {
    return request<Meeting>(`/meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteMeeting(id: string) {
    return request<{ ok: boolean }>(`/meetings/${id}`, {
      method: "DELETE",
    });
  },
  joinMeeting(code: string) {
    return request<Meeting>("/meetings/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
  saveMeetingNotes(id: string, notes: string) {
    return request<Meeting>(`/meetings/${id}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  },
  leaveMeeting(id: string) {
    return request<Meeting>(`/meetings/${id}/leave`, { method: "POST" });
  },
  endMeeting(id: string) {
    return request<Meeting>(`/meetings/${id}/end`, { method: "POST" });
  },
  closeMeetingOnExit(id: string, asHost: boolean) {
    void fetch(`${API_URL}/meetings/${id}/${asHost ? "end" : "leave"}`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      keepalive: true,
    });
  },
  googleMailUrl() {
    return request<{ url: string }>("/mail/google");
  },
  listMailAccounts() {
    return request<MailAccount[]>("/mail/accounts");
  },
  connectMail(payload: {
    email: string;
    password: string;
    imapHost?: string;
    imapPort?: number;
    displayName?: string;
  }) {
    return request<MailAccount>("/mail/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  removeMailAccount(id: string) {
    return request<{ ok: boolean }>(`/mail/accounts/${id}`, {
      method: "DELETE",
    });
  },
  mailInbox(id: string, limit = 40) {
    return request<{ total: number; items: MailItem[] }>(
      `/mail/accounts/${id}/inbox?limit=${limit}`,
    );
  },
  mailMessage(id: string, uid: string) {
    return request<MailMessage>(
      `/mail/accounts/${id}/messages/${encodeURIComponent(uid)}`,
    );
  },
  galleryAccess() {
    return request<GalleryAccess>("/gallery/access");
  },
  galleryAlbums() {
    return request<GalleryAlbum[]>("/gallery/albums");
  },
  createGalleryAlbum(input: { name: string; description?: string }) {
    return request<GalleryAlbum>("/gallery/albums", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateGalleryAlbum(id: string, input: { name?: string; description?: string }) {
    return request<GalleryAlbum>(`/gallery/albums/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteGalleryAlbum(id: string) {
    return request<void>(`/gallery/albums/${id}`, { method: "DELETE" });
  },
  galleryPhotos(query: { albumId?: string; cursor?: string }) {
    const params = new URLSearchParams();
    if (query.albumId) {
      params.set("albumId", query.albumId);
    }
    if (query.cursor) {
      params.set("cursor", query.cursor);
    }
    return request<GalleryPhotoPage>(`/gallery/photos?${params.toString()}`);
  },
  myGalleryPhotos(query: { status?: string; cursor?: string }) {
    const params = new URLSearchParams();
    if (query.status) {
      params.set("status", query.status);
    }
    if (query.cursor) {
      params.set("cursor", query.cursor);
    }
    return request<GalleryPhotoPage>(`/gallery/photos/mine?${params.toString()}`);
  },
  async submitGalleryPhoto(blob: Blob, filename: string, input: GalleryPhotoInput) {
    const body = new FormData();
    if (input.albumId) {
      body.append("albumId", input.albumId);
    }
    if (input.caption) {
      body.append("caption", input.caption);
    }
    if (input.visibility) {
      body.append("visibility", input.visibility);
    }
    body.append("file", blob, filename);
    const response = await authedFetch(`${API_URL}/gallery/photos`, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<GalleryPhoto>;
  },
  submitGalleryPhotoFromChat(imageId: string, input: GalleryPhotoInput) {
    return request<GalleryPhoto>("/gallery/photos/from-chat", {
      method: "POST",
      body: JSON.stringify({ imageId, ...input }),
    });
  },
  updateGalleryPhoto(id: string, patch: GalleryPhotoPatch) {
    return request<GalleryPhoto>(`/gallery/photos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteGalleryPhoto(id: string) {
    return request<void>(`/gallery/photos/${id}`, { method: "DELETE" });
  },
  galleryReviewPhotos(cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return request<GalleryPhotoPage>(`/gallery/review/photos${query}`);
  },
  galleryReviewCount() {
    return request<{ pending: number }>("/gallery/review/count");
  },
  approveGalleryPhoto(id: string, input: GalleryPhotoPatch) {
    return request<GalleryPhoto>(`/gallery/photos/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  rejectGalleryPhoto(id: string, reason: string) {
    return request<GalleryPhoto>(`/gallery/photos/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  googleSheetsStatus() {
    return request<{ ready: boolean; connected: boolean; email: string }>(
      "/docs/google/status",
    );
  },
  googleSheetsStart(intent = "connect") {
    return request<{ url: string }>(
      `/docs/google?intent=${encodeURIComponent(intent)}`,
    );
  },
  listDocs(tab = "recent", q = "") {
    const query = new URLSearchParams({ tab, q });
    return request<DocItem[]>(`/docs?${query.toString()}`);
  },
  createDoc(payload?: {
    title?: string;
    kind?: DocItem["kind"];
    template?: "blank" | "meeting" | "weekly";
    content?: string;
  }) {
    return request<DocItem>("/docs", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    });
  },
  getDoc(id: string) {
    return request<DocItem>(`/docs/${id}`);
  },
  updateDoc(
    id: string,
    payload: {
      title?: string;
      content?: string;
      folder?: string;
      starred?: boolean;
    },
  ) {
    return request<DocItem>(`/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  removeDoc(id: string) {
    return request<{ ok: boolean }>(`/docs/${id}`, { method: "DELETE" });
  },
  // lấy danh sách phòng ban
  departments() {
    return request<
      {
        id: string;
        name: string;
        code: string;
        status: "active" | "inactive";
        groups: {
          id: string;
          name: string;
          leaderName: string | null;
          memberCount: number;
          status: "active" | "inactive";
        }[];
      }[]
    >("/departments");
  },
  // tạo phòng ban
  createDepartment(payload: {
    name: string;
    code: string;
    status?: "active" | "inactive";
  }) {
    return request<{
      id: string;
      name: string;
      code: string;
      status: "active" | "inactive";
      groups: [];
    }>("/departments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  // cập nhật phòng ban
  updateDepartment(
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      status: "active" | "inactive";
    }>,
  ) {
    return request<{
      id: string;
      name: string;
      code: string;
      status: "active" | "inactive";
      groups: [];
    }>(`/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  // xóa phòng ban
  deleteDepartment(id: string) {
    return request<void>(`/departments/${id}`, { method: "DELETE" });
  },
  createDepartmentGroup(
    departmentId: string,
    payload: {
      name: string;
      leaderName?: string;
      memberCount?: number;
      status?: "active" | "inactive";
    },
  ) {
    return request<{
      id: string;
      name: string;
      leaderName: string | null;
      memberCount: number;
      status: "active" | "inactive";
    }>(`/departments/${departmentId}/groups`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateDepartmentGroup(
    departmentId: string,
    groupId: string,
    payload: Partial<{
      name: string;
      leaderName: string | null;
      memberCount: number;
      status: "active" | "inactive";
    }>,
  ) {
    return request<{
      id: string;
      name: string;
      leaderName: string | null;
      memberCount: number;
      status: "active" | "inactive";
    }>(`/departments/${departmentId}/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteDepartmentGroup(departmentId: string, groupId: string) {
    return request<void>(`/departments/${departmentId}/groups/${groupId}`, {
      method: "DELETE",
    });
  },
  createPoll(
    roomId: string,
    input: {
      question: string;
      options: string[];
      multiple: boolean;
      allowAddOptions: boolean;
      closesAt?: string;
    },
  ) {
    return request<ChatMessage>(`/rooms/${roomId}/polls`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  votePoll(roomId: string, pollId: string, optionIds: string[]) {
    return request<ChatMessage>(`/rooms/${roomId}/polls/${pollId}/votes`, {
      method: "PUT",
      body: JSON.stringify({ optionIds }),
    });
  },
  addPollOption(roomId: string, pollId: string, text: string) {
    return request<ChatMessage>(`/rooms/${roomId}/polls/${pollId}/options`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  closePoll(roomId: string, pollId: string) {
    return request<ChatMessage>(`/rooms/${roomId}/polls/${pollId}/close`, {
      method: "POST",
    });
  },
  createTask(
    roomId: string,
    input: {
      title: string;
      assigneeId: string;
      notes?: string;
      dueAt?: string;
      repeat?: { frequency: TaskFrequency; endsAt?: string };
    },
  ) {
    return request<ChatMessage>(`/rooms/${roomId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateTask(
    taskId: string,
    patch: { status?: TaskStatus; title?: string; notes?: string; dueAt?: string | null },
  ) {
    return request<ChatMessage>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  stopTaskSeries(seriesId: string) {
    return request<{ ok: boolean }>(`/task-series/${seriesId}/stop`, { method: 'POST' });
  },
  roomTasks(roomId: string) {
    return request<Task[]>(`/rooms/${roomId}/tasks`);
  },
  myTasks(query: MyTasksQuery) {
    const params = new URLSearchParams({ scope: query.scope });
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.noDue) params.set('noDue', 'true');
    return request<Task[]>(`/tasks/mine?${params.toString()}`);
  },
  plannedTasks(query: MyTasksQuery) {
    const params = new URLSearchParams({
      scope: query.scope,
      from: query.from ?? '',
      to: query.to ?? '',
    });
    return request<PlannedTask[]>(`/tasks/mine/planned?${params.toString()}`);
  },
  myTaskRooms() {
    return request<TaskRoom[]>('/tasks/mine/rooms');
  },
  reminders(roomId: string) {
    return request<Reminder[]>(`/rooms/${roomId}/reminders`);
  },
  createReminder(
    roomId: string,
    input: { title: string; remindAt: string; repeat: string },
  ) {
    return request<Reminder>(`/rooms/${roomId}/reminders`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateReminder(
    roomId: string,
    reminderId: string,
    input: { title?: string; remindAt?: string; repeat?: string },
  ) {
    return request<Reminder>(`/rooms/${roomId}/reminders/${reminderId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteReminder(roomId: string, reminderId: string) {
    return request<void>(`/rooms/${roomId}/reminders/${reminderId}`, {
      method: "DELETE",
    });
  },
  notes(roomId: string) {
    return request<RoomNote[]>(`/rooms/${roomId}/notes`);
  },
  createNote(roomId: string, input: { title: string; content: string }) {
    return request<RoomNote>(`/rooms/${roomId}/notes`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateNote(
    roomId: string,
    noteId: string,
    input: { title?: string; content?: string },
  ) {
    return request<RoomNote>(`/rooms/${roomId}/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteNote(roomId: string, noteId: string) {
    return request<void>(`/rooms/${roomId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },

  permissionsCatalog() {
    return request<
      {
        key: string;
        label: string;
        items: { key: string; label: string }[];
      }[]
    >("/permissions");
  },
  roles() {
    return request<AdminRole[]>("/roles");
  },
  createRole(input: {
    name: string;
    description?: string;
    cloneFromRoleId?: string;
    permissions?: string[];
  }) {
    return request<AdminRole>("/roles", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateRole(id: string, input: { name?: string; description?: string }) {
    return request<AdminRole>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  setRolePermissions(id: string, permissions: string[]) {
    return request<AdminRole>(`/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    });
  },
  deleteRole(id: string) {
    return request<void>(`/roles/${id}`, { method: "DELETE" });
  },
  adminUsers() {
    return request<AdminUser[]>("/admin/users");
  },
  createAdminUser(input: {
    name: string;
    email: string;
    password?: string;
    team?: string;
    roleIds?: string[];
  }) {
    return request<
      AdminUser & {
        temporaryPassword?: string;
      }
    >("/admin/users", { method: "POST", body: JSON.stringify(input) });
  },
  updateAdminUser(
    id: string,
    input: { name?: string; team?: string; isActive?: boolean },
  ) {
    return request<AdminUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deactivateAdminUser(id: string) {
    return request<AdminUser>(`/admin/users/${id}/deactivate`, {
      method: "POST",
    });
  },
  resetAdminUserPassword(id: string) {
    return request<{ temporaryPassword: string }>(
      `/admin/users/${id}/reset-password`,
      { method: "POST" },
    );
  },
  adminUserAccess(id: string) {
    return request<UserAccess>(`/admin/users/${id}/access`);
  },
  setAdminUserRoles(id: string, roleIds: string[]) {
    return request<AdminUser>(`/admin/users/${id}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roleIds }),
    });
  },
  setAdminUserPermissions(
    id: string,
    items: { permission: string; effect: "allow" | "deny" }[],
  ) {
    return request<UserAccess>(`/admin/users/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  employees() {
    return request<EmployeeProfile[]>("/employees");
  },
  employee(id: string) {
    return request<EmployeeProfile>(`/employees/${id}`);
  },
  createEmployee(
    body: Partial<EmployeeProfile> & { password?: string; roleIds?: string[] },
  ) {
    return request<EmployeeProfile & { temporaryPassword?: string }>(
      "/employees",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },
  updateEmployee(id: string, body: Partial<EmployeeProfile>) {
    return request<EmployeeProfile>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

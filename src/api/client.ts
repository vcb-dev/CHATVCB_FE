import type {
  ChatFile,
  ChatMessage,
  DirectoryUser,
  DocItem,
  GalleryImage,
  MailAccount,
  MailItem,
  MailMessage,
  Meeting,
  MessagesPage,
  Room,
  RoomsPage,
  RoomLink,
  RoomMember,
  RoomMute,
  RoomRead,
  RoomSearch,
  User,
} from '@/types';

const API_URL = (import.meta.env.VITE_APP_URL ?? '/api').replace(/\/$/, '');

function authHeader(): HeadersInit {
  const token = localStorage.getItem('chatvcb.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...init?.headers,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem('chatvcb.token');
    localStorage.removeItem('chatvcb.user');
    window.dispatchEvent(new CustomEvent('chatvcb:unauthorized'));
  }
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function errorMessage(response: Response) {
  let message = response.statusText;
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    message = (await response.text()) || message;
  }
  return message;
}

export function fileSrc(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/api/')) {
    return url;
  }
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  register(name: string, email: string, password: string) {
    return request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },
  me() {
    return request<User>('/auth/me');
  },
  updateProfile(payload: {
    name?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
  }) {
    return request<{ token: string; user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  async uploadMyAvatar(file: File) {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_URL}/auth/me/avatar`, {
      method: 'POST',
      headers: authHeader(),
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<{ token: string; user: User }>;
  },
  async rooms(cursor?: string, limit = 50): Promise<RoomsPage> {
    const params = new URLSearchParams();
    if (limit) {
      params.set('limit', String(limit));
    }
    if (cursor) {
      params.set('cursor', cursor);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<
      Room[] | { data: Room[]; meta?: { hasMore: boolean; nextCursor: string | null } }
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
    const res = await request<RoomMember[] | { data: RoomMember[] }>(`/rooms/${roomId}/members`);
    return Array.isArray(res) ? res : res?.data ?? [];
  },
  async messages(roomId: string, cursor?: string): Promise<MessagesPage> {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const res = await request<
      | ChatMessage[]
      | { data: ChatMessage[]; meta?: { hasMore: boolean; nextCursor: string | null } }
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
  sendMessage(
    roomId: string,
    content: string,
    imageId?: string,
    replyToId?: string,
    fileId?: string,
    imageIds?: string[],
  ) {
    return request<ChatMessage>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, imageId, replyToId, fileId, imageIds }),
    });
  },
  reactMessage(roomId: string, messageId: string, emoji: string) {
    return request<ChatMessage>(`/rooms/${roomId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },
  async uploadFile(roomId: string, file: File): Promise<ChatFile> {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_URL}/rooms/${roomId}/files`, {
      method: 'POST',
      headers: authHeader(),
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<ChatFile>;
  },
  async uploadVoice(roomId: string, blob: Blob, filename: string): Promise<ChatFile> {
    const body = new FormData();
    body.append('file', blob, filename);
    const response = await fetch(`${API_URL}/rooms/${roomId}/voice`, {
      method: 'POST',
      headers: authHeader(),
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<ChatFile>;
  },
  async download(url: string): Promise<Blob> {
    const response = await fetch(fileSrc(url));
    if (!response.ok) {
      throw new Error('Không tải được tệp.');
    }
    return response.blob();
  },
  files(roomId: string) {
    return request<ChatFile[]>(`/rooms/${roomId}/files`);
  },
  users(q?: string) {
    const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    return request<DirectoryUser[]>(`/users${query}`);
  },
  user(id: string) {
    return request<DirectoryUser>(`/users/${id}`);
  },
  searchRooms(q: string) {
    return request<RoomSearch>(`/rooms/search?q=${encodeURIComponent(q.trim())}`);
  },
  createDirectRoom(userId: string) {
    return request<Room>('/rooms/direct', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  createGroupRoom(name: string, memberIds: string[]) {
    return request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  },
  addRoomMember(roomId: string, userId: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  removeRoomMember(roomId: string, userId: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
  deleteRoom(roomId: string) {
    return request<void>(`/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },
  leaveRoom(roomId: string) {
    return request<void>(`/rooms/${roomId}/leave`, {
      method: 'POST',
    });
  },
  updateRoom(roomId: string, name: string) {
    return request<Room>(`/rooms/${roomId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },
  async uploadRoomAvatar(roomId: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_URL}/rooms/${roomId}/avatar`, {
      method: 'POST',
      headers: authHeader(),
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<Room>;
  },
  updateNickname(roomId: string, userId: string, nickname: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/nickname`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, nickname }),
    });
  },
  muteRoom(roomId: string, muted: boolean) {
    return request<RoomMute>(`/rooms/${roomId}/mute`, {
      method: 'PATCH',
      body: JSON.stringify({ muted }),
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
      method: 'PATCH',
      body: JSON.stringify({ pinned }),
    });
  },
  recallMessage(roomId: string, messageId: string) {
    return request<ChatMessage>(`/rooms/${roomId}/messages/${messageId}/recall`, {
      method: 'POST',
    });
  },
  editMessage(roomId: string, messageId: string, content: string) {
    return request<ChatMessage>(`/rooms/${roomId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },
  deleteMessage(roomId: string, messageId: string) {
    return request<{ ok: boolean; id: string }>(`/rooms/${roomId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
  gallery(roomId: string) {
    return request<GalleryImage[]>(`/rooms/${roomId}/images`);
  },
  reads(roomId: string) {
    return request<RoomRead[]>(`/rooms/${roomId}/reads`);
  },
  markRead(roomId: string, messageId: string) {
    return request<RoomRead[]>(`/rooms/${roomId}/read`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  },
  gifs(query?: string) {
    const q = query?.trim();
    return request<{ items: { id: string; url: string; preview: string }[] }>(
      `/gifs${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    ).then((body) => body.items);
  },
  attachRemoteImage(roomId: string, url: string) {
    return request<GalleryImage>(`/rooms/${roomId}/images/remote`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
  async uploadImage(roomId: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_URL}/rooms/${roomId}/images`, {
      method: 'POST',
      headers: authHeader(),
      body,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<GalleryImage>;
  },
  listMeetings() {
    return request<{ upcoming: Meeting[]; history: Meeting[] }>('/meetings');
  },
  createMeeting(payload?: { title?: string; scheduledAt?: string }) {
    return request<Meeting>('/meetings', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },
  joinMeeting(code: string) {
    return request<Meeting>('/meetings/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  saveMeetingNotes(id: string, notes: string) {
    return request<Meeting>(`/meetings/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },
  leaveMeeting(id: string) {
    return request<Meeting>(`/meetings/${id}/leave`, { method: 'POST' });
  },
  endMeeting(id: string) {
    return request<Meeting>(`/meetings/${id}/end`, { method: 'POST' });
  },
  closeMeetingOnExit(id: string, asHost: boolean) {
    const token = localStorage.getItem('chatvcb.token');
    if (!token) {
      return;
    }
    void fetch(`${API_URL}/meetings/${id}/${asHost ? 'end' : 'leave'}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    });
  },
  googleMailUrl() {
    return request<{ url: string }>('/mail/google');
  },
  listMailAccounts() {
    return request<MailAccount[]>('/mail/accounts');
  },
  connectMail(payload: {
    email: string;
    password: string;
    imapHost?: string;
    imapPort?: number;
    displayName?: string;
  }) {
    return request<MailAccount>('/mail/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  removeMailAccount(id: string) {
    return request<{ ok: boolean }>(`/mail/accounts/${id}`, { method: 'DELETE' });
  },
  mailInbox(id: string, limit = 40) {
    return request<{ total: number; items: MailItem[] }>(`/mail/accounts/${id}/inbox?limit=${limit}`);
  },
  mailMessage(id: string, uid: string) {
    return request<MailMessage>(`/mail/accounts/${id}/messages/${encodeURIComponent(uid)}`);
  },
  googleSheetsStatus() {
    return request<{ ready: boolean; connected: boolean; email: string }>('/docs/google/status');
  },
  googleSheetsStart(intent = 'connect') {
    return request<{ url: string }>(`/docs/google?intent=${encodeURIComponent(intent)}`);
  },
  listDocs(tab = 'recent', q = '') {
    const query = new URLSearchParams({ tab, q });
    return request<DocItem[]>(`/docs?${query.toString()}`);
  },
  createDoc(payload?: {
    title?: string;
    kind?: DocItem['kind'];
    template?: 'blank' | 'meeting' | 'weekly';
    content?: string;
  }) {
    return request<DocItem>('/docs', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },
  getDoc(id: string) {
    return request<DocItem>(`/docs/${id}`);
  },
  updateDoc(
    id: string,
    payload: { title?: string; content?: string; folder?: string; starred?: boolean },
  ) {
    return request<DocItem>(`/docs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  removeDoc(id: string) {
    return request<{ ok: boolean }>(`/docs/${id}`, { method: 'DELETE' });
  },
};

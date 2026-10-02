import type {
  ChatMessage,
  GalleryImage,
  Room,
  RoomLink,
  RoomMember,
  RoomRead,
  User,
} from './types';

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
  if (!response.ok) {
    throw new Error(await errorMessage(response));
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
  rooms() {
    return request<Room[]>('/rooms');
  },
  members(roomId: string) {
    return request<RoomMember[]>(`/rooms/${roomId}/members`);
  },
  messages(roomId: string) {
    return request<ChatMessage[]>(`/rooms/${roomId}/messages`);
  },
  sendMessage(roomId: string, content: string, imageId?: string, replyToId?: string) {
    return request<ChatMessage>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, imageId, replyToId }),
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
};

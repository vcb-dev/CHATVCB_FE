import type { ChatMessage, Room, User } from './types';

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
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      message = (await response.text()) || message;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
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
  rooms() {
    return request<Room[]>('/rooms');
  },
  messages(roomId: string) {
    return request<ChatMessage[]>(`/rooms/${roomId}/messages`);
  },
  sendMessage(roomId: string, content: string) {
    return request<ChatMessage>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

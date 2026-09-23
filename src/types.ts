export type User = {
  id: string;
  name: string;
  email?: string;
  team?: string;
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
  createdAt: string;
};

export type PresenceUser = {
  id: string;
  name: string;
};

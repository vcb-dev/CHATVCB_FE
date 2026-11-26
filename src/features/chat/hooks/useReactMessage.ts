import { message as antMessage } from 'antd';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '@/api/client';
import type { ChatMessage, User } from '@/types';
import { isTemp, MAX_REACTIONS, toggleReaction } from '../utils/messageCache';
import { getMessages, updateMessages } from '../utils/messageStore';

type Me = { id: string; name: string; avatarUrl?: string };
type ReactVars = { message: ChatMessage; emoji: string; me: Me };

// Số lần thả cảm xúc còn chờ server theo tin: còn chờ thì không lấy `reactions` từ server (POST lẫn socket)
const pending = new Map<string, number>();

export function hasPendingReaction(messageId: string): boolean {
  return (pending.get(messageId) ?? 0) > 0;
}

function bump(messageId: string, delta: number) {
  const next = (pending.get(messageId) ?? 0) + delta;
  if (next > 0) {
    pending.set(messageId, next);
  } else {
    pending.delete(messageId);
  }
}

function applyToggle(queryClient: QueryClient, { message, emoji, me }: ReactVars) {
  updateMessages(queryClient, message.roomId, (cache) => ({
    ...cache,
    items: cache.items.map((item) =>
      item.id === message.id
        ? { ...item, reactions: toggleReaction(item.reactions, me, emoji) ?? item.reactions }
        : item,
    ),
  }));
}

/** Thả cảm xúc hiện ngay; các lần thả đi lần lượt để kết quả cuối khớp server. */
export function useReactMessage(user: User) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    scope: { id: 'react' },
    mutationFn: ({ message, emoji }: ReactVars) =>
      api.reactMessage(message.roomId, message.id, emoji),
    onMutate: (vars) => {
      bump(vars.message.id, 1);
      applyToggle(queryClient, vars);
    },
    onSuccess: (server, { message }) => {
      // Lần cuối cùng còn chờ mới lấy bản server, nếu không bấm liên tiếp sẽ thấy nháy bật/tắt
      if ((pending.get(message.id) ?? 0) > 1) {
        return;
      }
      updateMessages(queryClient, message.roomId, (cache) => ({
        ...cache,
        items: cache.items.map((item) => (item.id === server.id ? server : item)),
      }));
    },
    onError: (err, vars) => {
      // Bật/tắt là phép tự nghịch đảo: bấm lại đúng emoji đó là trả về như trước
      applyToggle(queryClient, vars);
      void antMessage.error(err instanceof Error ? err.message : 'Không thả được cảm xúc.');
    },
    onSettled: (_data, _err, { message }) => bump(message.id, -1),
  });

  return useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (isTemp(message)) {
        return;
      }
      const me: Me = { id: user.id, name: user.name, avatarUrl: user.avatarUrl };
      const current =
        getMessages(queryClient, message.roomId)?.items.find((item) => item.id === message.id) ??
        message;
      if (toggleReaction(current.reactions, me, emoji) === null) {
        void antMessage.error(`Mỗi người thả tối đa ${MAX_REACTIONS} cảm xúc cho một tin.`);
        return;
      }
      mutate({ message, emoji, me });
    },
    [mutate, queryClient, user.avatarUrl, user.id, user.name],
  );
}

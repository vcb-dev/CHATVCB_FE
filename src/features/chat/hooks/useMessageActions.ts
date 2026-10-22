import { Modal, message as antMessage } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { api, fileSrc } from '@/api/client';
import { copyImage, copyText } from '@/lib/clipboard';
import type { ChatMessage } from '@/types';

export function useMessageActions({
  roomId,
  setMessages,
  setPins,
  onReply,
  onForward,
  onEdit,
}: {
  roomId: string;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPins: Dispatch<SetStateAction<ChatMessage[]>>;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
}) {
  async function handleMessageAction(key: string, message: ChatMessage) {
    if (!roomId) {
      return;
    }
    if (key === 'reply') {
      onReply(message);
      return;
    }
    if (key === 'forward') {
      onForward(message);
      return;
    }
    if (key === 'edit') {
      onEdit(message);
      return;
    }
    if (key === 'copy' || key === 'copyImage') {
      try {
        if (key === 'copy') {
          await copyText(message.content);
        } else if (message.imageUrl) {
          await copyImage(fileSrc(message.imageUrl));
        }
        antMessage.success('Đã sao chép.');
      } catch {
        antMessage.error(
          key === 'copy'
            ? 'Không sao chép được tin nhắn.'
            : 'Không sao chép được ảnh.',
        );
      }
      return;
    }
    try {
      if (key === 'pin') {
        const next = await api.pinMessage(roomId, message.id, !message.pinned);
        setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
        setPins((current) => {
          if (next.pinned && !next.recalled) {
            return [next, ...current.filter((item) => item.id !== next.id)];
          }
          return current.filter((item) => item.id !== next.id);
        });
        return;
      }
      if (key === 'delete') {
        Modal.confirm({
          title: 'Xóa tin nhắn?',
          content: 'Chỉ xóa với bạn. Người khác vẫn thấy tin này.',
          okText: 'Xóa',
          okButtonProps: { danger: true },
          onOk: async () => {
            await api.deleteMessage(roomId, message.id);
            setMessages((current) => current.filter((item) => item.id !== message.id));
          },
        });
        return;
      }
      if (key === 'recall') {
        Modal.confirm({
          title: 'Thu hồi tin nhắn?',
          content: 'Mọi người trong nhóm sẽ không còn thấy nội dung.',
          okText: 'Thu hồi',
          okButtonProps: { danger: true },
          onOk: async () => {
            const next = await api.recallMessage(roomId, message.id);
            setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
          },
        });
      }
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
    }
  }

  async function handleReact(message: ChatMessage, emoji: string) {
    if (!roomId) {
      return;
    }
    try {
      const next = await api.reactMessage(roomId, message.id, emoji);
      setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không thả được cảm xúc.');
    }
  }

  return { handleMessageAction, handleReact };
}

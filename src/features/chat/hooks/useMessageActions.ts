import { Modal, message as antMessage } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { api, fileSrc } from '@/api/client';
import { copyImage, copyText } from '@/lib/clipboard';
import type { ChatMessage } from '@/types';
import { forwardMessage } from '../utils/forward';

export function useMessageActions({
  roomId,
  setMessages,
  setPins,
  onReply,
  onForward,
  onEdit,
  onSelect,
  onSavedToCloud,
}: {
  roomId: string;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPins: Dispatch<SetStateAction<ChatMessage[]>>;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onSelect: (message: ChatMessage) => void;
  onSavedToCloud?: (sent: ChatMessage) => void;
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
    if (key === 'select') {
      onSelect(message);
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
      if (key === 'saveCloud') {
        const cloud = await api.cloudRoom();
        const sent = await forwardMessage(message, cloud.id);
        onSavedToCloud?.(sent);
        antMessage.success('Đã lưu vào Cloud của tôi.');
        return;
      }
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

  /** Xóa phía mình nhiều tin: tuần tự, tin nào lỗi thì báo số lượng và giữ lại trên màn hình. */
  function handleDeleteMany(targets: ChatMessage[], onDone: () => void) {
    const targetRoomId = roomId;
    Modal.confirm({
      title: `Xóa ${targets.length} tin nhắn?`,
      content: 'Chỉ xóa với bạn. Người khác vẫn thấy các tin này.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      onOk: async () => {
        let failed = 0;
        for (const target of targets) {
          try {
            await api.deleteMessage(targetRoomId, target.id);
            setMessages((current) => current.filter((item) => item.id !== target.id));
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          antMessage.error(`Không xóa được ${failed} tin.`);
        }
        onDone();
      },
    });
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

  return { handleMessageAction, handleReact, handleDeleteMany };
}

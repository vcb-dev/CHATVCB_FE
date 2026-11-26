import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, message as antMessage } from 'antd';
import { api } from '@/api/client';
import { ConversationPicker } from '@/components/ConversationPicker';
import { MAX_FORWARD_TARGETS } from '@/features/chat/utils/forward';
import {
  targetRoomId,
  useConversationTargets,
  type ConversationTarget,
} from '@/lib/useConversationTargets';
import type { ChatMessage, Room } from '@/types';

/** Gửi danh thiếp của một người (tin `rich: card`) tới nhiều cuộc trò chuyện. */
export function SendCardModal(props: {
  user: { id: string; name: string } | null;
  rooms: Room[];
  onClose: () => void;
  onSent: (sent: ChatMessage) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ConversationTarget[]>([]);
  const [sending, setSending] = useState(false);
  // Đích đã gửi xong, để thử lại sau lỗi không gửi trùng
  const doneRef = useRef(new Set<string>());
  // Chat 1-1 đang chặn (hai chiều) không gửi được; gửi danh thiếp của ai cho chính người đó thì vô nghĩa
  const sendableRooms = useMemo(
    () =>
      props.rooms.filter(
        (room) => !room.blockedByMe && !room.blockedMe && room.peerUserId !== props.user?.id,
      ),
    [props.rooms, props.user?.id],
  );
  const { items: rawItems, searching } = useConversationTargets(
    sendableRooms,
    query,
    Boolean(props.user),
  );
  const items = rawItems.filter((item) => item.userId !== props.user?.id);

  useEffect(() => {
    setQuery('');
    setSelected([]);
    setSending(false);
    doneRef.current = new Set();
  }, [props.user]);

  async function handleSend() {
    if (!props.user) {
      return;
    }
    setSending(true);
    const failed: ConversationTarget[] = [];
    let firstError = '';
    for (const target of selected) {
      if (doneRef.current.has(target.key)) {
        continue;
      }
      try {
        const roomId = await targetRoomId(target);
        const sent = await api.sendMessage(roomId, '', undefined, undefined, undefined, undefined, {
          type: 'card',
          userId: props.user.id,
        });
        doneRef.current.add(target.key);
        props.onSent(sent);
      } catch (err) {
        failed.push(target);
        firstError ||= err instanceof Error ? err.message : 'Lỗi không xác định';
      }
    }
    setSending(false);
    if (failed.length === 0) {
      antMessage.success(`Đã gửi danh thiếp tới ${selected.length} cuộc trò chuyện.`);
      props.onClose();
      return;
    }
    antMessage.error(
      `Không gửi được tới: ${failed.map((target) => target.name).join(', ')}. ${firstError}`,
    );
    setSelected(failed);
  }

  return (
    <Modal
      open={Boolean(props.user)}
      title={props.user ? `Gửi danh thiếp của ${props.user.name}` : 'Gửi danh thiếp'}
      onCancel={props.onClose}
      onOk={() => void handleSend()}
      okText="Gửi"
      cancelText="Hủy"
      okButtonProps={{ disabled: selected.length === 0 }}
      confirmLoading={sending}
      cancelButtonProps={{ disabled: sending }}
      closable={!sending}
      keyboard={!sending}
      mask={{ closable: !sending }}
      destroyOnHidden
    >
      <ConversationPicker
        items={items}
        selected={selected.map((target) => target.key)}
        max={MAX_FORWARD_TARGETS}
        disabled={sending}
        query={query}
        onQueryChange={setQuery}
        emptyText={searching ? 'Đang tải…' : undefined}
        onToggle={(item, checked) => {
          if (!checked) {
            setSelected((current) => current.filter((target) => target.key !== item.key));
            return;
          }
          const target = items.find((candidate) => candidate.key === item.key);
          if (target) {
            setSelected((current) => [...current, target]);
          }
        }}
      />
    </Modal>
  );
}

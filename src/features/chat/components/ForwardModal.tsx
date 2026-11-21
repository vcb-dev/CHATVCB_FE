import { useEffect, useRef, useState } from 'react';
import { Modal, message as antMessage } from 'antd';
import { ConversationPicker } from '@/components/ConversationPicker';
import {
  targetRoomId,
  useConversationTargets,
  type ConversationTarget,
} from '@/lib/useConversationTargets';
import { canForward, forwardMessage, MAX_FORWARD_TARGETS } from '../utils/forward';
import { previewOf } from '../utils/rooms';
import type { ChatMessage, Room } from '@/types';

export function ForwardModal(props: {
  messages: ChatMessage[];
  rooms: Room[];
  onClose: () => void;
  onForwarded: (sent: ChatMessage) => void;
  onSuccess?: () => void;
}) {
  const [query, setQuery] = useState('');
  // Giữ cả đích (không chỉ id): đích tìm từ BE có thể không nằm trong props.rooms
  const [selected, setSelected] = useState<ConversationTarget[]>([]);
  const [sending, setSending] = useState(false);
  // Số tin đã gửi tới từng đích, để thử lại sau lỗi không gửi trùng
  const progressRef = useRef(new Map<string, number>());
  const forwardable = props.messages.filter(canForward);
  const skipped = props.messages.length - forwardable.length;
  const { items, searching } = useConversationTargets(props.rooms, query, props.messages.length > 0);

  useEffect(() => {
    setQuery('');
    setSelected([]);
    setSending(false);
    progressRef.current = new Map();
  }, [props.messages]);

  async function handleSend() {
    if (forwardable.length === 0) {
      return;
    }
    setSending(true);
    let successCount = 0;
    const failed: ConversationTarget[] = [];
    let firstError = '';
    for (const target of selected) {
      let done = progressRef.current.get(target.key) ?? 0;
      try {
        // Người chưa có phòng 1-1 thì tạo phòng trước (BE tìm-hoặc-tạo, thử lại không ra phòng trùng)
        const roomId = await targetRoomId(target);
        for (; done < forwardable.length; done += 1) {
          const sent = await forwardMessage(forwardable[done], roomId);
          progressRef.current.set(target.key, done + 1);
          props.onForwarded(sent);
        }
        successCount += 1;
      } catch (err) {
        failed.push(target);
        if (!firstError) {
          firstError = err instanceof Error ? err.message : 'Lỗi không xác định';
        }
      }
    }
    setSending(false);

    if (failed.length === 0) {
      antMessage.success(
        forwardable.length === 1
          ? `Đã chuyển tiếp tới ${successCount} cuộc trò chuyện.`
          : `Đã chuyển tiếp ${forwardable.length} tin tới ${successCount} cuộc trò chuyện.`,
      );
      if (skipped > 0) {
        antMessage.info(`Đã bỏ qua ${skipped} tin không chuyển tiếp được.`);
      }
      props.onSuccess?.();
      props.onClose();
    } else {
      antMessage.error(
        `Không chuyển tiếp được tới: ${failed.map((target) => target.name).join(', ')}. ${firstError}`,
      );
      setSelected(failed);
    }
  }

  return (
    <Modal
      open={props.messages.length > 0}
      title="Chuyển tiếp tin nhắn"
      onCancel={props.onClose}
      onOk={handleSend}
      okText="Gửi"
      cancelText="Hủy"
      okButtonProps={{ disabled: selected.length === 0 || forwardable.length === 0 }}
      confirmLoading={sending}
      cancelButtonProps={{ disabled: sending }}
      closable={!sending}
      keyboard={!sending}
      mask={{ closable: !sending }}
      destroyOnHidden
    >
      <div className="forward-preview">
        {forwardable.length > 0 ? previewOf(forwardable[0]) : 'Không có tin nào chuyển tiếp được.'}
        {forwardable.length > 1 ? ` · và ${forwardable.length - 1} tin khác` : ''}
      </div>
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

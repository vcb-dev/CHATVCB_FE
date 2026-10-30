import { useEffect, useRef, useState } from 'react';
import { Avatar, Checkbox, Input, Modal, message as antMessage } from 'antd';
import { fileSrc } from '@/api/client';
import { canForward, forwardMessage, MAX_FORWARD_TARGETS } from '../utils/forward';
import { previewOf } from '../utils/rooms';
import { avatarColor, initials } from '@/lib/avatar';
import type { ChatMessage, Room } from '@/types';

export function ForwardModal(props: {
  messages: ChatMessage[];
  rooms: Room[];
  onClose: () => void;
  onForwarded: (sent: ChatMessage) => void;
  onSuccess?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  // Số tin đã gửi tới từng phòng, để thử lại sau lỗi không gửi trùng
  const progressRef = useRef(new Map<string, number>());
  const forwardable = props.messages.filter(canForward);
  const skipped = props.messages.length - forwardable.length;

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
    const failedRoomIds: string[] = [];
    let firstError = '';
    for (const roomId of selected) {
      let done = progressRef.current.get(roomId) ?? 0;
      try {
        for (; done < forwardable.length; done += 1) {
          const sent = await forwardMessage(forwardable[done], roomId);
          progressRef.current.set(roomId, done + 1);
          props.onForwarded(sent);
        }
        successCount += 1;
      } catch (err) {
        failedRoomIds.push(roomId);
        if (!firstError) {
          firstError = err instanceof Error ? err.message : 'Lỗi không xác định';
        }
      }
    }
    setSending(false);

    if (failedRoomIds.length === 0) {
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
      const failedNames = failedRoomIds.map((id) => {
        const r = props.rooms.find((item) => item.id === id);
        return r ? r.title || r.name : id;
      });
      antMessage.error(`Không chuyển tiếp được tới: ${failedNames.join(', ')}. ${firstError}`);
      setSelected(failedRoomIds);
    }
  }

  const filteredRooms = props.rooms.filter((room) =>
    (room.title || room.name).toLowerCase().includes(query.trim().toLowerCase()),
  );

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
      <Input
        placeholder="Tìm cuộc trò chuyện"
        allowClear
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="forward-count">
        Đã chọn {selected.length}/{MAX_FORWARD_TARGETS}
      </div>
      <div className="forward-list">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => {
            const name = room.title || room.name;
            const isChecked = selected.includes(room.id);
            const isDisabled =
              sending || (!isChecked && selected.length >= MAX_FORWARD_TARGETS);
            return (
              <Checkbox
                key={room.id}
                className="forward-row"
                checked={isChecked}
                disabled={isDisabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected((current) => [...current, room.id]);
                  } else {
                    setSelected((current) => current.filter((id) => id !== room.id));
                  }
                }}
              >
                <Avatar
                  size={36}
                  className="avatar-initials"
                  src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
                  style={{ background: avatarColor(name) }}
                >
                  {initials(name)}
                </Avatar>
                <span>{name}</span>
              </Checkbox>
            );
          })
        ) : (
          <div className="forward-empty">Không có cuộc trò chuyện phù hợp</div>
        )}
      </div>
    </Modal>
  );
}

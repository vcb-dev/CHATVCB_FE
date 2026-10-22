import { useEffect, useState } from 'react';
import { Avatar, Checkbox, Input, Modal, message as antMessage } from 'antd';
import { fileSrc } from './api';
import { forwardMessage, MAX_FORWARD_TARGETS } from './forward';
import { previewOf } from './rooms';
import { avatarColor, initials } from './theme';
import type { ChatMessage, Room } from './types';

export function ForwardModal(props: {
  message: ChatMessage | null;
  rooms: Room[];
  onClose: () => void;
  onForwarded: (sent: ChatMessage) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setQuery('');
    setSelected([]);
    setSending(false);
  }, [props.message]);

  async function handleSend() {
    if (!props.message) {
      return;
    }
    setSending(true);
    let successCount = 0;
    const failedRoomIds: string[] = [];
    let firstError = '';
    for (const roomId of selected) {
      try {
        const sent = await forwardMessage(props.message, roomId);
        props.onForwarded(sent);
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
      antMessage.success(`Đã chuyển tiếp tới ${successCount} cuộc trò chuyện.`);
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
      open={props.message !== null}
      title="Chuyển tiếp tin nhắn"
      onCancel={props.onClose}
      onOk={handleSend}
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
      <div className="forward-preview">
        {props.message ? previewOf(props.message) : null}
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

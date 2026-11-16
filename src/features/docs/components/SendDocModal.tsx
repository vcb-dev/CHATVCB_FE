import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Checkbox, Input, Modal, Radio, message } from 'antd';
import { useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import { googleDocUrl } from '../utils/googleLinks';
import type { DocItem, ShareRole } from '@/types';

const MAX_TARGETS = 10;

/**
 * "Gửi vào chat": chia sẻ tài liệu cho các nhóm đã chọn (mặc định Chỉ xem) rồi gửi link vào nhóm.
 * Link trong tin tự thành thẻ tài liệu (DocLinkCard).
 */
export function SendDocModal({ doc, onClose }: { doc: DocItem | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState<ShareRole>('reader');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // Key riêng: cache 'rooms' của màn chat có cách gộp trang riêng
  const rooms = useQuery({
    queryKey: ['rooms', 'send-doc'],
    queryFn: () => api.rooms(undefined, 100),
    enabled: Boolean(doc),
    staleTime: 30_000,
  });
  const list = (rooms.data?.data ?? []).filter(
    (room) => !room.isCloud && (room.title || room.name).toLowerCase().includes(query.trim().toLowerCase()),
  );

  function close() {
    setQuery('');
    setSelected([]);
    setRole('reader');
    setNote('');
    onClose();
  }

  async function send() {
    if (!doc?.googleUrl) {
      return;
    }
    // Link dựng từ googleId thay cho webViewLink để chắc chắn khớp mẫu thẻ tài liệu
    const link = doc.googleId ? googleDocUrl(doc.kind, doc.googleId) : doc.googleUrl;
    setSending(true);
    const failed: string[] = [];
    let firstError = '';
    for (const roomId of selected) {
      try {
        await api.shareDocToRoom(doc.id, roomId, role);
        await api.sendMessage(roomId, [note.trim(), link].filter(Boolean).join('\n'));
      } catch (err) {
        failed.push(roomId);
        firstError ||= err instanceof Error ? err.message : 'Lỗi không xác định';
      }
    }
    setSending(false);
    void queryClient.invalidateQueries({ queryKey: ['doc-card', doc.googleId ?? ''] });
    if (failed.length === 0) {
      message.success(`Đã gửi vào ${selected.length} cuộc trò chuyện.`);
      close();
      return;
    }
    const names = failed.map((id) => {
      const room = rooms.data?.data.find((item) => item.id === id);
      return room ? room.title || room.name : id;
    });
    message.error(`Không gửi được tới: ${names.join(', ')}. ${firstError}`);
    setSelected(failed);
  }

  return (
    <Modal
      open={Boolean(doc)}
      title="Gửi vào chat"
      onCancel={close}
      onOk={() => void send()}
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
      <div className="forward-preview">{doc?.title}</div>
      <div className="send-doc-role">
        <span>Thành viên nhóm được</span>
        <Radio.Group value={role} onChange={(event) => setRole(event.target.value as ShareRole)} disabled={sending}>
          <Radio value="reader">Chỉ xem</Radio>
          <Radio value="writer">Cho sửa</Radio>
        </Radio.Group>
      </div>
      <Input.TextArea
        className="send-doc-note"
        placeholder="Lời nhắn (không bắt buộc)"
        autoSize={{ minRows: 1, maxRows: 4 }}
        maxLength={500}
        value={note}
        disabled={sending}
        onChange={(event) => setNote(event.target.value)}
      />
      <Input placeholder="Tìm cuộc trò chuyện" allowClear value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="forward-count">
        Đã chọn {selected.length}/{MAX_TARGETS}
      </div>
      <div className="forward-list">
        {list.length > 0 ? (
          list.map((room) => {
            const name = room.title || room.name;
            const checked = selected.includes(room.id);
            return (
              <Checkbox
                key={room.id}
                className="forward-row"
                checked={checked}
                disabled={sending || (!checked && selected.length >= MAX_TARGETS)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id),
                  )
                }
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
          <div className="forward-empty">{rooms.isLoading ? 'Đang tải…' : 'Không có cuộc trò chuyện phù hợp'}</div>
        )}
      </div>
    </Modal>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Checkbox, Input, Modal, Radio, message } from 'antd';
import { useEffect, useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import { googleDocUrl } from '../utils/googleLinks';
import type { DocItem, Room, ShareRole } from '@/types';

const MAX_TARGETS = 10;

/** Nơi gửi: nhóm/phòng đã có, hoặc một người chưa có phòng 1-1 (tạo lúc gửi) */
type Target = { key: string; name: string; avatarUrl?: string; roomId?: string; userId?: string };

const roomTarget = (room: Pick<Room, 'id' | 'title' | 'name' | 'avatarUrl'>): Target => ({
  key: room.id,
  roomId: room.id,
  name: room.title || room.name,
  avatarUrl: room.avatarUrl,
});

/**
 * "Gửi vào chat": chia sẻ tài liệu cho các nhóm đã chọn (mặc định Chỉ xem) rồi gửi link vào nhóm.
 * Link trong tin tự thành thẻ tài liệu (DocLinkCard).
 */
export function SendDocModal({ doc, onClose }: { doc: DocItem | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Target[]>([]);
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
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  // Danh sách tải sẵn chỉ có 50 phòng gần nhất (BE trả tối đa 50 mỗi lần): gõ tìm thì hỏi thêm BE (nhóm theo tên, người theo tên/email)
  const found = useQuery({
    queryKey: ['rooms', 'send-doc-search', search],
    queryFn: () => api.searchRooms(search),
    enabled: Boolean(doc) && search.length > 0,
    staleTime: 30_000,
  });
  const loaded = (rooms.data?.data ?? []).filter((room) => !room.isCloud);
  const term = query.trim().toLowerCase();
  const list = loaded.filter((room) => (room.title || room.name).toLowerCase().includes(term)).map(roomTarget);
  if (search && found.data) {
    const seen = new Set(list.map((target) => target.key));
    const add = (target: Target) => {
      if (!seen.has(target.key)) {
        seen.add(target.key);
        list.push(target);
      }
    };
    found.data.rooms.forEach((room) => add(roomTarget(room)));
    found.data.users.forEach((user) => {
      const direct = loaded.find((room) => room.peerUserId === user.id);
      add(direct ? roomTarget(direct) : { key: `user:${user.id}`, userId: user.id, name: user.name, avatarUrl: user.avatarUrl });
    });
  }
  const selected = picked.map((target) => target.key);

  function close() {
    setQuery('');
    setSearch('');
    setPicked([]);
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
    const failed: Target[] = [];
    let firstError = '';
    for (const target of picked) {
      try {
        // Chia sẻ cho một người = chia sẻ cho phòng 1-1 với người đó
        const roomId = target.roomId ?? (await api.createDirectRoom(target.userId!)).id;
        await api.shareDocToRoom(doc.id, roomId, role);
        await api.sendMessage(roomId, [note.trim(), link].filter(Boolean).join('\n'));
      } catch (err) {
        failed.push(target);
        firstError ||= err instanceof Error ? err.message : 'Lỗi không xác định';
      }
    }
    setSending(false);
    void queryClient.invalidateQueries({ queryKey: ['doc-card', doc.googleId ?? ''] });
    if (failed.length === 0) {
      message.success(`Đã gửi vào ${picked.length} cuộc trò chuyện.`);
      close();
      return;
    }
    message.error(`Không gửi được tới: ${failed.map((target) => target.name).join(', ')}. ${firstError}`);
    setPicked(failed);
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
          list.map((target) => {
            const checked = selected.includes(target.key);
            return (
              <Checkbox
                key={target.key}
                className="forward-row"
                checked={checked}
                disabled={sending || (!checked && selected.length >= MAX_TARGETS)}
                onChange={(event) =>
                  setPicked((current) =>
                    event.target.checked ? [...current, target] : current.filter((item) => item.key !== target.key),
                  )
                }
              >
                <Avatar
                  size={36}
                  className="avatar-initials"
                  src={target.avatarUrl ? fileSrc(target.avatarUrl) : undefined}
                  style={{ background: avatarColor(target.name) }}
                >
                  {initials(target.name)}
                </Avatar>
                <span>{target.name}</span>
              </Checkbox>
            );
          })
        ) : (
          <div className="forward-empty">
            {rooms.isLoading || (search && found.isLoading) ? 'Đang tải…' : 'Không có cuộc trò chuyện phù hợp'}
          </div>
        )}
      </div>
    </Modal>
  );
}

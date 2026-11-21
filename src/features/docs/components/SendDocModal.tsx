import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, Modal, Radio, message } from 'antd';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { ConversationPicker } from '@/components/ConversationPicker';
import {
  targetRoomId,
  useConversationTargets,
  type ConversationTarget,
} from '@/lib/useConversationTargets';
import { googleDocUrl } from '../utils/googleLinks';
import type { DocItem, Room, ShareRole } from '@/types';

const MAX_TARGETS = 10;
const EMPTY_ROOMS: Room[] = [];

type SendDocValues = { picked: ConversationTarget[]; role: ShareRole; note: string };

/**
 * "Gửi vào chat": chia sẻ tài liệu cho các nhóm đã chọn (mặc định Chỉ xem) rồi gửi link vào nhóm.
 * Link trong tin tự thành thẻ tài liệu (DocLinkCard).
 */
export function SendDocModal({ doc, onClose }: { doc: DocItem | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const { control, getValues, setValue, reset } = useForm<SendDocValues>({
    defaultValues: { picked: [], role: 'reader', note: '' },
  });
  const picked = useWatch({ control, name: 'picked' });
  // Key riêng: cache 'rooms' của màn chat có cách gộp trang riêng
  const rooms = useQuery({
    queryKey: queryKeys.sendDocRooms,
    queryFn: () => api.rooms(undefined, 100),
    enabled: Boolean(doc),
    staleTime: 30_000,
  });
  const loaded = (rooms.data?.data ?? EMPTY_ROOMS).filter((room) => !room.isCloud);
  const { items: list, searching } = useConversationTargets(loaded, query, Boolean(doc));
  const selected = picked.map((target) => target.key);

  function close() {
    setQuery('');
    reset();
    onClose();
  }

  async function send() {
    if (!doc?.googleUrl) {
      return;
    }
    // Link dựng từ googleId thay cho webViewLink để chắc chắn khớp mẫu thẻ tài liệu
    const link = doc.googleId ? googleDocUrl(doc.kind, doc.googleId) : doc.googleUrl;
    const { picked, role, note } = getValues();
    setSending(true);
    const failed: ConversationTarget[] = [];
    let firstError = '';
    for (const target of picked) {
      try {
        // Chia sẻ cho một người = chia sẻ cho phòng 1-1 với người đó
        const roomId = await targetRoomId(target);
        await api.shareDocToRoom(doc.id, roomId, role);
        await api.sendMessage(roomId, [note.trim(), link].filter(Boolean).join('\n'));
      } catch (err) {
        failed.push(target);
        firstError ||= err instanceof Error ? err.message : 'Lỗi không xác định';
      }
    }
    setSending(false);
    if (doc.googleId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.docCards(doc.googleId) });
    }
    if (failed.length === 0) {
      message.success(`Đã gửi vào ${picked.length} cuộc trò chuyện.`);
      close();
      return;
    }
    message.error(`Không gửi được tới: ${failed.map((target) => target.name).join(', ')}. ${firstError}`);
    setValue('picked', failed);
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
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Radio.Group value={field.value} onChange={(event) => field.onChange(event.target.value as ShareRole)} disabled={sending}>
              <Radio value="reader">Chỉ xem</Radio>
              <Radio value="writer">Cho sửa</Radio>
            </Radio.Group>
          )}
        />
      </div>
      <Controller
        control={control}
        name="note"
        render={({ field }) => (
          <Input.TextArea
            {...field}
            className="send-doc-note"
            placeholder="Lời nhắn (không bắt buộc)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={500}
            disabled={sending}
          />
        )}
      />
      <ConversationPicker
        items={list}
        selected={selected}
        max={MAX_TARGETS}
        disabled={sending}
        query={query}
        onQueryChange={setQuery}
        emptyText={rooms.isLoading || searching ? 'Đang tải…' : 'Không có cuộc trò chuyện phù hợp'}
        onToggle={(item, checked) => {
          const current = getValues('picked');
          if (!checked) {
            setValue(
              'picked',
              current.filter((pickedItem) => pickedItem.key !== item.key),
            );
            return;
          }
          const target = list.find((candidate) => candidate.key === item.key);
          if (target) {
            setValue('picked', [...current, target]);
          }
        }}
      />
    </Modal>
  );
}

import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Popover, message } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import type { ConversationLabel } from '@/types';
import { LABEL_COLORS } from '../utils/labels';

function ColorPicker(props: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      content={
        <div className="label-palette">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={['label-palette-btn', c === props.color ? 'selected' : ''].filter(Boolean).join(' ')}
              style={{ background: c }}
              onClick={() => {
                props.onChange(c);
                setOpen(false);
              }}
            />
          ))}
        </div>
      }
    >
      <button
        type="button"
        className="label-swatch"
        style={{ background: props.color }}
        aria-label="Chọn màu"
      />
    </Popover>
  );
}

export function LabelManagerModal(props: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: labels = [], isLoading } = useQuery({
    queryKey: queryKeys.labels,
    queryFn: api.labels,
    enabled: props.open,
  });

  // Ô "nhãn mới": màu null = tự chọn màu chưa dùng
  const { control, handleSubmit, reset } = useForm<{ name: string; color: string | null }>({
    defaultValues: { name: '', color: null },
  });

  const defaultNewColor = useMemo(() => {
    const used = new Set(labels.map((l) => l.color.toLowerCase()));
    const firstUnused = LABEL_COLORS.find((c) => !used.has(c.toLowerCase()));
    return firstUnused ?? LABEL_COLORS[0];
  }, [labels]);


  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.labels });
    await queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
  }

  async function handleAdd({ name, color }: { name: string; color: string | null }) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    try {
      await api.createLabel({ name: trimmed, color: color ?? defaultNewColor });
      reset();
      await refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tạo được nhãn.');
    }
  }

  async function handleUpdate(label: ConversationLabel, patch: Partial<{ name: string; color: string }>) {
    if (patch.name !== undefined && patch.name.trim() === label.name) {
      return;
    }
    try {
      await api.updateLabel(label.id, patch);
      await refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không cập nhật được nhãn.');
    }
  }

  function handleDelete(label: ConversationLabel) {
    Modal.confirm({
      title: `Xóa nhãn "${label.name}"?`,
      content: 'Các cuộc trò chuyện đang gắn nhãn này sẽ bỏ nhãn.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deleteLabel(label.id);
          await refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Không xóa được nhãn.');
        }
      },
    });
  }

  return (
    <Modal
      title="Quản lý nhãn"
      open={props.open}
      onCancel={props.onClose}
      footer={null}
      destroyOnHidden
      width={420}
    >
      {isLoading ? (
        <LoadingState compact />
      ) : (
        <div className="label-manager-body">
          {labels.length === 0 ? (
            <EmptyState
              compact
              title="Chưa có nhãn. Tạo nhãn để phân loại cuộc trò chuyện."
            />
          ) : (
            <div className="label-list">
              {labels.map((item) => (
                <div key={item.id} className="label-row">
                  <ColorPicker
                    color={item.color}
                    onChange={(color) => void handleUpdate(item, { color })}
                  />
                  <Input
                    defaultValue={item.name}
                    key={item.name}
                    maxLength={30}
                    onPressEnter={(e) => void handleUpdate(item, { name: e.currentTarget.value.trim() })}
                    onBlur={(e) => void handleUpdate(item, { name: e.target.value.trim() })}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item)}
                    title="Xóa nhãn"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="label-add-row">
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorPicker color={field.value ?? defaultNewColor} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Tên nhãn mới"
                  maxLength={30}
                  onPressEnter={() => void handleSubmit(handleAdd)()}
                />
              )}
            />
            <Button type="primary" onClick={() => void handleSubmit(handleAdd)()}>
              Thêm
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Typography } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { UserAvatar } from '@/components/UserAvatar';
import type { BlockedUser } from '@/types';

const EMPTY_BLOCKED: BlockedUser[] = [];

/** Hồ sơ của mình: những người mình đã chặn, bỏ chặn ngay tại đây. */
export function BlockedUsers(props: {
  open: boolean;
  onUnblock: (userId: string) => Promise<boolean>;
}) {
  const queryClient = useQueryClient();
  // Mỗi lần mở hồ sơ tải lại (staleTime 0); lỗi thì coi như chưa chặn ai, như trước
  const blocked = useQuery({
    queryKey: queryKeys.blockedUsers,
    queryFn: () => api.blockedUsers(),
    enabled: props.open,
    staleTime: 0,
  });
  const users: BlockedUser[] | null = blocked.isError ? EMPTY_BLOCKED : (blocked.data ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function unblock(id: string) {
    setBusyId(id);
    try {
      if (await props.onUnblock(id)) {
        queryClient.setQueryData<BlockedUser[]>(queryKeys.blockedUsers, (current) =>
          current?.filter((user) => user.id !== id),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="profile-blocked" aria-busy={users === null}>
      <Typography.Text strong style={{ fontSize: 13 }}>
        Người đã chặn{users && users.length > 0 ? ` (${users.length})` : ''}
      </Typography.Text>
      {users === null ? null : users.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
          Bạn chưa chặn ai.
        </Typography.Paragraph>
      ) : (
        <ul className="blocked-list">
          {users.map((user) => (
            <li key={user.id} className="blocked-item">
              <UserAvatar size={32} src={user.avatarUrl} name={user.name} zoomable={false} />
              <span className="blocked-name">{user.name}</span>
              <Button size="small" loading={busyId === user.id} onClick={() => void unblock(user.id)}>
                Bỏ chặn
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

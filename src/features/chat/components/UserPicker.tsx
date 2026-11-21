import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Checkbox, Input } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UserAvatar } from '@/components/UserAvatar';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { DirectoryUser } from '@/types';

const EMPTY_USERS: DirectoryUser[] = [];

export function UserPicker(props: {
  mode: 'single' | 'multi';
  selected?: string[];
  exclude?: string[];
  onPick?: (user: DirectoryUser) => void;
  onChange?: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const term = useDebouncedValue(query.trim());
  const { data, isPending } = useQuery({
    queryKey: queryKeys.contacts(term, ''),
    queryFn: () => api.users(term || undefined),
    staleTime: 30_000,
  });
  const users = data ?? EMPTY_USERS;

  const excludeSet = new Set(props.exclude ?? []);
  const visibleUsers = users.filter((u) => !excludeSet.has(u.id));
  const selectedSet = new Set(props.selected ?? []);

  function handleToggle(userId: string) {
    if (!props.onChange) {
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    props.onChange(Array.from(next));
  }

  return (
    <div className="user-pick-container">
      <Input
        prefix={<SearchOutlined />}
        placeholder="Tìm theo tên, email, phòng ban..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        allowClear
        className="user-pick-search"
      />
      {isPending ? (
        <LoadingState compact size="small" />
      ) : visibleUsers.length === 0 ? (
        <EmptyState compact title="Không có ai khớp" />
      ) : (
        <div className="user-pick-list">
          {visibleUsers.map((u) => {
            const isSelected = selectedSet.has(u.id);
            return (
              <div
                key={u.id}
                className={`user-pick-row ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (props.mode === 'single') {
                    props.onPick?.(u);
                  } else {
                    handleToggle(u.id);
                  }
                }}
              >
                {props.mode === 'multi' ? (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle(u.id);
                    }}
                  />
                ) : null}
                <UserAvatar
                  size={36}
                  src={u.avatarUrl}
                  name={u.name}
                  zoomable={false}
                  style={{ flexShrink: 0 }}
                />
                <div className="user-pick-info">
                  <strong className="user-pick-name">{u.name}</strong>
                  <small className="user-pick-sub">
                    {u.email} {u.team ? `· ${u.team}` : ''}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

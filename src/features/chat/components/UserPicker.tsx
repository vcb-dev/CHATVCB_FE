import { useEffect, useState } from 'react';
import { Avatar, Checkbox, Input, Spin } from 'antd';
import { api, fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { DirectoryUser } from '@/types';

export function UserPicker(props: {
  mode: 'single' | 'multi';
  selected?: string[];
  exclude?: string[];
  onPick?: (user: DirectoryUser) => void;
  onChange?: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void api
        .users(query.trim() || undefined)
        .then((res) => {
          if (!cancelled) {
            setUsers(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUsers([]);
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

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
      <Input.Search
        placeholder="Tìm theo tên, email, phòng ban..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        allowClear
        className="user-pick-search"
      />
      {loading ? (
        <div className="user-pick-loading">
          <Spin size="small" />
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="user-pick-empty">Không có ai khớp</div>
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
                <Avatar
                  size={36}
                  src={u.avatarUrl ? fileSrc(u.avatarUrl) : undefined}
                  style={{ background: avatarColor(u.name), flexShrink: 0 }}
                >
                  {initials(u.name)}
                </Avatar>
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

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, DatePicker, Input, Select } from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UserAvatar } from '@/components/UserAvatar';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { ChatMessage, Room, RoomMember, RoomMessageSearch } from '@/types';
import { formatShort } from '../utils/datetime';

const { RangePicker } = DatePicker;

function snippetText(hit: ChatMessage): string {
  if (hit.content) return hit.content;
  if (hit.imageId || (hit.images && hit.images.length > 0)) return '[Ảnh]';
  if (hit.fileId || hit.fileName) return `[Tệp] ${hit.fileName ?? ''}`.trim();
  return '';
}

function highlightQuery(text: string, query?: string) {
  if (!query || !query.trim()) return text;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      part
    ),
  );
}

type Props = {
  room: Room;
  members: RoomMember[];
  overlay: boolean;
  onClose: () => void;
  onJump: (id: string, createdAt: string) => void;
};

export function ConversationSearch({ room, members, overlay, onClose, onJump }: Props) {
  const [text, setText] = useState('');
  const q = useDebouncedValue(text);
  const [senderId, setSenderId] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<[string, string] | null>(null);

  const params = useMemo<RoomMessageSearch>(
    () => ({
      q: q.trim() || undefined,
      senderId: senderId || undefined,
      from: range?.[0],
      to: range?.[1],
    }),
    [q, senderId, range],
  );

  const hasFilter = Boolean(params.q || params.senderId || params.from || params.to);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: queryKeys.roomSearch(room.id, params),
    queryFn: ({ pageParam }) =>
      api.searchRoomMessages(room.id, { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    enabled: hasFilter,
  });

  const hits = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  return (
    <aside className={overlay ? 'group-pane overlay conversation-search' : 'group-pane conversation-search'}>
      {overlay ? (
        <button
          type="button"
          className="group-pane-mask"
          aria-label="Đóng tìm kiếm"
          onClick={onClose}
        />
      ) : null}
      <div className="group-pane-head">
        <strong>Tìm trong cuộc trò chuyện</strong>
        <button
          type="button"
          className="group-pane-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          <CloseOutlined />
        </button>
      </div>

      <div className="search-filters">
        <Input
          autoFocus
          placeholder="Tìm tin nhắn"
          value={text}
          onChange={(e) => setText(e.target.value)}
          allowClear
          prefix={<SearchOutlined style={{ color: 'var(--ui-text-3)' }} />}
        />
        <Select
          placeholder="Người gửi"
          allowClear
          value={senderId}
          onChange={(val) => setSenderId(val ?? undefined)}
          style={{ width: '100%' }}
        >
          {members.map((m) => (
            <Select.Option key={m.id} value={m.id}>
              {m.displayName || m.name}
            </Select.Option>
          ))}
        </Select>
        <RangePicker
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
          style={{ width: '100%' }}
          onChange={(values) =>
            setRange(
              values && values[0] && values[1]
                ? [values[0].startOf('day').toISOString(), values[1].endOf('day').toISOString()]
                : null,
            )
          }
        />
      </div>

      <div className="search-results">
        {!hasFilter ? (
          <EmptyState compact title="Nhập từ khóa hoặc chọn người gửi, ngày." />
        ) : isLoading ? (
          <LoadingState compact size="small" />
        ) : isError ? (
          <EmptyState compact title="Không tìm được tin nhắn." />
        ) : hits.length === 0 ? (
          <EmptyState compact title="Không tìm thấy tin nhắn phù hợp." />
        ) : (
          <>
            {hits.map((hit) => {
              const snippet = snippetText(hit);
              return (
                <button
                  key={hit.id}
                  type="button"
                  className="search-hit"
                  onClick={() => {
                    onJump(hit.id, hit.createdAt);
                    if (overlay) onClose();
                  }}
                >
                  <UserAvatar
                    size={36}
                    className="avatar-initials"
                    src={hit.authorAvatarUrl}
                    name={hit.authorName}
                    zoomable={false}
                    style={{ flexShrink: 0 }}
                  />
                  <div className="search-hit-body">
                    <div className="search-hit-header">
                      <span className="search-hit-name">{hit.authorName}</span>
                      <span className="search-hit-time">{formatShort(hit.createdAt)}</span>
                    </div>
                    <div className="search-hit-text">{highlightQuery(snippet, params.q)}</div>
                  </div>
                </button>
              );
            })}
            {hasNextPage ? (
              <div className="search-more">
                <Button
                  type="link"
                  size="small"
                  loading={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  Xem thêm
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

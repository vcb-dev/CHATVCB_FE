import { MessageOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Empty, Input, Spin, message as antMessage } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import type { DirectoryUser, Room } from '@/types';
import { groupByLetter, teamLabel } from './utils/contacts';

type Props = {
  onlineUserIds: Set<string>;
  onViewProfile: (userId: string) => void;
  onOpenRoom: (room: Room) => void;
};

export function ContactsPage({ onlineUserIds, onViewProfile, onOpenRoom }: Props) {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Gõ xong mới gọi API, giống ô tìm người ở các hộp thoại khác
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchText.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const teams = useQuery({ queryKey: queryKeys.userTeams, queryFn: () => api.userTeams() });
  const contacts = useQuery({
    queryKey: queryKeys.contacts(query, team),
    queryFn: () => api.users(query, team || undefined),
    placeholderData: (previous) => previous,
  });

  const totalCount = useMemo(
    () => (teams.data ?? []).reduce((sum, item) => sum + item.count, 0),
    [teams.data],
  );
  const groups = useMemo(() => groupByLetter(contacts.data ?? []), [contacts.data]);

  async function openDirect(person: DirectoryUser) {
    setOpeningId(person.id);
    try {
      onOpenRoom(await api.createDirectRoom(person.id));
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <main className="contacts-page">
      <header className="contacts-head">
        <div>
          <h1>Danh bạ</h1>
          <p>{teams.data ? `${totalCount} người trong hệ thống` : 'Đang tải…'}</p>
        </div>
        <Input
          allowClear
          className="contacts-search"
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên hoặc email"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </header>

      <div className="contacts-filter" role="tablist" aria-label="Lọc theo team">
        <button
          type="button"
          role="tab"
          aria-selected={team === ''}
          className={team === '' ? 'contacts-chip active' : 'contacts-chip'}
          onClick={() => setTeam('')}
        >
          Tất cả <em>{totalCount}</em>
        </button>
        {(teams.data ?? []).map((item) => (
          <button
            key={item.team}
            type="button"
            role="tab"
            aria-selected={team === item.team}
            className={team === item.team ? 'contacts-chip active' : 'contacts-chip'}
            onClick={() => setTeam(item.team)}
          >
            {teamLabel(item.team)} <em>{item.count}</em>
          </button>
        ))}
      </div>

      <div className="contacts-list">
        {contacts.isPending ? (
          <div className="contacts-state">
            <Spin />
          </div>
        ) : contacts.isError ? (
          <div className="contacts-state">
            <Empty description="Không tải được danh bạ" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button onClick={() => void contacts.refetch()}>Thử lại</Button>
            </Empty>
          </div>
        ) : groups.length === 0 ? (
          <div className="contacts-state">
            <Empty
              description={query || team ? 'Không có ai khớp' : 'Chưa có ai khác trong hệ thống'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.letter} className="contacts-group">
              <h2>{group.letter}</h2>
              {group.users.map((person) => (
                <div key={person.id} className="contacts-row">
                  <button
                    type="button"
                    className="contacts-person"
                    onClick={() => onViewProfile(person.id)}
                  >
                    <span className="contacts-avatar">
                      <Avatar
                        size={40}
                        className="avatar-initials"
                        src={person.avatarUrl ? fileSrc(person.avatarUrl) : undefined}
                        style={{ background: avatarColor(person.name) }}
                      >
                        {initials(person.name)}
                      </Avatar>
                      {onlineUserIds.has(person.id) ? (
                        <i className="contacts-online" title="Đang online" />
                      ) : null}
                    </span>
                    <span className="contacts-info">
                      <strong>{person.name}</strong>
                      <small>{person.email}</small>
                    </span>
                    <span className="contacts-team">{teamLabel(person.team)}</span>
                  </button>
                  <Button
                    icon={<MessageOutlined />}
                    loading={openingId === person.id}
                    onClick={() => void openDirect(person)}
                  >
                    Nhắn tin
                  </Button>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </main>
  );
}

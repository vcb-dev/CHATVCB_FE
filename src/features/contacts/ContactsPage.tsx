import { useEffect, useMemo, useState } from 'react';
import {
  ContactsOutlined,
  MessageOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Input, Spin, message as antMessage } from 'antd';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { ContentCard } from '@/components/ContentCard';
import { EmptyState } from '@/components/EmptyState';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar, type ModuleSidebarGroup } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';
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

  const currentLabel = team === '' ? 'Tất cả' : teamLabel(team);
  const currentCount =
    team === ''
      ? totalCount
      : (teams.data ?? []).find((t) => t.team === team)?.count ?? (contacts.data ?? []).length;

  const sidebarGroups: ModuleSidebarGroup[] = useMemo(
    () => [
      {
        items: [
          {
            key: '',
            label: 'Tất cả',
            icon: <TeamOutlined />,
            count: totalCount,
          },
          ...(teams.data ?? []).map((item) => ({
            key: item.team,
            label: teamLabel(item.team),
            count: item.count,
          })),
        ],
      },
    ],
    [teams.data, totalCount],
  );

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
    <ModuleLayout
      sidebar={
        <ModuleSidebar
          title="Danh bạ"
          groups={sidebarGroups}
          activeKey={team}
          onSelect={setTeam}
        />
      }
      header={
        <PageHeader
          icon={<ContactsOutlined />}
          title={currentLabel}
          meta={`${currentCount} người`}
          actions={
            <Input
              allowClear
              style={{ width: 260 }}
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên hoặc email"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          }
        />
      }
    >
      <ContentCard>
        {contacts.isPending ? (
          <div className="contacts-state">
            <Spin />
          </div>
        ) : contacts.isError ? (
          <div className="contacts-state">
            <EmptyState
              title="Không tải được danh bạ"
              action={<Button onClick={() => void contacts.refetch()}>Thử lại</Button>}
            />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<SearchOutlined />}
            title="Không tìm thấy người phù hợp"
          />
        ) : (
          groups.map((group) => (
            <section key={group.letter} className="contacts-group">
              <div className="contacts-group-title">{group.letter}</div>
              {group.users.map((person) => (
                <div key={person.id} className="contacts-row">
                  <button
                    type="button"
                    className="contacts-person"
                    onClick={() => onViewProfile(person.id)}
                  >
                    <span className="contacts-avatar">
                      <Avatar
                        size={44}
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
                    className="contacts-chat-btn"
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
      </ContentCard>
    </ModuleLayout>
  );
}

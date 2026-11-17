import { useEffect, useMemo, useState } from 'react';
import { ContactsOutlined, MessageOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Input, Spin, message as antMessage } from 'antd';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { ContentCard } from '@/components/ContentCard';
import { EmptyState } from '@/components/EmptyState';
import { ModuleLayout } from '@/components/ModuleLayout';
import { PageHeader } from '@/components/PageHeader';
import { avatarColor, initials } from '@/lib/avatar';
import type { DirectoryUser, PageMeta, Room } from '@/types';
import { ContactsGroups } from './components/ContactsGroups';
import { groupByLetter } from './utils/contacts';
import { contactGroups } from './utils/groups';

type ContactsTab = 'friends' | 'groups';

type Props = {
  onlineUserIds: Set<string>;
  /** Danh sách phòng của chat (chia trang); tab Nhóm lọc ra các nhóm từ đây. */
  rooms: Room[];
  roomsMeta: PageMeta;
  loadingOlderRooms: boolean;
  onLoadMoreRooms: () => Promise<void>;
  onViewProfile: (userId: string) => void;
  onOpenRoom: (room: Room) => void;
  onCreateGroup: () => void;
};

/** "Bạn bè (7)" như app mobile; chưa biết số thì chỉ hiện tên tab. */
function tabLabel(label: string, count: number | undefined): string {
  return count === undefined ? label : `${label} (${count})`;
}

/** Danh bạ giống app mobile: tab Bạn bè (A-Z) và Nhóm, ô tìm ngay dưới tab. */
export function ContactsPage({ onlineUserIds, onViewProfile, onOpenRoom, ...props }: Props) {
  const [tab, setTab] = useState<ContactsTab>('friends');
  const [searchText, setSearchText] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchText.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  // Cả danh bạ để đếm trên tab; chưa tìm thì trùng key với `contacts` nên chỉ gọi một lần
  const everyone = useQuery({
    queryKey: queryKeys.contacts('', ''),
    queryFn: () => api.users(),
  });
  const contacts = useQuery({
    queryKey: queryKeys.contacts(query, ''),
    queryFn: () => api.users(query),
    placeholderData: (previous) => previous,
  });

  const groups = useMemo(() => groupByLetter(contacts.data ?? []), [contacts.data]);
  const roomGroups = useMemo(() => contactGroups(props.rooms, groupSearch), [props.rooms, groupSearch]);
  // Còn trang phòng chưa tải thì chưa biết đủ số nhóm, nên chưa hiện số trên tab
  const groupCount = useMemo(
    () => (props.roomsMeta.hasMore ? undefined : contactGroups(props.rooms, '').length),
    [props.rooms, props.roomsMeta.hasMore],
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
      header={
        <PageHeader
          icon={<ContactsOutlined />}
          title="Danh bạ"
          tabs={{
            items: [
              { key: 'friends', label: tabLabel('Bạn bè', everyone.data?.length) },
              { key: 'groups', label: tabLabel('Nhóm', groupCount) },
            ],
            activeKey: tab,
            onChange: (key) => setTab(key as ContactsTab),
          }}
        >
          {tab === 'friends' ? (
            <Input
              key="friends"
              allowClear
              className="contacts-search"
              prefix={<SearchOutlined />}
              placeholder="Tìm bạn bè"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          ) : (
            <Input
              key="groups"
              allowClear
              className="contacts-search"
              prefix={<SearchOutlined />}
              placeholder="Tìm nhóm"
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
            />
          )}
        </PageHeader>
      }
    >
      <ContentCard>
        {tab === 'groups' ? (
          <ContactsGroups
            groups={roomGroups}
            searching={Boolean(groupSearch.trim())}
            roomsMeta={props.roomsMeta}
            loadingOlderRooms={props.loadingOlderRooms}
            onLoadMoreRooms={props.onLoadMoreRooms}
            onOpenRoom={onOpenRoom}
            onCreateGroup={props.onCreateGroup}
          />
        ) : contacts.isPending ? (
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
                  </button>
                  <Button
                    type="text"
                    shape="circle"
                    className="contacts-chat-btn"
                    icon={<MessageOutlined />}
                    title="Nhắn tin"
                    aria-label={`Nhắn tin với ${person.name}`}
                    loading={openingId === person.id}
                    onClick={() => void openDirect(person)}
                  />
                </div>
              ))}
            </section>
          ))
        )}
      </ContentCard>
    </ModuleLayout>
  );
}

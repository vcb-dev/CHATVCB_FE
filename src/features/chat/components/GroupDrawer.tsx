import {
  BellOutlined,
  CameraOutlined,
  CloseOutlined,
  CloudOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  LinkOutlined,
  LogoutOutlined,
  PictureOutlined,
  PushpinOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Input, Modal, Typography, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { CopyableImage } from '@/components/CopyableImage';
import { compressImage } from '@/lib/image';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import { mergePhotos } from '../utils/media';
import { requestNotifyPermission } from '@/lib/notify';
import { formatBytes } from '../utils/attachments';
import { UserPicker } from './UserPicker';
import { avatarColor, initials } from '@/lib/avatar';
import { isRoomMuted } from '../utils/rooms';
import { MuteDurationModal } from './MuteDurationModal';
import { GroupManageView } from './GroupManageView';
import { InfoSection } from './InfoSection';
import { GroupRemindersCard } from './GroupRemindersCard';
import { GroupTasksCard } from './GroupTasksCard';
import { GroupNotesCard } from './GroupNotesCard';
import { GroupMembersCard } from './GroupMembersCard';
import type { ChatFile, ChatMessage, DirectoryUser, GalleryImage, Reminder, Room, RoomLink, RoomMember, RoomNote } from '@/types';

const EMPTY_PHOTOS: GalleryImage[] = [];
const EMPTY_FILES: ChatFile[] = [];
const EMPTY_LINKS: RoomLink[] = [];
const EMPTY_PINS: ChatMessage[] = [];

function GroupAvatar({ room }: { room: Room }) {
  const src = room.avatarUrl ? fileSrc(room.avatarUrl) : undefined;
  if (room.isCloud) {
    return (
      <Avatar
        size={64}
        className="avatar-initials"
        icon={<CloudOutlined />}
        src={src}
        style={{ background: '#0084ff' }}
      />
    );
  }
  const label = room.title || room.name;
  return (
    <Avatar
      size={64}
      className="avatar-initials"
      src={src}
      style={{ background: avatarColor(label) }}
    >
      {initials(label)}
    </Avatar>
  );
}

type Props = {
  room: Room | null;
  members: RoomMember[];
  currentUserId: string;
  chatPhotos?: GalleryImage[];
  overlay?: boolean;
  onClose?: () => void;
  onRoomUpdated: (room: Room) => void;
  onMembersUpdated: (members: RoomMember[]) => void;
  onRoomRemoved: (roomId: string) => void;
  onJumpMessage: (id: string, createdAt: string) => void;
  onViewProfile: (userId: string) => void;
  prefs: ReturnType<typeof useRoomPrefs>;
  onEditReminder: (reminder: Reminder) => void;
  onCreateReminder: () => void;
  onOpenNote: (note: RoomNote) => void;
  onCreateNote: () => void;
  onCreateTask: () => void;
};

export function GroupDrawer({
  room,
  members,
  currentUserId,
  chatPhotos = [],
  overlay = false,
  onClose,
  onRoomUpdated,
  onMembersUpdated,
  onRoomRemoved,
  onJumpMessage,
  onViewProfile,
  prefs,
  onEditReminder,
  onCreateReminder,
  onOpenNote,
  onCreateNote,
  onCreateTask,
}: Props) {
  const [name, setName] = useState(room?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const roomKey = room?.id ?? '';
  const enabled = Boolean(room);
  const galleryQuery = useQuery({
    queryKey: queryKeys.gallery(roomKey),
    queryFn: () => api.gallery(roomKey),
    enabled,
  });
  const filesQuery = useQuery({
    queryKey: queryKeys.files(roomKey),
    queryFn: () => api.files(roomKey),
    enabled,
  });
  const linksQuery = useQuery({
    queryKey: queryKeys.links(roomKey),
    queryFn: () => api.links(roomKey),
    enabled,
  });
  const pinsQuery = useQuery({
    queryKey: queryKeys.pins(roomKey),
    queryFn: () => api.pins(roomKey),
    enabled,
  });
  const photos = useMemo(
    () => mergePhotos(chatPhotos, galleryQuery.data ?? EMPTY_PHOTOS),
    [chatPhotos, galleryQuery.data],
  );
  const files = filesQuery.data ?? EMPTY_FILES;
  const links = linksQuery.data ?? EMPTY_LINKS;
  const pins = pinsQuery.data ?? EMPTY_PINS;
  const [muting, setMuting] = useState(false);
  async function changeMute(request: Promise<boolean>, muted: boolean) {
    setMuting(true);
    const done = await request;
    setMuting(false);
    if (!done) {
      return;
    }
    if (muted) {
      message.success('Đã tắt thông báo cuộc trò chuyện này.');
    } else {
      message.success('Đã bật thông báo cuộc trò chuyện này.');
      void requestNotifyPermission();
    }
  }
  const [muteModalOpen, setMuteModalOpen] = useState(false);
  const [nickUser, setNickUser] = useState<RoomMember | null>(null);
  const [nickValue, setNickValue] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [openSection, setOpenSection] = useState<'members' | 'photos' | 'files' | 'links' | 'pins' | null>(
    'members',
  );
  const avatarRef = useRef<HTMLInputElement>(null);

  const isCloud = room?.isCloud ?? false;
  const isGroup = !isCloud && (room?.type === 'group' || room?.kind === 'group');
  const isSuggestMember = Boolean(
    isGroup &&
      room &&
      room.canLeave &&
      room.settings?.joinApproval &&
      !room.canManage,
  );
  const canAddMember = Boolean(
    isGroup &&
      room &&
      (room.canManage || room.canLeave),
  );
  const canEditInfo = Boolean(
    isGroup &&
      room &&
      !(room.settings?.adminOnlyInfo && room.myRole === 'member'),
  );

  const [view, setView] = useState<'info' | 'manage'>('info');

  useEffect(() => {
    setName(room?.name ?? '');
    setEditingName(false);
    setPhotoOpen(false);
    setAddMemberOpen(false);
    setView('info');
  }, [room?.id]);

  async function saveName() {
    if (!room) {
      return;
    }
    const next = name.trim();
    if (!next || next === room.name) {
      setEditingName(false);
      setName(room.name);
      return;
    }
    try {
      onRoomUpdated(await api.updateRoom(room.id, next));
      setEditingName(false);
      message.success('Đã đổi tên nhóm.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đổi được tên.');
    }
  }

  async function onAvatar(file: File) {
    if (!room) {
      return;
    }
    try {
      const preview = URL.createObjectURL(file);
      onRoomUpdated({ ...room, avatarUrl: preview });
      try {
        onRoomUpdated(await api.uploadRoomAvatar(room.id, await compressImage(file, 400)));
        message.success('Đã đổi ảnh nhóm.');
      } finally {
        URL.revokeObjectURL(preview);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đổi được ảnh.');
    }
  }

  async function saveNick() {
    if (!room || !nickUser) {
      return;
    }
    try {
      onMembersUpdated(await api.updateNickname(room.id, nickUser.id, nickValue.trim()));
      setNickUser(null);
      message.success('Đã đổi biệt danh.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đổi được biệt danh.');
    }
  }

  async function handleAddMember(pickedUser: DirectoryUser) {
    if (!room) {
      return;
    }
    try {
      if (isSuggestMember) {
        await api.requestMember(room.id, pickedUser.id);
        setAddMemberOpen(false);
        message.success('Đã gửi đề xuất, chờ trưởng hoặc phó nhóm duyệt.');
      } else {
        const next = await api.addRoomMember(room.id, pickedUser.id);
        onMembersUpdated(next);
        setAddMemberOpen(false);
        message.success(`Đã thêm ${pickedUser.name} vào nhóm.`);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thêm được thành viên.');
    }
  }

  function handleRemoveMember(member: RoomMember) {
    if (!room) {
      return;
    }
    Modal.confirm({
      title: 'Xóa khỏi nhóm?',
      content: `Bạn có chắc muốn xóa ${member.displayName || member.name} khỏi nhóm?`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const next = await api.removeRoomMember(room.id, member.id);
          onMembersUpdated(next);
          message.success('Đã xóa thành viên.');
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Không xóa được thành viên.');
        }
      },
    });
  }

  function handleDeleteRoom() {
    if (!room) {
      return;
    }
    Modal.confirm({
      title: 'Giải tán nhóm?',
      content: 'Tất cả tin nhắn và dữ liệu nhóm sẽ bị xóa vĩnh viễn.',
      okText: 'Giải tán',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deleteRoom(room.id);
          onRoomRemoved(room.id);
          message.success('Đã giải tán nhóm.');
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Không giải tán được nhóm.');
        }
      },
    });
  }

  function handleLeaveRoom() {
    if (!room) {
      return;
    }
    Modal.confirm({
      title: 'Rời nhóm?',
      content: 'Bạn sẽ không còn nhận tin nhắn của nhóm này. Muốn quay lại, chủ nhóm phải thêm bạn.',
      okText: 'Rời nhóm',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.leaveRoom(room.id);
          onRoomRemoved(room.id);
          message.success('Đã rời nhóm.');
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Không rời được nhóm.');
        }
      },
    });
  }

  const previewPhotos = photos.slice(0, 6);

  return (
    <aside className={overlay ? 'group-pane overlay' : 'group-pane'}>
      {overlay ? (
        <button type="button" className="group-pane-mask" aria-label="Đóng thông tin nhóm" onClick={onClose} />
      ) : null}
      <div className="group-pane-head">
        <strong>{isGroup ? 'Thông tin nhóm' : 'Thông tin cuộc trò chuyện'}</strong>
        {overlay ? (
          <button type="button" className="group-pane-close" onClick={onClose} aria-label="Đóng">
            <CloseOutlined />
          </button>
        ) : null}
      </div>

      {view === 'manage' && room ? (
        <GroupManageView
          room={room}
          onBack={() => setView('info')}
          onRoomUpdated={onRoomUpdated}
          onMembersUpdated={onMembersUpdated}
        />
      ) : room ? (
        <div className="group-scroll">
          <div className="group-card group-hero-card">
            <div className="group-hero">
              {isCloud ? (
                <>
                  <div className="group-avatar-btn" style={{ cursor: 'default' }}>
                    <GroupAvatar room={room} />
                  </div>
                  <h2>{room.title || room.name}</h2>
                  <p className="group-sub">Cloud của tôi</p>
                </>
              ) : isGroup ? (
                <>
                  {canEditInfo ? (
                    <button
                      type="button"
                      className="group-avatar-btn"
                      onClick={() => avatarRef.current?.click()}
                    >
                      <GroupAvatar room={room} />
                      <span className="group-cam">
                        <CameraOutlined />
                      </span>
                    </button>
                  ) : (
                    <div className="group-avatar-btn" style={{ cursor: 'default' }}>
                      <GroupAvatar room={room} />
                    </div>
                  )}
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) {
                        void onAvatar(file);
                      }
                    }}
                  />
                  {canEditInfo ? (
                    editingName ? (
                      <div className="group-name-edit">
                        <Input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          onPressEnter={() => void saveName()}
                          maxLength={80}
                          autoFocus
                        />
                        <Button type="primary" size="small" onClick={() => void saveName()}>
                          Lưu
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="group-name-btn"
                        onClick={() => setEditingName(true)}
                      >
                        <h2>{room.title || room.name}</h2>
                        <EditOutlined />
                      </button>
                    )
                  ) : (
                    <h2>{room.title || room.name}</h2>
                  )}
                  <p className="group-sub">{members.length} thành viên</p>
                </>
              ) : (
                <>
                  <div className="group-avatar-btn" style={{ cursor: 'default' }}>
                    <GroupAvatar room={room} />
                  </div>
                  <h2>{room.title || room.name}</h2>
                  <p className="group-sub">Trò chuyện trực tiếp</p>
                </>
              )}
            </div>

            <div className="info-actions">
              {!isCloud ? (
                <button
                  type="button"
                  className="info-action"
                  onClick={() => {
                    if (isRoomMuted(room)) {
                      void changeMute(prefs.unmute(room), false);
                    } else {
                      setMuteModalOpen(true);
                    }
                  }}
                >
                  <span className="info-action-btn">
                    <BellOutlined />
                  </span>
                  <span className="info-action-label">
                    {isRoomMuted(room) ? 'Bật thông báo' : 'Tắt thông báo'}
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                className="info-action"
                onClick={() => void prefs.togglePin(room)}
              >
                <span className="info-action-btn">
                  <PushpinOutlined />
                </span>
                <span className="info-action-label">
                  {room.pinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
                </span>
              </button>

              {isGroup && canAddMember ? (
                <button
                  type="button"
                  className="info-action"
                  onClick={() => setAddMemberOpen(true)}
                >
                  <span className="info-action-btn">
                    <UsergroupAddOutlined />
                  </span>
                  <span className="info-action-label">
                    {isSuggestMember ? 'Đề xuất TV' : 'Thêm thành viên'}
                  </span>
                </button>
              ) : null}

              {isGroup && room.canManage ? (
                <button
                  type="button"
                  className="info-action"
                  onClick={() => setView('manage')}
                >
                  <span className="info-action-btn">
                    <SettingOutlined />
                  </span>
                  <span className="info-action-label">Quản lý nhóm</span>
                </button>
              ) : null}
            </div>
          </div>

          {isGroup ? (
            <InfoSection title="Thành viên nhóm" count={members.length} defaultOpen>
              <GroupMembersCard
                key={room.id}
                room={room}
                members={members}
                currentUserId={currentUserId}
                addLabel={canAddMember ? (isSuggestMember ? 'Đề xuất thành viên' : 'Thêm thành viên') : null}
                onAdd={() => setAddMemberOpen(true)}
                onPick={(member) => {
                  setNickUser(member);
                  setNickValue(member.nickname || '');
                }}
                onMembersUpdated={onMembersUpdated}
                onRemove={handleRemoveMember}
              />
            </InfoSection>
          ) : null}

          {!isCloud ? (
            <InfoSection title="Bảng tin nhóm" defaultOpen={false}>
              {isGroup && room ? (
                <GroupTasksCard
                  room={room}
                  onCreate={onCreateTask}
                  onOpen={(task) => {
                    if (task.messageId) {
                      onJumpMessage(task.messageId, task.createdAt);
                    }
                  }}
                />
              ) : null}
              {room ? (
                <GroupRemindersCard
                  room={room}
                  currentUserId={currentUserId}
                  onEdit={onEditReminder}
                  onCreate={onCreateReminder}
                />
              ) : null}
              {room ? (
                <GroupNotesCard
                  room={room}
                  onOpen={onOpenNote}
                  onCreate={onCreateNote}
                />
              ) : null}
            </InfoSection>
          ) : null}

          <InfoSection title="Ảnh/Video" count={photos.length} defaultOpen>
            {photos.length ? (
              <div className="group-photos">
                {photos.slice(0, 8).map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className="group-thumb"
                    onClick={() => setPhotoOpen(true)}
                  >
                    <img src={fileSrc(image.url)} alt="" />
                  </button>
                ))}
                {photos.length > 8 ? (
                  <button
                    type="button"
                    className="group-more"
                    onClick={() => setPhotoOpen(true)}
                  >
                    Xem tất cả
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="group-muted">Chưa có ảnh</p>
            )}
          </InfoSection>

          <InfoSection title="File" count={files.length} defaultOpen={false}>
            {files.length ? (
              <div className="group-list">
                {files.map((file) => (
                  <a
                    key={file.id}
                    className="group-member"
                    href={fileSrc(file.url)}
                    target="_blank"
                    rel="noreferrer"
                    download={file.filename}
                  >
                    <span className="group-file-ico">
                      <FileOutlined />
                    </span>
                    <span className="group-member-info">
                      <strong title={file.filename}>{file.filename}</strong>
                      <small>{formatBytes(file.sizeBytes)}</small>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="group-muted">Chưa có file</p>
            )}
          </InfoSection>

          <InfoSection title="Link" count={links.length} defaultOpen={false}>
            {links.length ? (
              <div className="group-list">
                {links.map((item) => (
                  <a
                    key={`${item.messageId}-${item.url}`}
                    className="group-member"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="group-file-ico">
                      <LinkOutlined />
                    </span>
                    <span className="group-member-info">
                      <strong>{item.url}</strong>
                      <small>{item.authorName}</small>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="group-muted">Chưa có link</p>
            )}
          </InfoSection>

          <InfoSection title="Tin đã ghim" count={pins.length} defaultOpen={false}>
            {pins.length ? (
              <div className="group-list">
                {pins.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="group-member"
                    onClick={() => {
                      onJumpMessage(item.id, item.createdAt);
                      onClose?.();
                    }}
                  >
                    <span className="group-file-ico">
                      <PushpinOutlined />
                    </span>
                    <span className="group-member-info">
                      <strong>{item.authorName}</strong>
                      <small>{item.content || (item.imageUrl ? '[Ảnh]' : 'Tin đã ghim')}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="group-muted">Chưa ghim tin nào</p>
            )}
          </InfoSection>

          {!isCloud && (room.canLeave || room.canDelete) ? (
            <div className="group-danger-actions">
              {room.canLeave ? (
                <button
                  type="button"
                  className="group-danger-item"
                  onClick={handleLeaveRoom}
                >
                  <LogoutOutlined />
                  <span>Rời nhóm</span>
                </button>
              ) : null}
              {room.canDelete ? (
                <button
                  type="button"
                  className="group-danger-item"
                  onClick={handleDeleteRoom}
                >
                  <DeleteOutlined />
                  <span>Giải tán nhóm</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="group-muted pad">Chọn một nhóm để xem thông tin</p>
      )}

      <Modal
        title={`Ảnh trong nhóm (${photos.length})`}
        open={photoOpen}
        onCancel={() => setPhotoOpen(false)}
        footer={null}
        width={640}
      >
        <div className="gallery-grid">
          {photos.map((image) => (
            <div key={image.id} className="gallery-item">
              <CopyableImage src={fileSrc(image.url)} alt={image.filename} />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title="Đổi biệt danh"
        open={Boolean(nickUser)}
        onCancel={() => setNickUser(null)}
        footer={[
          <Button
            key="profile"
            onClick={() => {
              if (nickUser) {
                const targetId = nickUser.id;
                setNickUser(null);
                onViewProfile(targetId);
              }
            }}
          >
            Xem hồ sơ
          </Button>,
          <Button key="cancel" onClick={() => setNickUser(null)}>
            Hủy
          </Button>,
          <Button key="save" type="primary" onClick={() => void saveNick()}>
            Lưu
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          {nickUser?.name} (@{nickUser?.handle})
        </Typography.Paragraph>
        <Input
          value={nickValue}
          onChange={(event) => setNickValue(event.target.value)}
          placeholder="Biệt danh trong nhóm"
          maxLength={50}
        />
      </Modal>

      <Modal
        title={isSuggestMember ? 'Đề xuất thành viên' : 'Thêm thành viên'}
        open={addMemberOpen}
        onCancel={() => setAddMemberOpen(false)}
        footer={null}
        destroyOnHidden
        width={440}
      >
        <UserPicker
          mode="single"
          exclude={members.map((m) => m.id)}
          onPick={(u) => void handleAddMember(u)}
        />
      </Modal>

      <MuteDurationModal
        open={muteModalOpen}
        onPick={(minutes) => {
          setMuteModalOpen(false);
          if (room) {
            void changeMute(prefs.mute(room, minutes), true);
          }
        }}
        onCancel={() => setMuteModalOpen(false)}
      />
    </aside>
  );
}

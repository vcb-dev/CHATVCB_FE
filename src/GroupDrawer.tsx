import {
  BellOutlined,
  CameraOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  LinkOutlined,
  PictureOutlined,
  PlusOutlined,
  PushpinOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Image, Input, Modal, Switch, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, fileSrc } from './api';
import { compressImage, mergePhotos } from './media';
import { notifyEnabled, requestNotifyPermission, setNotifyEnabled } from './notify';
import { formatBytes } from './attachments';
import { UserPicker } from './UserPicker';
import { avatarColor, initials } from './theme';
import type { ChatFile, ChatMessage, DirectoryUser, GalleryImage, Room, RoomLink, RoomMember } from './types';

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
  onJumpMessage: (id: string) => void;
  onViewProfile: (userId: string) => void;
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
}: Props) {
  const [name, setName] = useState(room?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [photos, setPhotos] = useState<GalleryImage[]>([]);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [links, setLinks] = useState<RoomLink[]>([]);
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [nickUser, setNickUser] = useState<RoomMember | null>(null);
  const [nickValue, setNickValue] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [notifyOn, setNotifyOn] = useState(notifyEnabled);
  const [openSection, setOpenSection] = useState<'members' | 'photos' | 'files' | 'links' | 'pins' | null>(
    'members',
  );
  const avatarRef = useRef<HTMLInputElement>(null);

  const isGroup = room?.type === 'group' || room?.kind === 'group';
  const isOwner = Boolean(isGroup && room?.createdById === currentUserId);

  useEffect(() => {
    setName(room?.name ?? '');
    setEditingName(false);
    setPhotoOpen(false);
    setAddMemberOpen(false);
    setOpenSection('members');
  }, [room?.id]);

  useEffect(() => {
    if (!room) {
      setPhotos([]);
      setFiles([]);
      setLinks([]);
      setPins([]);
      return;
    }
    void api
      .gallery(room.id)
      .then((next) => setPhotos(mergePhotos(chatPhotos, next)))
      .catch(() => setPhotos(chatPhotos));
    void api.files(room.id).then(setFiles).catch(() => setFiles([]));
    void api.links(room.id).then(setLinks).catch(() => setLinks([]));
    void api.pins(room.id).then(setPins).catch(() => setPins([]));
  }, [room, chatPhotos]);

  function toggle(section: 'members' | 'photos' | 'files' | 'links' | 'pins') {
    setOpenSection((current) => (current === section ? null : section));
  }

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
      const next = await api.addRoomMember(room.id, pickedUser.id);
      onMembersUpdated(next);
      setAddMemberOpen(false);
      message.success(`Đã thêm ${pickedUser.name} vào nhóm.`);
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

      {room ? (
        <div className="group-scroll">
          <div className="group-card group-hero-card">
            <div className="group-hero">
              {isGroup ? (
                <>
                  <button
                    type="button"
                    className="group-avatar-btn"
                    onClick={() => avatarRef.current?.click()}
                  >
                    <Avatar
                      size={72}
                      className="avatar-initials"
                      src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
                      style={{ background: avatarColor(room.title || room.name) }}
                    >
                      {initials(room.title || room.name)}
                    </Avatar>
                    <span className="group-cam">
                      <CameraOutlined />
                    </span>
                  </button>
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
                  {editingName ? (
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
                  )}
                  <p className="group-sub">{members.length} thành viên</p>
                </>
              ) : (
                <>
                  <div className="group-avatar-btn" style={{ cursor: 'default' }}>
                    <Avatar
                      size={72}
                      className="avatar-initials"
                      src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
                      style={{ background: avatarColor(room.title || room.name) }}
                    >
                      {initials(room.title || room.name)}
                    </Avatar>
                  </div>
                  <h2>{room.title || room.name}</h2>
                  <p className="group-sub">Trò chuyện trực tiếp</p>
                </>
              )}
            </div>
          </div>

          <div className="group-card">
            <div className="group-row static">
              <span className="group-ico">
                <BellOutlined />
              </span>
              <span className="group-row-text">
                <strong>Thông báo tin nhắn</strong>
              </span>
              <Switch
                size="small"
                checked={notifyOn}
                onChange={(checked) => {
                  setNotifyEnabled(checked);
                  setNotifyOn(checked);
                  if (checked) {
                    void requestNotifyPermission();
                  }
                }}
              />
            </div>
          </div>

          {isGroup ? (
            <div className="group-card">
              <button type="button" className="group-row" onClick={() => toggle('members')}>
                <span className="group-ico">
                  <TeamOutlined />
                </span>
                <span className="group-row-text">
                  <strong>Thành viên</strong>
                  <small>{members.length} người</small>
                </span>
                <RightOutlined className={openSection === 'members' ? 'chev open' : 'chev'} />
              </button>
              {openSection === 'members' ? (
                <div className="group-list">
                  {isOwner ? (
                    <button
                      type="button"
                      className="group-member group-add-btn"
                      onClick={() => setAddMemberOpen(true)}
                    >
                      <span className="group-file-ico">
                        <PlusOutlined />
                      </span>
                      <span className="group-member-info">
                        <strong>Thêm thành viên</strong>
                      </span>
                    </button>
                  ) : null}
                  {members.map((item) => (
                    <div key={item.id} className="group-member-wrap">
                      <button
                        type="button"
                        className="group-member"
                        onClick={() => {
                          setNickUser(item);
                          setNickValue(item.nickname || '');
                        }}
                      >
                        <Avatar
                          size={40}
                          src={item.avatarUrl ? fileSrc(item.avatarUrl) : undefined}
                          style={{ background: avatarColor(item.displayName || item.name) }}
                        >
                          {initials(item.displayName || item.name)}
                        </Avatar>
                        <span className="group-member-info">
                          <strong>{item.displayName || item.name}</strong>
                          <small>@{item.handle}</small>
                        </span>
                        <RightOutlined className="chev" />
                      </button>
                      {isOwner && item.id !== currentUserId && item.id !== room.createdById ? (
                        <button
                          type="button"
                          className="group-member-remove"
                          title="Xóa khỏi nhóm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMember(item);
                          }}
                        >
                          <CloseOutlined />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="group-card">
            <button type="button" className="group-row" onClick={() => toggle('photos')}>
              <span className="group-ico">
                <PictureOutlined />
              </span>
              <span className="group-row-text">
                <strong>Ảnh</strong>
                <small>{photos.length} ảnh</small>
              </span>
              <RightOutlined className={openSection === 'photos' ? 'chev open' : 'chev'} />
            </button>
            {openSection === 'photos' ? (
              photos.length ? (
                <div className="group-photos">
                  {previewPhotos.map((image) => (
                    <button key={image.id} type="button" className="group-thumb" onClick={() => setPhotoOpen(true)}>
                      <img src={fileSrc(image.url)} alt="" />
                    </button>
                  ))}
                  {photos.length > 6 ? (
                    <button type="button" className="group-more" onClick={() => setPhotoOpen(true)}>
                      Xem tất cả
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="group-muted">Chưa có ảnh</p>
              )
            ) : null}
            <button type="button" className="group-row" onClick={() => toggle('files')}>
              <span className="group-ico">
                <FileOutlined />
              </span>
              <span className="group-row-text">
                <strong>File</strong>
                <small>{files.length} file</small>
              </span>
              <RightOutlined className={openSection === 'files' ? 'chev open' : 'chev'} />
            </button>
            {openSection === 'files' ? (
              files.length ? (
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
              )
            ) : null}
            <button type="button" className="group-row" onClick={() => toggle('links')}>
              <span className="group-ico">
                <LinkOutlined />
              </span>
              <span className="group-row-text">
                <strong>Link</strong>
                <small>{links.length} link</small>
              </span>
              <RightOutlined className={openSection === 'links' ? 'chev open' : 'chev'} />
            </button>
            {openSection === 'links' ? (
              links.length ? (
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
              )
            ) : null}
          </div>

          <div className="group-card">
            <button type="button" className="group-row" onClick={() => toggle('pins')}>
              <span className="group-ico">
                <PushpinOutlined />
              </span>
              <span className="group-row-text">
                <strong>Tin đã ghim</strong>
                <small>{pins.length} tin</small>
              </span>
              <RightOutlined className={openSection === 'pins' ? 'chev open' : 'chev'} />
            </button>
            {openSection === 'pins' ? (
              pins.length ? (
                <div className="group-list">
                  {pins.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="group-member"
                      onClick={() => {
                        onJumpMessage(item.id);
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
              )
            ) : null}
          </div>

          {room.canDelete ? (
            <div className="group-card">
              <button
                type="button"
                className="group-row group-danger"
                onClick={handleDeleteRoom}
              >
                <span className="group-ico">
                  <DeleteOutlined />
                </span>
                <span className="group-row-text">
                  <strong>Giải tán nhóm</strong>
                  <small>Xóa vĩnh viễn cuộc trò chuyện</small>
                </span>
              </button>
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
              <Image src={fileSrc(image.url)} alt={image.filename} />
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
        title="Thêm thành viên"
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
    </aside>
  );
}

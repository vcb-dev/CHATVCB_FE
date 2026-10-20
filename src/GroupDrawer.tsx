import {
  BellOutlined,
  CameraOutlined,
  CloseOutlined,
  EditOutlined,
  FileOutlined,
  LinkOutlined,
  PictureOutlined,
  PushpinOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Image, Input, Modal, Switch, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, fileSrc } from './api';
import { compressImage, mergePhotos } from './media';
import { notifyEnabled, requestNotifyPermission, setNotifyEnabled } from './notify';
import { avatarColor, initials } from './theme';
import type { ChatMessage, GalleryImage, Room, RoomLink, RoomMember } from './types';

type Props = {
  room: Room | null;
  members: RoomMember[];
  chatPhotos?: GalleryImage[];
  overlay?: boolean;
  onClose?: () => void;
  onRoomUpdated: (room: Room) => void;
  onMembersUpdated: (members: RoomMember[]) => void;
  onJumpMessage: (id: string) => void;
};

export function GroupDrawer({
  room,
  members,
  chatPhotos = [],
  overlay = false,
  onClose,
  onRoomUpdated,
  onMembersUpdated,
  onJumpMessage,
}: Props) {
  const [name, setName] = useState(room?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [photos, setPhotos] = useState<GalleryImage[]>([]);
  const [links, setLinks] = useState<RoomLink[]>([]);
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [nickUser, setNickUser] = useState<RoomMember | null>(null);
  const [nickValue, setNickValue] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [notifyOn, setNotifyOn] = useState(notifyEnabled);
  const [openSection, setOpenSection] = useState<'members' | 'photos' | 'files' | 'links' | 'pins' | null>(
    'members',
  );
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(room?.name ?? '');
    setEditingName(false);
    setPhotoOpen(false);
    setOpenSection('members');
  }, [room?.id]);

  useEffect(() => {
    if (!room) {
      setPhotos([]);
      setLinks([]);
      setPins([]);
      return;
    }
    void api
      .gallery(room.id)
      .then((next) => setPhotos(mergePhotos(chatPhotos, next)))
      .catch(() => setPhotos(chatPhotos));
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

  const previewPhotos = photos.slice(0, 6);

  return (
    <aside className={overlay ? 'group-pane overlay' : 'group-pane'}>
      {overlay ? (
        <button type="button" className="group-pane-mask" aria-label="Đóng thông tin nhóm" onClick={onClose} />
      ) : null}
      <div className="group-pane-head">
        <strong>Thông tin nhóm</strong>
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
              <button type="button" className="group-avatar-btn" onClick={() => avatarRef.current?.click()}>
                <Avatar size={72} src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined} style={{ background: '#0084ff' }}>
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
                <button type="button" className="group-name-btn" onClick={() => setEditingName(true)}>
                  <h2>{room.title || room.name}</h2>
                  <EditOutlined />
                </button>
              )}
              <p className="group-sub">{members.length} thành viên</p>
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
                {members.map((item) => (
                  <button
                    key={item.id}
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
                ))}
              </div>
            ) : null}
          </div>

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
                <small>0 file</small>
              </span>
              <RightOutlined className={openSection === 'files' ? 'chev open' : 'chev'} />
            </button>
            {openSection === 'files' ? <p className="group-muted">Chưa có file</p> : null}
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
        onOk={() => void saveNick()}
        okText="Lưu"
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
    </aside>
  );
}

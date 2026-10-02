import {
  CameraOutlined,
  EditOutlined,
  FileOutlined,
  LinkOutlined,
  PictureOutlined,
  PushpinOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Drawer, Empty, Image, Input, Modal, Tabs, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, fileSrc } from './api';
import { avatarColor, initials } from './theme';
import type { ChatMessage, GalleryImage, Room, RoomLink, RoomMember } from './types';

type TabKey = 'members' | 'photos' | 'files' | 'links' | 'pins';

type Props = {
  open: boolean;
  room: Room | null;
  members: RoomMember[];
  onClose: () => void;
  onRoomUpdated: (room: Room) => void;
  onMembersUpdated: (members: RoomMember[]) => void;
  onJumpMessage: (id: string) => void;
};

export function GroupDrawer({
  open,
  room,
  members,
  onClose,
  onRoomUpdated,
  onMembersUpdated,
  onJumpMessage,
}: Props) {
  const [tab, setTab] = useState<TabKey>('members');
  const [name, setName] = useState(room?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [photos, setPhotos] = useState<GalleryImage[]>([]);
  const [links, setLinks] = useState<RoomLink[]>([]);
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [nickUser, setNickUser] = useState<RoomMember | null>(null);
  const [nickValue, setNickValue] = useState('');
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(room?.name ?? '');
    setEditingName(false);
    setTab('members');
  }, [room?.id, open]);

  useEffect(() => {
    if (!open || !room) {
      return;
    }
    if (tab === 'photos' || tab === 'files') {
      void api.gallery(room.id).then(setPhotos).catch(() => setPhotos([]));
    }
    if (tab === 'links') {
      void api.links(room.id).then(setLinks).catch(() => setLinks([]));
    }
    if (tab === 'pins') {
      void api.pins(room.id).then(setPins).catch(() => setPins([]));
    }
  }, [open, room, tab]);

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
      onRoomUpdated(await api.uploadRoomAvatar(room.id, file));
      message.success('Đã đổi ảnh nhóm.');
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

  return (
    <Drawer title="Thông tin nhóm" open={open} onClose={onClose} width={380}>
      <div className="group-hero">
        <button type="button" className="group-avatar-btn" onClick={() => avatarRef.current?.click()}>
          <Avatar size={72} src={room?.avatarUrl ? fileSrc(room.avatarUrl) : undefined} style={{ background: '#0084ff' }}>
            {room ? initials(room.name) : '?'}
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
            <Button type="primary" onClick={() => void saveName()}>
              Lưu
            </Button>
          </div>
        ) : (
          <button type="button" className="group-name-btn" onClick={() => setEditingName(true)}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {room?.name}
            </Typography.Title>
            <EditOutlined />
          </button>
        )}
        <Typography.Text type="secondary">{members.length} thành viên</Typography.Text>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          {
            key: 'members',
            label: (
              <span>
                <TeamOutlined /> Thành viên
              </span>
            ),
            children: (
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
                      src={item.avatarUrl ? fileSrc(item.avatarUrl) : undefined}
                      style={{ background: avatarColor(item.displayName || item.name) }}
                    >
                      {initials(item.displayName || item.name)}
                    </Avatar>
                    <span>
                      <strong>{item.displayName || item.name}</strong>
                      <small>
                        @{item.handle}
                        {item.nickname ? ` · ${item.name}` : ''}
                      </small>
                    </span>
                    <UserOutlined />
                  </button>
                ))}
              </div>
            ),
          },
          {
            key: 'photos',
            label: (
              <span>
                <PictureOutlined /> Ảnh
              </span>
            ),
            children: photos.length ? (
              <div className="gallery-grid">
                {photos.map((image) => (
                  <div key={image.id} className="gallery-item">
                    <Image src={fileSrc(image.url)} alt={image.filename} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="Chưa có ảnh trong nhóm" />
            ),
          },
          {
            key: 'files',
            label: (
              <span>
                <FileOutlined /> File
              </span>
            ),
            children: photos.length ? (
              <div className="group-list">
                {photos.map((image) => (
                  <a
                    key={image.id}
                    className="group-link"
                    href={fileSrc(image.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileOutlined />
                    <span>
                      <strong>{image.filename}</strong>
                      <small>{new Date(image.createdAt).toLocaleString('vi-VN')}</small>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <Empty description="Chưa có file trong nhóm" />
            ),
          },
          {
            key: 'links',
            label: (
              <span>
                <LinkOutlined /> Link
              </span>
            ),
            children: links.length ? (
              <div className="group-list">
                {links.map((item) => (
                  <a key={`${item.messageId}-${item.url}`} className="group-link" href={item.url} target="_blank" rel="noreferrer">
                    <LinkOutlined />
                    <span>
                      <strong>{item.url}</strong>
                      <small>{item.authorName}</small>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <Empty description="Chưa có link trong nhóm" />
            ),
          },
          {
            key: 'pins',
            label: (
              <span>
                <PushpinOutlined /> Đã ghim
              </span>
            ),
            children: pins.length ? (
              <div className="group-list">
                {pins.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="group-pin"
                    onClick={() => {
                      onJumpMessage(item.id);
                      onClose();
                    }}
                  >
                    <PushpinOutlined />
                    <span>
                      <strong>{item.authorName}</strong>
                      <small>{item.content || (item.imageUrl ? '[Ảnh]' : 'Tin đã ghim')}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Empty description="Chưa ghim tin nào" />
            ),
          },
        ]}
      />

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
    </Drawer>
  );
}

import {
  AudioMutedOutlined,
  AudioOutlined,
  DesktopOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Input } from 'antd';
import { useEffect, useRef } from 'react';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { Meeting, MeetingPeer, User } from '@/types';

export type SideTab = 'chat' | 'peers' | 'notes';

export type ChatItem = {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
};

type Props = {
  tab: SideTab;
  meeting: Meeting;
  user: User;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  peers: MeetingPeer[];
  hands: { userId: string; name: string }[];
  chat: ChatItem[];
  draft: string;
  notes: string;
  savingNotes: boolean;
  onTabChange: (tab: SideTab) => void;
  onDraftChange: (v: string) => void;
  onSendChat: () => void;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onClose: () => void;
};

export function MeetingSidePanel({
  tab,
  meeting,
  user,
  micOn,
  camOn,
  sharing,
  peers,
  hands,
  chat,
  draft,
  notes,
  savingNotes,
  onTabChange,
  onDraftChange,
  onSendChat,
  onNotesChange,
  onSaveNotes,
  onClose,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat, tab]);

  const selfHand = hands.some((h) => h.userId === user.id);

  return (
    <aside className="meet-chat">
      <header className="meet-side-head">
        <div className="meet-side-tabs">
          <button
            type="button"
            className={tab === 'chat' ? 'is-active' : ''}
            onClick={() => onTabChange('chat')}
          >
            Tin nhắn
          </button>
          <button
            type="button"
            className={tab === 'peers' ? 'is-active' : ''}
            onClick={() => onTabChange('peers')}
          >
            Người tham gia ({peers.length + 1})
          </button>
          <button
            type="button"
            className={tab === 'notes' ? 'is-active' : ''}
            onClick={() => onTabChange('notes')}
          >
            Biên bản
          </button>
        </div>
        <button type="button" className="meet-side-close" onClick={onClose}>
          Đóng
        </button>
      </header>

      {tab === 'chat' ? (
        <>
          <div className="meet-chat-list">
            {chat.length ? (
              chat.map((item) => (
                <p key={item.id}>
                  <b>{item.name}</b>
                  {item.text}
                </p>
              ))
            ) : (
              <p className="meet-side-empty">Chưa có tin nhắn trong cuộc họp.</p>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="meet-chat-form">
            <Input
              value={draft}
              placeholder="Nhắn cho mọi người"
              onChange={(event) => onDraftChange(event.target.value)}
              onPressEnter={onSendChat}
            />
            <Button type="primary" onClick={onSendChat}>
              Gửi
            </Button>
          </div>
        </>
      ) : null}

      {tab === 'peers' ? (
        <div className="meet-peer-list">
          <div className="meet-peer-row">
            <Avatar
              size={34}
              src={user.avatarUrl ? fileSrc(user.avatarUrl) : undefined}
              style={{ background: avatarColor(user.name) }}
            >
              {initials(user.name)}
            </Avatar>
            <div className="meet-peer-meta">
              <strong>
                {user.name} (Tôi)
                {user.id === meeting.hostId ? (
                  <span className="meet-host-tag">Chủ phòng</span>
                ) : null}
              </strong>
              <small>{selfHand ? '✋ Đang giơ tay' : 'Đang trong phòng'}</small>
            </div>
            <div className="meet-peer-icons">
              {sharing ? <DesktopOutlined className="is-on" title="Đang chia sẻ màn hình" /> : null}
              {micOn ? (
                <AudioOutlined className="is-on" />
              ) : (
                <AudioMutedOutlined className="is-off" />
              )}
              <VideoCameraOutlined className={camOn ? 'is-on' : 'is-off'} />
            </div>
          </div>

          {peers.map((peer) => {
            const hand = hands.some((h) => h.userId === peer.userId);
            return (
              <div key={peer.socketId} className="meet-peer-row">
                <Avatar
                  size={34}
                  src={peer.avatarUrl ? fileSrc(peer.avatarUrl) : undefined}
                  style={{ background: avatarColor(peer.name) }}
                >
                  {initials(peer.name)}
                </Avatar>
                <div className="meet-peer-meta">
                  <strong>
                    {peer.name}
                    {peer.userId === meeting.hostId ? (
                      <span className="meet-host-tag">Chủ phòng</span>
                    ) : null}
                  </strong>
                  <small>{hand ? '✋ Đang giơ tay' : 'Đang trong phòng'}</small>
                </div>
                <div className="meet-peer-icons">
                  {peer.sharing ? (
                    <DesktopOutlined className="is-on" title="Đang chia sẻ màn hình" />
                  ) : null}
                  {peer.micOn ? (
                    <AudioOutlined className="is-on" />
                  ) : (
                    <AudioMutedOutlined className="is-off" />
                  )}
                  <VideoCameraOutlined className={peer.camOn ? 'is-on' : 'is-off'} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div className="meet-notes-pane">
          <Input.TextArea
            rows={12}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Ghi biên bản cuộc họp (mọi người trong phòng đều thấy khi lưu)..."
          />
          <Button
            type="primary"
            block
            loading={savingNotes}
            onClick={onSaveNotes}
          >
            Lưu biên bản
          </Button>
        </div>
      ) : null}
    </aside>
  );
}


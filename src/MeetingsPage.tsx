import {
  CalendarOutlined,
  FileTextOutlined,
  UserAddOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Input, Modal, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { openMeetTab } from './meet';
import type { Meeting, User } from './types';

type Props = {
  user: User;
};

function formatWhen(value?: string | null) {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MeetingsPage({ user }: Props) {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [history, setHistory] = useState<Meeting[]>([]);
  const [query, setQuery] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [notesOpen, setNotesOpen] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const next = await api.listMeetings();
      setUpcoming(next.upcoming);
      setHistory(next.history);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được cuộc họp.');
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  function joinByCode() {
    const code = joinCode.trim();
    if (!code) {
      message.warning('Nhập mã họp.');
      return;
    }
    setJoinOpen(false);
    setJoinCode('');
    openMeetTab(code);
  }

  async function saveSchedule() {
    if (!scheduleAt) {
      message.warning('Chọn thời gian họp.');
      return;
    }
    try {
      await api.createMeeting({
        title: scheduleTitle.trim() || 'Cuộc họp đã lên lịch',
        scheduledAt: scheduleAt,
      });
      setScheduleOpen(false);
      setScheduleTitle('');
      setScheduleAt('');
      message.success('Đã lên lịch.');
      void load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lên lịch được.');
    }
  }

  async function saveNotes() {
    if (!notesOpen) {
      return;
    }
    try {
      await api.saveMeetingNotes(notesOpen.id, notes);
      setNotesOpen(null);
      message.success('Đã lưu biên bản.');
      void load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được biên bản.');
    }
  }

  const q = query.trim().toLowerCase();
  const upcomingView = upcoming.filter((item) => !q || item.title.toLowerCase().includes(q) || item.code.includes(q));
  const historyView = history.filter((item) => !q || item.title.toLowerCase().includes(q) || item.code.includes(q));

  return (
    <main className="meet-page">
      <header className="meet-head">
        <h1>Cuộc họp</h1>
        <Input.Search
          allowClear
          placeholder="Tìm cuộc họp hoặc mã"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ maxWidth: 280 }}
        />
      </header>

      <div className="meet-layout">
        <section className="meet-actions">
          <button type="button" className="meet-card blue" onClick={() => openMeetTab()}>
            <span className="meet-ico">
              <VideoCameraOutlined />
            </span>
            <strong>Cuộc họp mới</strong>
          </button>
          <button type="button" className="meet-card blue" onClick={() => setJoinOpen(true)}>
            <span className="meet-ico">
              <UserAddOutlined />
            </span>
            <strong>Tham gia</strong>
          </button>
          <button type="button" className="meet-card peach" onClick={() => setScheduleOpen(true)}>
            <span className="meet-ico">
              <CalendarOutlined />
            </span>
            <strong>Lên lịch</strong>
          </button>
          <button
            type="button"
            className="meet-card violet"
            onClick={() => {
              const target = history[0] || upcoming[0];
              if (!target) {
                message.info('Chưa có cuộc họp để ghi biên bản.');
                return;
              }
              setNotesOpen(target);
              setNotes(target.notes || '');
            }}
          >
            <span className="meet-ico">
              <FileTextOutlined />
            </span>
            <strong>Biên bản</strong>
          </button>
        </section>

        <section className="meet-lists">
          <div className="meet-panel">
            <div className="meet-panel-head">Sắp diễn ra</div>
            {upcomingView.length ? (
              upcomingView.map((item) => (
                <button key={item.id} type="button" className="meet-row" onClick={() => openMeetTab(item.code)}>
                  <span className="meet-row-ico">
                    <VideoCameraOutlined />
                  </span>
                  <span className="meet-row-body">
                    <strong>{item.title}</strong>
                    <small>
                      {formatWhen(item.scheduledAt || item.startedAt)} · ID {item.code}
                    </small>
                  </span>
                  <em className={item.startedAt && !item.endedAt ? 'live' : ''}>
                    {item.endedAt ? 'Đã xong' : item.startedAt ? 'Đang họp' : 'Sắp họp'}
                  </em>
                </button>
              ))
            ) : (
              <p className="meet-empty">Chưa có cuộc họp sắp tới</p>
            )}
          </div>

          <div className="meet-panel">
            <div className="meet-panel-head">Lịch sử</div>
            {historyView.length ? (
              historyView.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="meet-row"
                  onClick={() => {
                    setNotesOpen(item);
                    setNotes(item.notes || '');
                  }}
                >
                  <span className="meet-row-ico doc">
                    <FileTextOutlined />
                  </span>
                  <span className="meet-row-body">
                    <strong>{item.title}</strong>
                    <small>
                      {item.hostName} · {formatWhen(item.endedAt || item.createdAt)}
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <p className="meet-empty">Chưa có lịch sử họp</p>
            )}
          </div>
        </section>
      </div>

      <Modal title="Tham gia cuộc họp" open={joinOpen} onCancel={() => setJoinOpen(false)} onOk={joinByCode} okText="Mở tab họp">
        <Input
          size="large"
          placeholder="Nhập mã họp"
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          onPressEnter={() => void joinByCode()}
        />
      </Modal>

      <Modal title="Lên lịch cuộc họp" open={scheduleOpen} onCancel={() => setScheduleOpen(false)} onOk={() => void saveSchedule()} okText="Tạo lịch">
        <Input
          size="large"
          placeholder="Tên cuộc họp"
          value={scheduleTitle}
          onChange={(event) => setScheduleTitle(event.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Input
          type="datetime-local"
          size="large"
          onChange={(event) => {
            setScheduleAt(event.target.value ? new Date(event.target.value).toISOString() : '');
          }}
        />
      </Modal>

      <Modal
        title={`Biên bản · ${notesOpen?.title ?? ''}`}
        open={Boolean(notesOpen)}
        onCancel={() => setNotesOpen(null)}
        onOk={() => void saveNotes()}
        okText="Lưu"
      >
        <Typography.Paragraph type="secondary">
          {notesOpen ? `ID ${notesOpen.code}` : ''}
        </Typography.Paragraph>
        <Input.TextArea rows={8} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ghi chú cuộc họp" />
      </Modal>
    </main>
  );
}

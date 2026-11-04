import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  UserAddOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal, Select, Tooltip, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { openMeetTab } from './meet';
import type { Meeting, User } from '@/types';

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

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MeetingsPage({ user }: Props) {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [history, setHistory] = useState<Meeting[]>([]);
  const [query, setQuery] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');
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

  const allMeetings = useMemo(() => {
    const seen = new Set<string>();
    const list: Meeting[] = [];
    for (const item of [...upcoming, ...history]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        list.push(item);
      }
    }
    return list;
  }, [upcoming, history]);

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

  function openCreateSchedule() {
    setEditingMeeting(null);
    setScheduleTitle('');
    setScheduleInput('');
    setScheduleOpen(true);
  }

  function openEditSchedule(item: Meeting) {
    setEditingMeeting(item);
    setScheduleTitle(item.title);
    const baseDate = item.scheduledAt || item.startedAt;
    setScheduleInput(baseDate ? toLocalInput(new Date(baseDate)) : '');
    setScheduleOpen(true);
  }

  async function saveSchedule() {
    if (!scheduleInput) {
      message.warning('Chọn thời gian họp.');
      return;
    }
    const picked = new Date(scheduleInput);
    if (Number.isNaN(picked.getTime()) || picked.getTime() < Date.now() - 60_000) {
      message.warning('Thời gian họp phải ở tương lai.');
      return;
    }
    const iso = picked.toISOString();
    try {
      if (editingMeeting) {
        await api.updateMeeting(editingMeeting.id, {
          title: scheduleTitle.trim() || editingMeeting.title,
          scheduledAt: iso,
        });
        message.success('Đã cập nhật lịch họp.');
      } else {
        await api.createMeeting({
          title: scheduleTitle.trim() || 'Cuộc họp đã lên lịch',
          scheduledAt: iso,
        });
        message.success('Đã lên lịch.');
      }
      setScheduleOpen(false);
      setEditingMeeting(null);
      setScheduleTitle('');
      setScheduleInput('');
      void load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lên lịch được.');
    }
  }

  function confirmDeleteSchedule(item: Meeting) {
    Modal.confirm({
      title: 'Hủy cuộc họp này?',
      content: `Cuộc họp "${item.title}" sẽ bị xóa khỏi danh sách.`,
      okText: 'Hủy lịch',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          await api.deleteMeeting(item.id);
          message.success('Đã hủy cuộc họp.');
          void load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Không hủy được cuộc họp.');
        }
      },
    });
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
  const upcomingView = upcoming.filter(
    (item) => !q || item.title.toLowerCase().includes(q) || item.code.includes(q),
  );
  const historyView = history.filter(
    (item) => !q || item.title.toLowerCase().includes(q) || item.code.includes(q),
  );

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
          <button type="button" className="meet-card peach" onClick={openCreateSchedule}>
            <span className="meet-ico">
              <CalendarOutlined />
            </span>
            <strong>Lên lịch</strong>
          </button>
          <button
            type="button"
            className="meet-card violet"
            onClick={() => {
              const target = allMeetings[0];
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
              upcomingView.map((item) => {
                const isLive = Boolean(item.isLive || (item.startedAt && !item.endedAt));
                const isHost = item.hostId === user.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className="meet-row"
                    onClick={() => openMeetTab(item.code)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openMeetTab(item.code);
                      }
                    }}
                  >
                    <span className="meet-row-ico">
                      <VideoCameraOutlined />
                    </span>
                    <span className="meet-row-body">
                      <strong>{item.title}</strong>
                      <small>
                        {formatWhen(item.scheduledAt || item.startedAt)} · ID {item.code}
                      </small>
                    </span>
                    <em className={isLive ? 'live' : ''}>
                      {item.endedAt ? 'Đã xong' : isLive ? 'Đang họp' : 'Sắp họp'}
                    </em>
                    <span
                      className="meet-row-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Tooltip title="Biên bản">
                        <Button
                          type="text"
                          size="small"
                          icon={<FileTextOutlined />}
                          aria-label="Biên bản"
                          onClick={() => {
                            setNotesOpen(item);
                            setNotes(item.notes || '');
                          }}
                        />
                      </Tooltip>
                      {isHost ? (
                        <>
                          <Tooltip title="Sửa lịch">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              aria-label="Sửa lịch"
                              onClick={() => openEditSchedule(item)}
                            />
                          </Tooltip>
                          <Tooltip title="Hủy lịch">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              aria-label="Hủy lịch"
                              onClick={() => confirmDeleteSchedule(item)}
                            />
                          </Tooltip>
                        </>
                      ) : null}
                    </span>
                  </div>
                );
              })
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

      <Modal
        title="Tham gia cuộc họp"
        open={joinOpen}
        onCancel={() => setJoinOpen(false)}
        onOk={joinByCode}
        okText="Mở tab họp"
      >
        <Input
          size="large"
          placeholder="Nhập mã họp"
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          onPressEnter={() => void joinByCode()}
        />
      </Modal>

      <Modal
        title={editingMeeting ? 'Sửa lịch cuộc họp' : 'Lên lịch cuộc họp'}
        open={scheduleOpen}
        onCancel={() => {
          setScheduleOpen(false);
          setEditingMeeting(null);
        }}
        onOk={() => void saveSchedule()}
        okText={editingMeeting ? 'Lưu thay đổi' : 'Tạo lịch'}
      >
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
          value={scheduleInput}
          min={toLocalInput(new Date(Date.now() + 60_000))}
          onChange={(event) => setScheduleInput(event.target.value)}
        />
      </Modal>

      <Modal
        title={`Biên bản · ${notesOpen?.title ?? ''}`}
        open={Boolean(notesOpen)}
        onCancel={() => setNotesOpen(null)}
        onOk={() => void saveNotes()}
        okText="Lưu"
      >
        {allMeetings.length > 1 ? (
          <Select
            style={{ width: '100%', marginBottom: 10 }}
            value={notesOpen?.id}
            onChange={(id) => {
              const found = allMeetings.find((m) => m.id === id);
              if (found) {
                setNotesOpen(found);
                setNotes(found.notes || '');
              }
            }}
            options={allMeetings.map((m) => ({
              value: m.id,
              label: `${m.title} · ID ${m.code} (${formatWhen(m.scheduledAt || m.startedAt || m.createdAt)})`,
            }))}
          />
        ) : null}
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          {notesOpen ? `ID ${notesOpen.code} · Chủ phòng: ${notesOpen.hostName}` : ''}
        </Typography.Paragraph>
        <Input.TextArea
          rows={8}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ghi chú cuộc họp"
        />
      </Modal>
    </main>
  );
}

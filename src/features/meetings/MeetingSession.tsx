import { Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { MeetingLobby, type LobbyReady } from './MeetingLobby';
import { MeetingRoom } from './MeetingRoom';
import { closeMeetTab } from './meet';
import type { Meeting, User } from '@/types';

type Props = {
  user: User;
  code?: string;
};

export function MeetingSession({ user, code }: Props) {
  const [seed, setSeed] = useState<Meeting | null>(null);
  const [active, setActive] = useState<Meeting | null>(null);
  const [session, setSession] = useState<LobbyReady | null>(null);
  const [loading, setLoading] = useState(Boolean(code));

  useEffect(() => {
    document.title = 'Cuộc họp · CHATVCB';
    return () => {
      document.title = 'CHATVCB';
    };
  }, []);

  useEffect(() => {
    if (!code) {
      return;
    }
    let alive = true;
    void api
      .listMeetings()
      .then((next) => {
        if (!alive) {
          return;
        }
        setSeed([...next.upcoming, ...next.history].find((item) => item.code === code) ?? null);
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [code]);

  async function start(next: LobbyReady) {
    try {
      const meeting = next.meeting
        ? await api.joinMeeting(next.meeting.code)
        : code
          ? await api.joinMeeting(code)
          : await api.createMeeting({ title: next.title });
      next.stream = null;
      setSession(next);
      setActive(meeting);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không vào được cuộc họp.');
    }
  }

  if (loading) {
    return (
      <div className="meet-lobby">
        <Spin size="large" />
      </div>
    );
  }

  if (active) {
    return (
      <MeetingRoom
        meeting={active}
        user={user}
        initialMic={session?.micOn ?? true}
        initialCam={session?.camOn ?? true}
        onLeave={closeMeetTab}
      />
    );
  }

  return (
    <MeetingLobby
      user={user}
      meeting={seed ?? undefined}
      onCancel={closeMeetTab}
      onReady={(next) => void start(next)}
    />
  );
}

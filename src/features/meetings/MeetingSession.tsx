import { useQuery } from '@tanstack/react-query';
import { Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { MeetingLobby, type LobbyReady } from './MeetingLobby';
import { MeetingRoom } from './MeetingRoom';
import { closeMeetTab } from './meet';
import type { Meeting, User } from '@/types';

type Props = {
  user: User;
  code?: string;
};

export function MeetingSession({ user, code }: Props) {
  // Không tìm thấy mã (lỗi) thì seed = null như trước; mã sai không cần thử lại
  const seedQuery = useQuery({
    queryKey: queryKeys.meetingByCode(code ?? ''),
    queryFn: () => api.getMeetingByCode(code ?? ''),
    enabled: Boolean(code),
    retry: false,
  });
  const seed = seedQuery.data ?? null;
  const loading = Boolean(code) && seedQuery.isPending;
  const [active, setActive] = useState<Meeting | null>(null);
  const [session, setSession] = useState<LobbyReady | null>(null);

  useEffect(() => {
    document.title = 'Cuộc họp · CHATVCB';
    return () => {
      document.title = 'CHATVCB';
    };
  }, []);

  async function start(next: LobbyReady) {
    try {
      let meeting: Meeting;
      if (next.meeting) {
        if (
          next.meeting.hostId === user.id &&
          next.title.trim() &&
          next.title.trim() !== next.meeting.title
        ) {
          await api
            .updateMeeting(next.meeting.id, { title: next.title.trim() })
            .catch(() => undefined);
        }
        meeting = await api.joinMeeting(next.meeting.code);
      } else if (code) {
        meeting = await api.joinMeeting(code);
      } else {
        meeting = await api.createMeeting({ title: next.title });
      }
      setSession(next);
      setActive(meeting);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không vào được cuộc họp.');
      throw err;
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
        initialStream={session?.stream ?? null}
        initialMic={session?.micOn ?? true}
        initialCam={session?.camOn ?? true}
        initialAudioDeviceId={session?.audioDeviceId}
        initialVideoDeviceId={session?.videoDeviceId}
        onLeave={closeMeetTab}
      />
    );
  }

  return (
    <MeetingLobby
      user={user}
      meeting={seed ?? undefined}
      onCancel={closeMeetTab}
      onReady={(next) => start(next)}
    />
  );
}

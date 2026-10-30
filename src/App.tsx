import { Spin } from 'antd';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LoginPage } from '@/features/auth/LoginPage';
import { MeetingSession } from '@/features/meetings/MeetingSession';
import { parseMeetHash } from '@/features/meetings/meet';
import { parseSheetHash } from '@/features/docs/sheet';
import { SheetSession } from '@/features/docs/SheetSession';
import { queryClient } from '@/lib/queryClient';
import { AppTheme } from '@/theme/AppTheme';
import type { User } from '@/types';

const ChatPage = lazy(async () => {
  const mod = await import('@/features/chat/ChatPage');
  return { default: mod.ChatPage };
});

function readUser(): User | null {
  const raw = localStorage.getItem('chatvcb.user');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export default function App() {
  const initialUser = useMemo(() => {
    return localStorage.getItem('chatvcb.token') ? readUser() : null;
  }, []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [meet, setMeet] = useState(() => parseMeetHash());
  const [sheet, setSheet] = useState(() => parseSheetHash());

  useEffect(() => {
    const onHash = () => {
      setMeet(parseMeetHash());
      setSheet(parseSheetHash());
    };
    const onUnauthorized = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('chatvcb:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('chatvcb:unauthorized', onUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!user && !meet && !sheet) {
      void import('@/features/chat/ChatPage');
    }
  }, [meet, sheet, user]);

  return (
    <AppTheme>
      {!user ? (
        <LoginPage
          onLoggedIn={(next) => {
            localStorage.setItem('chatvcb.token', next.token);
            localStorage.setItem('chatvcb.user', JSON.stringify(next.user));
            setUser(next.user);
          }}
        />
      ) : (
        <Suspense
          fallback={
            <div className="login-shell">
              <Spin size="large" />
            </div>
          }
        >
          {sheet ? (
            <SheetSession user={user} />
          ) : meet ? (
            <MeetingSession user={user} code={meet.code} />
          ) : (
          <ChatPage
            user={user}
            onUserUpdate={(next) => {
              localStorage.setItem('chatvcb.token', next.token);
              localStorage.setItem('chatvcb.user', JSON.stringify(next.user));
              setUser(next.user);
            }}
            onLogout={() => {
              localStorage.removeItem('chatvcb.token');
              localStorage.removeItem('chatvcb.user');
              queryClient.clear();
              setUser(null);
            }}
          />
          )}
        </Suspense>
      )}
    </AppTheme>
  );
}

import { Button, Flex, message as antMessage, Spin, Typography } from 'antd';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { SessionExpiredError } from '@/api/session';
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

type Boot = 'loading' | 'ready' | 'offline';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState<Boot>('loading');
  const [meet, setMeet] = useState(() => parseMeetHash());
  const [sheet, setSheet] = useState(() => parseSheetHash());

  const loadSession = useCallback(async () => {
    setBoot('loading');
    try {
      const session = await api.session();
      setUser(session.user);
      setBoot('ready');
    } catch (err) {
      setBoot(err instanceof SessionExpiredError ? 'ready' : 'offline');
    }
  }, []);

  useEffect(() => {
    // Dọn dữ liệu phiên của bản cũ
    localStorage.removeItem('chatvcb.token');
    localStorage.removeItem('chatvcb.user');
    void loadSession();
  }, [loadSession]);

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
    const onUserRefreshed = (event: Event) => {
      const detail = (event as CustomEvent<User>).detail;
      if (detail) {
        setUser(detail);
      }
    };
    window.addEventListener('chatvcb:user-refreshed', onUserRefreshed);
    return () => window.removeEventListener('chatvcb:user-refreshed', onUserRefreshed);
  }, []);

  useEffect(() => {
    if (!user && !meet && !sheet) {
      void import('@/features/chat/ChatPage');
    }
  }, [meet, sheet, user]);

  return (
    <AppTheme>
      {boot === 'loading' ? (
        <div className="login-shell">
          <Spin size="large" />
        </div>
      ) : boot === 'offline' ? (
        <div className="login-shell">
          <Flex vertical align="center" gap={12}>
            <Typography.Text>Không kết nối được máy chủ</Typography.Text>
            <Button type="primary" onClick={() => void loadSession()}>
              Thử lại
            </Button>
          </Flex>
        </div>
      ) : !user ? (
        <LoginPage onLoggedIn={(next) => setUser(next.user)} />
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
            onUserUpdate={(next) => setUser(next.user)}
            onLogout={async () => {
              try {
                await api.logout();
                queryClient.clear();
                setUser(null);
              } catch {
                // JS không xóa được cookie httpOnly: báo lỗi thay vì giả vờ đã thoát
                void antMessage.error('Không đăng xuất được, thử lại.');
              }
            }}
          />
          )}
        </Suspense>
      )}
    </AppTheme>
  );
}

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LoginPage } from './LoginPage';
import type { User } from './types';

const ChatPage = lazy(async () => {
  const mod = await import('./ChatPage');
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

  useEffect(() => {
    if (!user) {
      void import('./ChatPage');
    }
  }, [user]);

  if (!user) {
    return (
      <LoginPage
        onLoggedIn={(next) => {
          localStorage.setItem('chatvcb.token', next.token);
          localStorage.setItem('chatvcb.user', JSON.stringify(next.user));
          setUser(next.user);
        }}
      />
    );
  }

  return (
    <Suspense fallback={<div className="login-shell">Đang vào phòng chat...</div>}>
      <ChatPage
        user={user}
        onLogout={() => {
          localStorage.removeItem('chatvcb.token');
          localStorage.removeItem('chatvcb.user');
          setUser(null);
        }}
      />
    </Suspense>
  );
}

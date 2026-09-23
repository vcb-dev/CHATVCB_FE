import { useMemo, useState } from 'react';
import { ChatPage } from './ChatPage';
import { LoginPage } from './LoginPage';
import type { User } from './types';

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
    <ChatPage
      user={user}
      onLogout={() => {
        localStorage.removeItem('chatvcb.token');
        localStorage.removeItem('chatvcb.user');
        setUser(null);
      }}
    />
  );
}

import { useState, type FormEvent } from 'react';
import { api } from './api';
import type { User } from './types';

type Props = {
  onLoggedIn: (payload: { token: string; user: User }) => void;
};

export function LoginPage({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(email.trim(), password)
          : await api.register(name.trim(), email.trim(), password);
      onLoggedIn(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng nhập được.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">CHATVCB</p>
        <h1>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
        <p className="muted">
          Team Sale: mỗi người chỉ vào được phòng chat của team mình. Test 2
          người: tab thường + tab ẩn danh — sale1 / sale2 — Password123
        </p>
        {mode === 'register' ? (
          <>
            <label htmlFor="name">Họ tên</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sale Ba"
              required
            />
          </>
        ) : null}
        <label htmlFor="email">Email hoặc tài khoản</label>
        <input
          id="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="sale1 hoặc sale1@chatvcb.vn"
          autoFocus
          required
        />
        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Tối thiểu 6 ký tự"
          minLength={6}
          required
        />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </button>
        <button
          type="button"
          className="linkish"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

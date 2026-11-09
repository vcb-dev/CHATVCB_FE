import {
  DownOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Form, Input, InputNumber, Modal, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { MailAccount, MailItem, MailMessage } from '@/types';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

const SELECTED_KEY = 'chatvcb.mailAccount';

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

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-4.1 5.6-7.6 6.5l6.3 5.3C37.4 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function EmailPage() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountId, setAccountId] = useState(() => localStorage.getItem(SELECTED_KEY) || '');
  const [items, setItems] = useState<MailItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [opened, setOpened] = useState<MailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form] = Form.useForm();

  const account = accounts.find((item) => item.id === accountId) || accounts[0];

  const loadAccounts = useCallback(async (preferId?: string) => {
    const next = await api.listMailAccounts();
    setAccounts(next);
    const saved = preferId || localStorage.getItem(SELECTED_KEY) || '';
    const chosen = next.find((item) => item.id === saved)?.id || next[0]?.id || '';
    setAccountId(chosen);
    if (chosen) {
      localStorage.setItem(SELECTED_KEY, chosen);
    } else {
      localStorage.removeItem(SELECTED_KEY);
    }
    return chosen;
  }, []);

  const loadInbox = useCallback(async (id: string) => {
    if (!id) {
      setItems([]);
      setTotal(0);
      setSelectedUid(null);
      setOpened(null);
      return;
    }
    setLoading(true);
    try {
      const inbox = await api.mailInbox(id);
      setItems(inbox.items);
      setTotal(inbox.total);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được hộp thư.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('mail');
    if (status === 'ok') {
      message.success('Đã đăng nhập Gmail.');
    } else if (status === 'error') {
      message.error('Không đăng nhập được Google. Thử lại.');
    }
  }, []);

  useEffect(() => {
    void loadAccounts()
      .then((id) => loadInbox(id))
      .catch((err) => {
        message.error(err instanceof Error ? err.message : 'Không tải được hộp thư.');
      });
  }, [loadAccounts, loadInbox]);

  async function switchAccount(id: string) {
    setAccountId(id);
    localStorage.setItem(SELECTED_KEY, id);
    setSelectedUid(null);
    setOpened(null);
    await loadInbox(id);
  }

  async function loginGoogle() {
    setGoogleLoading(true);
    try {
      const next = await api.googleMailUrl();
      window.location.assign(next.url);
    } catch (err) {
      setGoogleLoading(false);
      message.error(err instanceof Error ? err.message : 'Không mở được Google.');
    }
  }

  async function connect() {
    try {
      const values = await form.validateFields();
      setConnecting(true);
      const next = await api.connectMail({
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
        imapHost: values.imapHost || undefined,
        imapPort: values.imapPort || undefined,
      });
      form.resetFields();
      setConnectOpen(false);
      message.success(`Đã đăng nhập ${next.email}`);
      await loadAccounts(next.id);
      await loadInbox(next.id);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
      message.error(err instanceof Error ? err.message : 'Không đăng nhập được mail.');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect(id: string) {
    try {
      await api.removeMailAccount(id);
      message.success('Đã gỡ hộp thư.');
      const chosen = await loadAccounts();
      await loadInbox(chosen);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gỡ được hộp thư.');
    }
  }

  async function openMail(uid: string) {
    if (!account) {
      return;
    }
    setSelectedUid(uid);
    setReading(true);
    try {
      setOpened(await api.mailMessage(account.id, uid));
      setItems((current) => current.map((item) => (item.uid === uid ? { ...item, seen: true } : item)));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không mở được thư.');
    } finally {
      setReading(false);
    }
  }

  const loginForm = (
    <Form form={form} layout="vertical" className="mail-form" requiredMark={false}>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email.' }]}>
        <Input placeholder="ten@vienchibao.com" autoComplete="username" />
      </Form.Item>
      <Form.Item name="password" label="Mật khẩu IMAP" rules={[{ required: true, message: 'Nhập mật khẩu.' }]}>
        <Input.Password placeholder="Mật khẩu IMAP" autoComplete="current-password" />
      </Form.Item>
      <Form.Item name="displayName" label="Tên hiển thị">
        <Input placeholder="Hộp thư công ty" />
      </Form.Item>
      <Form.Item name="imapHost" label="IMAP host">
        <Input placeholder="imap.vienchibao.com" />
      </Form.Item>
      <Form.Item name="imapPort" label="Cổng IMAP">
        <InputNumber min={1} max={65535} placeholder="993" style={{ width: '100%' }} />
      </Form.Item>
    </Form>
  );

  const googleButton = (
    <button type="button" className="mail-google" disabled={googleLoading} onClick={() => void loginGoogle()}>
      <GoogleMark />
      {googleLoading ? 'Đang mở Google…' : 'Đăng nhập bằng Google'}
    </button>
  );

  const sidebarAction = (
    <Dropdown
      menu={{
        items: [
          { key: 'google', icon: <GoogleMark />, label: 'Đăng nhập bằng Google' },
          { key: 'add', icon: <MailOutlined />, label: 'Thêm hộp thư IMAP' },
        ],
        onClick: ({ key }) => {
          if (key === 'google') {
            void loginGoogle();
            return;
          }
          if (key === 'add') {
            setConnectOpen(true);
            return;
          }
        },
      }}
      trigger={['click']}
    >
      <Button type="primary" block icon={<PlusOutlined />}>
        Thêm hộp thư <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
      </Button>
    </Dropdown>
  );

  const sidebarGroups = [
    {
      title: 'Tài khoản',
      items: accounts.map((item) => ({
        key: item.id,
        label: item.displayName || item.email,
        icon: <MailOutlined />,
      })),
    },
  ];

  const pageHeader = (
    <PageHeader
      title={account ? (account.displayName || account.email) : 'Email'}
      meta={account ? `${total} thư` : undefined}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => account && void loadInbox(account.id)}
            loading={loading}
          >
            Làm mới
          </Button>
          {account ? (
            <Button danger onClick={() => void disconnect(account.id)}>
              Gỡ hộp thư
            </Button>
          ) : null}
        </div>
      }
    />
  );

  return (
    <ModuleLayout
      sidebar={
        <ModuleSidebar
          title="Email"
          action={sidebarAction}
          groups={sidebarGroups}
          activeKey={account?.id || accountId}
          onSelect={(key) => void switchAccount(key)}
        />
      }
      header={pageHeader}
      flush={Boolean(accounts.length)}
    >
      {!accounts.length ? (
        <EmptyState
          icon={<MailOutlined />}
          title="Đăng nhập hộp thư"
          description="Chọn tài khoản Google để đọc Gmail trong CHATVCB hoặc thêm hộp thư IMAP công ty."
          action={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              {googleButton}
              <details className="mail-imap">
                <summary>Tài khoản khác (IMAP)</summary>
                {loginForm}
                <Button type="primary" size="large" loading={connecting} onClick={() => void connect()}>
                  Đăng nhập IMAP
                </Button>
              </details>
            </div>
          }
        />
      ) : (
        <div className="mail-body">
          <aside className="mail-list ui-scroll">
            {loading && !items.length ? (
              <div className="mail-empty">Đang tải thư…</div>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item.uid}
                  type="button"
                  className={`mail-row${selectedUid === item.uid ? ' active' : ''}${item.seen ? '' : ' unread'}`}
                  onClick={() => void openMail(item.uid)}
                >
                  <strong>{item.from || '(Không người gửi)'}</strong>
                  <span>{item.subject}</span>
                  <small>{formatWhen(item.date)}</small>
                </button>
              ))
            ) : (
              <div className="mail-empty">Hộp thư trống.</div>
            )}
          </aside>
          <section className="mail-reader">
            {reading && !opened ? (
              <div className="mail-empty">Đang mở thư…</div>
            ) : opened ? (
              <>
                <header className="mail-reader-head">
                  <h2>{opened.subject}</h2>
                  <p>Từ: {opened.from || '—'}</p>
                  <p>Đến: {opened.to || '—'}</p>
                  <small>{formatWhen(opened.date)}</small>
                </header>
                {opened.html ? (
                  <iframe className="mail-html" title={opened.subject} sandbox="" srcDoc={opened.html} />
                ) : (
                  <pre className="mail-text">{opened.text || '(Không có nội dung)'}</pre>
                )}
              </>
            ) : (
              <div className="mail-empty">
                <MailOutlined />
                <p>Chọn một thư để đọc.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <Modal
        title="Thêm hộp thư IMAP"
        open={connectOpen}
        onCancel={() => setConnectOpen(false)}
        onOk={() => void connect()}
        okText="Đăng nhập"
        confirmLoading={connecting}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">Gmail hãy dùng nút Đăng nhập bằng Google.</Typography.Paragraph>
        {loginForm}
      </Modal>
    </ModuleLayout>
  );
}

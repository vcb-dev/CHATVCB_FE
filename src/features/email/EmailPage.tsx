import {
  DownOutlined,
  EditOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, Form, Input, InputNumber, Modal, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { FormField } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import type { MailAccount, MailItem, MailMessage } from '@/types';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ComposeMailModal } from './ComposeMailModal';
import { buildReplyDraft, EMPTY_DRAFT, htmlToPlain, type ComposeDraft } from './utils/compose';

const SELECTED_KEY = 'chatvcb.mailAccount';
const EMPTY_ACCOUNTS: MailAccount[] = [];
const EMPTY_ITEMS: MailItem[] = [];

type MailInbox = { total: number; items: MailItem[] };

type ConnectValues = {
  email: string;
  password: string;
  displayName?: string;
  imapHost?: string;
  imapPort?: number | null;
};

// Cùng mẫu với luật `type: 'email'` của antd (@rc-component/async-validator) để kết quả kiểm không đổi
const EMAIL_PATTERN =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9 -퟿豈-﷏ﷰ-￯]+\.)+[a-zA-Z -퟿豈-﷏ﷰ-￯]{2,}))$/;

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
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({
    queryKey: queryKeys.mailAccounts,
    queryFn: () => api.listMailAccounts(),
  });
  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const [accountId, setAccountId] = useState(() => localStorage.getItem(SELECTED_KEY) || '');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const { control, handleSubmit, reset } = useForm<ConnectValues>({ mode: 'onChange' });

  const account = accounts.find((item) => item.id === accountId) || accounts[0];
  const activeId = account?.id ?? '';
  const inboxQuery = useQuery({
    queryKey: queryKeys.mailInbox(activeId),
    queryFn: () => api.mailInbox(activeId),
    enabled: Boolean(activeId),
  });
  const items = inboxQuery.data?.items ?? EMPTY_ITEMS;
  const total = inboxQuery.data?.total ?? 0;
  const loading = inboxQuery.isFetching;
  const openedQuery = useQuery({
    queryKey: queryKeys.mailMessage(activeId, selectedUid ?? ''),
    queryFn: () => api.mailMessage(activeId, selectedUid ?? ''),
    enabled: Boolean(activeId && selectedUid),
    // Thư đã nhận không đổi nội dung
    staleTime: Infinity,
  });
  const opened = openedQuery.data ?? null;
  const reading = openedQuery.isFetching;

  // Nhớ hộp thư đang xem (hoặc hộp đầu tiên khi hộp đã lưu không còn) cho lần mở sau
  useEffect(() => {
    if (!accountsQuery.data) {
      return;
    }
    if (activeId) {
      localStorage.setItem(SELECTED_KEY, activeId);
    } else {
      localStorage.removeItem(SELECTED_KEY);
    }
  }, [accountsQuery.data, activeId]);

  const loadError = accountsQuery.error ?? inboxQuery.error;
  useEffect(() => {
    if (loadError) {
      message.error(loadError instanceof Error ? loadError.message : 'Không tải được hộp thư.');
    }
  }, [loadError]);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('mail');
    if (status === 'ok') {
      message.success('Đã đăng nhập Gmail.');
    } else if (status === 'error') {
      message.error('Không đăng nhập được Google. Thử lại.');
    }
  }, []);

  function reply(mail: MailMessage) {
    const plain = mail.text.trim() ? mail.text : mail.html ? htmlToPlain(mail.html) : '';
    const when = mail.date
      ? new Date(mail.date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
      : '';
    setDraft(buildReplyDraft(mail, plain, when));
  }

  function switchAccount(id: string) {
    setDraft(null);
    setAccountId(id);
    setSelectedUid(null);
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

  async function connect(values: ConnectValues) {
    try {
      setConnecting(true);
      const next = await api.connectMail({
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
        imapHost: values.imapHost || undefined,
        imapPort: values.imapPort || undefined,
      });
      reset();
      setConnectOpen(false);
      message.success(`Đã đăng nhập ${next.email}`);
      setAccountId(next.id);
      setSelectedUid(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.mailAccounts });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đăng nhập được mail.');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect(id: string) {
    try {
      await api.removeMailAccount(id);
      message.success('Đã gỡ hộp thư.');
      // Bỏ khỏi cache ngay để không chọn nhầm (và tải hộp thư của) tài khoản vừa gỡ trong lúc tải lại
      queryClient.setQueryData<MailAccount[]>(queryKeys.mailAccounts, (current) =>
        current?.filter((item) => item.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.mailInbox(id) });
      if (id === activeId) {
        setSelectedUid(null);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.mailAccounts });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gỡ được hộp thư.');
    }
  }

  function openMail(uid: string) {
    if (!activeId) {
      return;
    }
    const id = activeId;
    setSelectedUid(uid);
    // Cùng key với openedQuery nên chỉ một lần gọi; mở được thì đánh dấu đã đọc ngay trong danh sách
    void queryClient
      .query({
        queryKey: queryKeys.mailMessage(id, uid),
        queryFn: () => api.mailMessage(id, uid),
        staleTime: Infinity,
      })
      .then(() => {
        queryClient.setQueryData<MailInbox>(queryKeys.mailInbox(id), (current) =>
          current
            ? { ...current, items: current.items.map((item) => (item.uid === uid ? { ...item, seen: true } : item)) }
            : current,
        );
      })
      .catch((err) => {
        message.error(err instanceof Error ? err.message : 'Không mở được thư.');
      });
  }

  const loginForm = (
    <Form layout="vertical" className="mail-form" requiredMark={false}>
      <FormField
        control={control}
        name="email"
        label="Email"
        rules={{
          required: 'Nhập email.',
          validate: (value) => !value || (value.length <= 320 && EMAIL_PATTERN.test(value)) || 'Nhập email.',
        }}
      >
        <Input placeholder="ten@vienchibao.com" autoComplete="username" />
      </FormField>
      <FormField control={control} name="password" label="Mật khẩu IMAP" rules={{ required: 'Nhập mật khẩu.' }}>
        <Input.Password placeholder="Mật khẩu IMAP" autoComplete="current-password" />
      </FormField>
      <FormField control={control} name="displayName" label="Tên hiển thị">
        <Input placeholder="Hộp thư công ty" />
      </FormField>
      <FormField control={control} name="imapHost" label="IMAP host">
        <Input placeholder="imap.vienchibao.com" />
      </FormField>
      <FormField control={control} name="imapPort" label="Cổng IMAP">
        <InputNumber min={1} max={65535} placeholder="993" style={{ width: '100%' }} />
      </FormField>
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
      // Chưa có hộp thư thì "Làm mới" không có gì để tải
      actions={account ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button type="primary" icon={<EditOutlined />} onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            Soạn thư
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void inboxQuery.refetch()}
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
      ) : undefined}
    />
  );

  // Chưa có hộp thư thì ẩn cột trái (chỉ còn nút), màn đăng nhập chiếm cả vùng.
  // accountId đọc từ localStorage nên lúc đang tải vẫn giữ cột nếu lần trước đã có hộp thư.
  const hasMailbox = accounts.length > 0 || Boolean(accountId);

  return (
    <ModuleLayout
      sidebar={
        hasMailbox ? (
          <ModuleSidebar
            title="Email"
            action={sidebarAction}
            groups={sidebarGroups}
            activeKey={account?.id || accountId}
            onSelect={switchAccount}
          />
        ) : undefined
      }
      header={pageHeader}
      flush={Boolean(accounts.length)}
    >
      {accountsQuery.isPending ? (
        <LoadingState />
      ) : !accounts.length ? (
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
                <Button type="primary" size="large" loading={connecting} onClick={() => void handleSubmit(connect)()}>
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
                  onClick={() => openMail(item.uid)}
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
                  <div className="mail-reader-title">
                    <h2>{opened.subject}</h2>
                    <Button icon={<RollbackOutlined />} onClick={() => reply(opened)}>
                      Trả lời
                    </Button>
                  </div>
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
        onOk={() => void handleSubmit(connect)()}
        okText="Đăng nhập"
        confirmLoading={connecting}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">Gmail hãy dùng nút Đăng nhập bằng Google.</Typography.Paragraph>
        {loginForm}
      </Modal>

      {account ? <ComposeMailModal account={account} draft={draft} onClose={() => setDraft(null)} /> : null}
    </ModuleLayout>
  );
}

import {
  ApartmentOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOutlined,
  FormOutlined,
  PartitionOutlined,
  PlusOutlined,
  ProjectOutlined,
  StarFilled,
  StarOutlined,
  TableOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Input, Modal, message } from 'antd';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, fileSrc } from './api';
import { DocsEditor, draftContent, draftTitle, kindLabel } from './DocsEditor';
import { openSheetTab } from './sheet';
import { avatarColor, initials } from './theme';
import type { DocItem, DocKind, User } from './types';

type Tab = 'recent' | 'shared' | 'starred';
type Props = { user: User };

function formatWhen(value?: string | null) {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'recent', label: 'Gần đây' },
  { id: 'shared', label: 'Được chia sẻ với tôi' },
  { id: 'starred', label: 'Ưa thích' },
];

const TEMPLATES: { id: 'blank' | 'meeting' | 'weekly'; title: string; hint: string }[] = [
  { id: 'blank', title: 'Tài liệu trống', hint: 'Trang trắng để viết' },
  { id: 'meeting', title: 'Biên bản họp', hint: 'Mục tiêu, thành phần, việc cần làm' },
  { id: 'weekly', title: 'Báo cáo tuần', hint: 'Đã làm, đang làm, kế hoạch' },
];

const KIND_META: { id: DocKind; label: string; icon: ReactNode; tone: string }[] = [
  { id: 'doc', label: 'Word', icon: <FileTextOutlined />, tone: 'blue' },
  { id: 'sheet', label: 'Google Sheet', icon: <TableOutlined />, tone: 'green' },
  { id: 'slides', label: 'Trang chiếu', icon: <ProjectOutlined />, tone: 'orange' },
  { id: 'form', label: 'Biểu mẫu', icon: <FormOutlined />, tone: 'violet' },
  { id: 'mind', label: 'MindNotes', icon: <ApartmentOutlined />, tone: 'gold' },
  { id: 'folder', label: 'Thư mục', icon: <FolderOutlined />, tone: 'gold' },
  { id: 'board', label: 'Bảng', icon: <AppstoreOutlined />, tone: 'green' },
  { id: 'flow', label: 'Lưu đồ', icon: <PartitionOutlined />, tone: 'orange' },
];

const NEW_KINDS = KIND_META.filter((item) => item.id === 'doc' || item.id === 'sheet');

function KindIcon({ kind }: { kind?: DocKind }) {
  const item = KIND_META.find((entry) => entry.id === kind) || KIND_META[0];
  return <span className={`docs-kind ${item.tone}`}>{item.icon}</span>;
}

export function DocsPage({ user }: Props) {
  const [tab, setTab] = useState<Tab>('recent');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DocItem[]>([]);
  const [opened, setOpened] = useState<DocItem | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const realIdRef = useRef('');
  const pendingSave = useRef<{ title?: string; content?: string }>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    try {
      setItems(await api.listDocs(tab, search));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được Docs.');
    }
  }, [tab, search]);

  useEffect(() => {
    const google = new URLSearchParams(window.location.search).get('google');
    if (google === 'ok') {
      message.success('Đã kết nối Google. Có thể tạo Google Sheet.');
    } else if (google === 'error') {
      message.error('Không kết nối được Google Sheets.');
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

  async function openGoogleSheet(title?: string) {
    try {
      const status = await api.googleSheetsStatus();
      if (!status.ready) {
        message.error('Chưa cấu hình Google OAuth. Thêm Client ID/Secret rồi kết nối Google Sheet.');
        return;
      }
      if (!status.connected) {
        const next = await api.googleSheetsStart('sheet');
        window.location.assign(next.url);
        return;
      }
      const doc = await api.createDoc({ kind: 'sheet', title });
      setItems((current) => [doc, ...current.filter((item) => item.id !== doc.id)]);
      if (doc.googleUrl) {
        window.open(doc.googleUrl, '_blank');
        return;
      }
      openSheetTab({ id: doc.id });
    } catch (err) {
      const text = err instanceof Error ? err.message : '';
      if (text.includes('GOOGLE_CONNECT')) {
        try {
          const next = await api.googleSheetsStart('sheet');
          window.location.assign(next.url);
          return;
        } catch {
          message.error('Không mở được Google.');
          return;
        }
      }
      message.error(text || 'Không tạo được Google Sheet.');
    }
  }

  function showDoc(doc: DocItem) {
    realIdRef.current = doc.id.startsWith('tmp-') ? '' : doc.id;
    pendingSave.current = {};
    setOpened(doc);
    setTitle(doc.title);
    setSaving('');
  }

  function create(kind: DocKind = 'doc', extra?: { title?: string; template?: 'blank' | 'meeting' | 'weekly'; content?: string }) {
    const tmpId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    const draft: DocItem = {
      id: tmpId,
      team: user.team || 'sale',
      ownerId: user.id,
      title: draftTitle(kind, extra?.template, extra?.title),
      kind,
      content: draftContent(kind, extra?.template, extra?.content),
      folder: 'Docs của tôi',
      createdAt: now,
      updatedAt: now,
      starred: false,
      owner: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
    };
    setTemplatesOpen(false);
    if (kind === 'sheet') {
      void openGoogleSheet(draft.title);
      return;
    }
    showDoc(draft);
    void api
      .createDoc({ kind, title: draft.title, template: extra?.template, content: draft.content })
      .then((doc) => {
        realIdRef.current = doc.id;
        setItems((current) => [{ ...doc, title: draft.title }, ...current.filter((item) => item.id !== doc.id)]);
        const pending = pendingSave.current;
        if (pending.title || pending.content) {
          void api.updateDoc(doc.id, pending).then(() => setSaving('Đã lưu')).catch(() => setSaving('Lưu lỗi'));
          pendingSave.current = {};
        }
      })
      .catch((err) => {
        message.error(err instanceof Error ? err.message : 'Không tạo được tài liệu.');
      });
  }

  function openDoc(item: DocItem) {
    if (item.kind === 'folder') {
      message.info('Thư mục: dùng để nhóm tài liệu.');
      return;
    }
    if (item.kind === 'sheet') {
      if (item.googleUrl) {
        window.open(item.googleUrl, '_blank');
        return;
      }
      openSheetTab({ id: item.id });
      return;
    }
    showDoc(item);
    void api.getDoc(item.id).then((full) => {
      setOpened((current) => (current?.id === full.id ? { ...current, ...full } : current));
      setTitle((current) => (current ? current : full.title));
    }).catch((err) => {
      message.error(err instanceof Error ? err.message : 'Không mở được tài liệu.');
    });
  }

  function queueSave(next: { title?: string; content?: string }) {
    if (!opened) {
      return;
    }
    pendingSave.current = { ...pendingSave.current, ...next };
    window.clearTimeout(saveTimer.current);
    setSaving('Đang lưu…');
    saveTimer.current = window.setTimeout(() => {
      const id = realIdRef.current;
      if (!id) {
        return;
      }
      const payload = pendingSave.current;
      pendingSave.current = {};
      void api
        .updateDoc(id, payload)
        .then((doc) => {
          setSaving('Đã lưu');
          setOpened((current) => (current ? { ...current, title: doc.title, updatedAt: doc.updatedAt } : current));
          setItems((current) => current.map((item) => (item.id === doc.id ? { ...item, title: doc.title, updatedAt: doc.updatedAt } : item)));
        })
        .catch(() => setSaving('Lưu lỗi'));
    }, 400);
  }

  async function toggleStar(doc: DocItem) {
    if (doc.id.startsWith('tmp-') && !realIdRef.current) {
      return;
    }
    const id = doc.id.startsWith('tmp-') ? realIdRef.current : doc.id;
    try {
      const next = await api.updateDoc(id, { starred: !doc.starred });
      setItems((current) => current.map((item) => (item.id === next.id ? { ...item, starred: next.starred } : item)));
      setOpened((current) => (current?.id === next.id ? { ...current, starred: next.starred } : current));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đánh dấu được.');
    }
  }

  async function remove(doc: DocItem) {
    try {
      await api.removeDoc(doc.id);
      setOpened((current) => (current?.id === doc.id ? null : current));
      setItems((current) => current.filter((item) => item.id !== doc.id));
      message.success('Đã xóa tài liệu.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không xóa được.');
    }
  }

  function onUpload(file?: File) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const html = file.name.endsWith('.html') ? text : `<p>${text.replace(/</g, '&lt;').replace(/\n/g, '</p><p>')}</p>`;
      void create('doc', { title: file.name.replace(/\.[^.]+$/, ''), content: html });
    };
    reader.readAsText(file);
  }

  if (opened && opened.kind !== 'folder') {
    return (
      <main className="docs-page docs-edit">
        <header className="docs-edit-head">
          <button type="button" className="docs-back" onClick={() => setOpened(null)}>
            <ArrowLeftOutlined /> Docs
          </button>
          <Input
            className="docs-title"
            variant="borderless"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              queueSave({ title: event.target.value });
            }}
          />
          <small>{saving || kindLabel(opened.kind)}</small>
          <Button
            type="text"
            icon={opened.starred ? <StarFilled /> : <StarOutlined />}
            onClick={() => void toggleStar(opened)}
          />
        </header>
        <div className="docs-edit-body">
          <DocsEditor doc={opened} onChange={(content) => queueSave({ content })} />
        </div>
      </main>
    );
  }

  return (
    <main className="docs-page">
      <header className="docs-head">
        <h1>Docs</h1>
        <div className="docs-actions">
          <div className="docs-new">
            <button type="button" className="docs-card blue">
              <span className="docs-card-ico"><PlusOutlined /></span>
              <span className="docs-card-text">
                <strong>Mới</strong>
                <small>Tạo tài liệu mới</small>
              </span>
            </button>
            <div className="docs-new-menu">
              {NEW_KINDS.map((item) => (
                <button key={item.id} type="button" onClick={() => create(item.id)}>
                  <span className={`docs-kind ${item.tone}`}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="docs-card peach" onClick={() => fileRef.current?.click()}>
            <span className="docs-card-ico"><UploadOutlined /></span>
            <span className="docs-card-text">
              <strong>Tải lên</strong>
              <small>txt, md, html</small>
            </span>
          </button>
          <button type="button" className="docs-card teal" onClick={() => setTemplatesOpen(true)}>
            <span className="docs-card-ico"><FileTextOutlined /></span>
            <span className="docs-card-text">
              <strong>Mẫu</strong>
              <small>Bắt đầu từ template</small>
            </span>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.html,text/plain,text/markdown,text/html"
          hidden
          onChange={(event) => {
            onUpload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </header>
      <div className="docs-toolbar-row">
        <div className="docs-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Input.Search
          allowClear
          placeholder="Tìm kiếm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ width: 240 }}
        />
      </div>
      <div className="docs-table">
        <div className="docs-tr head">
          <span>Tên</span>
          <span>Vị trí</span>
          <span>Chủ sở hữu</span>
          <span>Đã tạo</span>
          <span>Gần đây</span>
        </div>
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="docs-tr" onClick={() => openDoc(item)}>
              <span className="docs-name">
                <KindIcon kind={item.kind} />
                <em>{item.title || 'Không tiêu đề'}</em>
                <button
                  type="button"
                  className={`docs-star${item.starred ? ' on' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleStar(item);
                  }}
                >
                  {item.starred ? <StarFilled /> : <StarOutlined />}
                </button>
              </span>
              <span>{item.folder}</span>
              <span className="docs-owner">
                <Avatar size={22} src={item.owner.avatarUrl ? fileSrc(item.owner.avatarUrl) : undefined} style={{ background: avatarColor(item.owner.name) }}>
                  {initials(item.owner.name)}
                </Avatar>
                {item.owner.name}
              </span>
              <span>{formatWhen(item.createdAt)}</span>
              <span className="docs-recent">
                <ClockCircleOutlined />
                {formatWhen(item.updatedAt)}
                {item.ownerId === user.id ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [{ key: 'del', label: 'Xóa', danger: true, icon: <DeleteOutlined /> }],
                      onClick: ({ domEvent }) => {
                        domEvent.stopPropagation();
                        void remove(item);
                      },
                    }}
                  >
                    <button type="button" className="docs-more" onClick={(event) => event.stopPropagation()}>
                      ⋯
                    </button>
                  </Dropdown>
                ) : null}
              </span>
            </div>
          ))
        ) : (
          <div className="docs-empty">Chưa có tài liệu. Hover Mới để tạo.</div>
        )}
      </div>
      <Modal title="Mẫu tài liệu" open={templatesOpen} footer={null} onCancel={() => setTemplatesOpen(false)}>
        <div className="docs-templates">
          {TEMPLATES.map((item) => (
            <button key={item.id} type="button" onClick={() => create('doc', { template: item.id })}>
              <FileTextOutlined />
              <strong>{item.title}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      </Modal>
    </main>
  );
}

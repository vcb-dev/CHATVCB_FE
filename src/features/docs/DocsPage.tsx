import {
  ApartmentOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOutlined,
  FormOutlined,
  PartitionOutlined,
  PlusOutlined,
  ProjectOutlined,
  StarFilled,
  SendOutlined,
  StarOutlined,
  TableOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Input, message } from 'antd';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { DocsEditor } from './DocsEditor';
import { draftContent, draftTitle, kindLabel } from './utils/drafts';
import { openSheetTab } from './sheet';
import { avatarColor, initials } from '@/lib/avatar';
import type { ChatDocType, DocItem, DocKind, DocTemplate, DocsGoogleStatus, User } from '@/types';
import { dropTab, reserveTab, sendTab } from './utils/googleTab';
import { DocsHome } from './components/DocsHome';
import { FolderSidebar } from './components/FolderSidebar';
import { MoveDocModal } from './components/MoveDocModal';
import { SendDocModal } from './components/SendDocModal';
import { TemplateCenter } from './components/TemplateCenter';
import { openDocOnGoogle } from './utils/openDoc';
import { ModuleLayout } from '@/components/ModuleLayout';
import { PageHeader } from '@/components/PageHeader';
import { ContentCard } from '@/components/ContentCard';
import { EmptyState } from '@/components/EmptyState';
import { ChatFilesFilters, type ChatDocRoom } from './components/ChatFilesFilters';
import { ChatFilesTable } from './components/ChatFilesTable';

type Tab = 'home' | 'files' | 'recent' | 'shared' | 'starred' | 'folders';
type Template = DocTemplate;
type CreateExtra = { title?: string; template?: Template; content?: string; folderId?: string };
type Props = {
  user: User;
  onOpenMessage: (roomId: string, messageId: string, createdAt: string) => void;
};

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
  { id: 'home', label: 'Trang chủ' },
  { id: 'files', label: 'Tệp từ chat' },
  { id: 'recent', label: 'Gần đây' },
  { id: 'shared', label: 'Được chia sẻ với tôi' },
  { id: 'starred', label: 'Ưa thích' },
  { id: 'folders', label: 'Thư mục team' },
];

const KIND_META: { id: DocKind; label: string; icon: ReactNode; tone: string }[] = [
  { id: 'doc', label: 'Google Doc', icon: <FileTextOutlined />, tone: 'blue' },
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

export function DocsPage({ user, onOpenMessage }: Props) {
  // Quay về từ OAuth Google Sheet thì mở danh sách Docs như trước
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).has('google') ? 'recent' : 'home',
  );
  // Thư mục đang mở ở tab "Thư mục team"; rỗng = Chưa xếp thư mục
  const [folderId, setFolderId] = useState('');
  const [moving, setMoving] = useState<DocItem | null>(null);
  const [home, setHome] = useState<{ recent: DocItem[]; starred: DocItem[]; loaded: boolean }>({
    recent: [],
    starred: [],
    loaded: false,
  });
  const queryClient = useQueryClient();
  const foldersQuery = useQuery({
    queryKey: queryKeys.docFolders,
    queryFn: () => api.docFolders(),
    enabled: tab === 'folders' || Boolean(moving),
  });
  const folders = foldersQuery.data ?? [];
  const refreshFolders = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: queryKeys.docFolders }),
    [queryClient],
  );
  const [fileType, setFileType] = useState<ChatDocType | null>(null);
  const [fileRoom, setFileRoom] = useState<ChatDocRoom | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DocItem[]>([]);
  const [opened, setOpened] = useState<DocItem | null>(null);
  const [sending, setSending] = useState<DocItem | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  // null = chưa biết; dùng để quyết định mở sẵn tab ngay lúc bấm
  const [google, setGoogle] = useState<DocsGoogleStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const realIdRef = useRef('');
  const pendingSave = useRef<{ title?: string; content?: string }>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    // Tab tệp từ chat tự tải bằng React Query
    if (tab === 'files') {
      return;
    }
    try {
      if (tab === 'home') {
        const [recent, starred] = await Promise.all([api.listDocs('recent'), api.listDocs('starred')]);
        setHome({ recent: recent.slice(0, 8), starred: starred.slice(0, 4), loaded: true });
        return;
      }
      setItems(tab === 'folders' ? await api.listDocs('folder', search, folderId) : await api.listDocs(tab, search));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được Docs.');
    }
  }, [tab, search, folderId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    if (google === 'ok') {
      message.success('Đã kết nối Google. Giờ tạo và mở được tài liệu trên Google.');
    } else if (google === 'error') {
      message.error(params.get('reason') || 'Không kết nối được Google.');
    }
  }, []);

  useEffect(() => {
    void api.googleSheetsStatus().then(setGoogle).catch(() => setGoogle(null));
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

  /** Đi kết nối Google; quay về thì BE tự tạo tài liệu hoặc cấp quyền rồi mở luôn */
  async function connectGoogle(input: { intent: 'connect' | 'doc' | 'sheet' | 'open'; template?: Template; docId?: string }) {
    try {
      const next = await api.googleSheetsStart(input);
      window.location.assign(next.url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không mở được Google.');
    }
  }

  async function createOnGoogle(kind: 'doc' | 'sheet', title: string, extra?: CreateExtra) {
    const tab = google?.ready && google.drive && google.connected ? reserveTab() : null;
    try {
      const status = google ?? (await api.googleSheetsStatus());
      setGoogle(status);
      if (!status.ready) {
        dropTab(tab);
        message.error('Server chưa cấu hình Google (thiếu Client ID/Secret).');
        return;
      }
      if (!status.drive) {
        dropTab(tab);
        if (kind === 'sheet') {
          message.error('Drive công ty chưa được cấu hình hoặc đang mất kết nối. Báo quản trị viên kiểm tra cấu hình Drive.');
          return;
        }
        createLocal('doc', title, extra);
        return;
      }
      if (!status.connected) {
        dropTab(tab);
        // Nội dung tệp tải lên không gửi kèm qua Google được: kết nối xong thì tải lại
        await connectGoogle({ intent: extra?.content ? 'connect' : kind, template: extra?.template });
        return;
      }
      const doc = await api.createDoc({
        kind,
        title,
        template: extra?.template,
        content: extra?.content,
        folderId: extra?.folderId,
      });
      setItems((current) => [doc, ...current.filter((item) => item.id !== doc.id)]);
      if (extra?.folderId) {
        refreshFolders();
      }
      if (doc.googleUrl) {
        sendTab(tab, doc.googleUrl);
        return;
      }
      // Drive vừa mất kết nối giữa chừng: BE đã lưu Doc trong ChatVCB, mở bằng trình soạn
      dropTab(tab);
      setGoogle({ ...status, drive: false });
      showDoc(doc);
    } catch (err) {
      dropTab(tab);
      const text = err instanceof Error ? err.message : '';
      if (text.includes('GOOGLE_CONNECT')) {
        await connectGoogle({ intent: extra?.content ? 'connect' : kind, template: extra?.template });
        return;
      }
      message.error(text || 'Không tạo được tài liệu.');
    }
  }

  /** Gửi vào chat: tài liệu trên Google và người có quyền sửa. Chuyển thư mục: tài liệu team mình. Xóa: chỉ chủ sở hữu */
  function rowActions(item: DocItem) {
    return [
      ...(item.googleUrl && item.myRole !== 'reader'
        ? [{ key: 'send', label: 'Gửi vào chat', icon: <SendOutlined /> }]
        : []),
      ...(item.team === user.team && item.myRole !== 'reader'
        ? [{ key: 'move', label: 'Chuyển tới thư mục…', icon: <FolderOutlined /> }]
        : []),
      ...(item.ownerId === user.id ? [{ key: 'del', label: 'Xóa', danger: true, icon: <DeleteOutlined /> }] : []),
    ];
  }

  function openOnGoogle(item: DocItem) {
    return openDocOnGoogle(item.id, google?.connected);
  }

  function showDoc(doc: DocItem) {
    realIdRef.current = doc.id.startsWith('tmp-') ? '' : doc.id;
    pendingSave.current = {};
    setOpened(doc);
    setTitle(doc.title);
    setSaving('');
  }

  function create(kind: DocKind = 'doc', input?: CreateExtra) {
    setTemplatesOpen(false);
    // Đang mở một thư mục team thì tài liệu mới nằm luôn trong thư mục đó
    const extra = tab === 'folders' && folderId ? { ...input, folderId } : input;
    const title = draftTitle(kind, extra?.template, extra?.title);
    // Doc/Sheet nằm trong Drive công ty; Drive chưa kết nối thì Doc viết bằng trình soạn trong ChatVCB
    if (kind === 'sheet' || (kind === 'doc' && google?.drive !== false)) {
      void createOnGoogle(kind, title, extra);
      return;
    }
    createLocal(kind, title, extra);
  }

  function createLocal(kind: DocKind, title: string, extra?: CreateExtra) {
    const tmpId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    const draft: DocItem = {
      id: tmpId,
      team: user.team || 'sale',
      ownerId: user.id,
      title,
      kind,
      content: draftContent(kind, extra?.template, extra?.content),
      folder: 'Docs của tôi',
      createdAt: now,
      updatedAt: now,
      starred: false,
      owner: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      myRole: 'owner',
      folderId: extra?.folderId ?? null,
      folderName: '',
    };
    showDoc(draft);
    void api
      .createDoc({ kind, title: draft.title, template: extra?.template, content: draft.content, folderId: extra?.folderId })
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
    if (item.googleUrl) {
      void openOnGoogle(item);
      return;
    }
    if (item.kind === 'sheet') {
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
      if (doc.folderId) {
        refreshFolders();
      }
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
      <ModuleLayout
        sidebar={null}
        flush
        header={
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
        }
      >
        <div className="docs-edit-body">
          <DocsEditor doc={opened} onChange={(content) => queueSave({ content })} />
        </div>
      </ModuleLayout>
    );
  }

  const newMenuItems = [
    ...NEW_KINDS.map((item) => ({
      key: item.id,
      icon: <span className={`docs-kind ${item.tone}`}>{item.icon}</span>,
      label: item.label,
    })),
    { type: 'divider' as const },
    { key: 'upload', icon: <UploadOutlined />, label: 'Tải lên…' },
    { key: 'template', icon: <FileTextOutlined />, label: 'Từ mẫu…' },
  ];

  const createButton = (
    <Dropdown
      menu={{
        items: newMenuItems,
        onClick: ({ key }) => {
          if (key === 'upload') {
            fileRef.current?.click();
            return;
          }
          if (key === 'template') {
            setTemplatesOpen(true);
            return;
          }
          create(key as DocKind);
        },
      }}
      trigger={['click']}
    >
      <Button type="primary" icon={<PlusOutlined />}>
        Tạo mới <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
      </Button>
    </Dropdown>
  );

  return (
    <ModuleLayout
      sidebar={
        tab === 'folders' ? (
          <FolderSidebar folders={folders} selected={folderId} onSelect={setFolderId} onChanged={refreshFolders} />
        ) : undefined
      }
      header={
        <PageHeader
          title="Docs"
          actions={createButton}
          tabs={{
            items: TABS.map((item) => ({ key: item.id, label: item.label })),
            activeKey: tab,
            onChange: (key) => setTab(key as Tab),
          }}
          tabsExtra={
            tab === 'home' ? undefined : (
              <Input.Search
                allowClear
                placeholder={tab === 'files' ? 'Tìm tên tệp' : 'Tìm kiếm'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                style={{ width: 240 }}
              />
            )
          }
        >
          {tab === 'files' ? (
            <ChatFilesFilters
              type={fileType}
              onTypeChange={setFileType}
              room={fileRoom}
              onClearRoom={() => setFileRoom(null)}
            />
          ) : null}
        </PageHeader>
      }
    >
      <ContentCard>
        {tab === 'home' ? (
          <DocsHome
            recent={home.recent}
            starred={home.starred}
            loaded={home.loaded}
            kindIcon={(kind) => <KindIcon kind={kind} />}
            onOpen={openDoc}
            onCreate={(card) => create(card.kind, card.template ? { template: card.template } : undefined)}
            onShowTemplates={() => setTemplatesOpen(true)}
            onSeeAll={setTab}
          />
        ) : tab === 'files' ? (
          <ChatFilesTable
            query={{ q: search, type: fileType, roomId: fileRoom?.id ?? null }}
            onFilterRoom={setFileRoom}
            onOpenMessage={onOpenMessage}
          />
        ) : items.length ? (
          <div className="docs-table">
            <div className="docs-tr head">
              <span>Tên</span>
              <span>Vị trí</span>
              <span>Chủ sở hữu</span>
              <span>Đã tạo</span>
              <span>Gần đây</span>
            </div>
            {items.map((item) => (
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
                <span>{item.folderName || item.folder}</span>
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
                  {rowActions(item).length > 0 ? (
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: rowActions(item),
                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();
                          if (key === 'send') {
                            setSending(item);
                          } else if (key === 'move') {
                            setMoving(item);
                          } else if (key === 'del') {
                            void remove(item);
                          }
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
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileTextOutlined />}
            title={tab === 'folders' ? 'Thư mục này chưa có tài liệu' : 'Chưa có tài liệu'}
            description={
              tab === 'folders'
                ? 'Tạo tài liệu mới ngay trong thư mục, hoặc dùng "Chuyển tới thư mục…" ở menu ⋯ của một tài liệu.'
                : 'Tạo tài liệu mới hoặc tải lên tệp văn bản từ máy tính.'
            }
            action={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => create('doc')}>
                Tạo mới
              </Button>
            }
          />
        )}
      </ContentCard>

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

      <TemplateCenter
        open={templatesOpen}
        kindIcon={(kind) => <KindIcon kind={kind} />}
        onClose={() => setTemplatesOpen(false)}
        onPick={(card) => create(card.kind, card.template ? { template: card.template } : undefined)}
      />
      <MoveDocModal
        doc={moving}
        folders={folders}
        onClose={() => setMoving(null)}
        onMoved={() => {
          refreshFolders();
          void load();
        }}
      />
      <SendDocModal doc={sending} onClose={() => setSending(null)} />
    </ModuleLayout>
  );
}

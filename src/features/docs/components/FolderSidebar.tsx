import { CaretDownOutlined, CaretRightOutlined, FolderOpenOutlined, FolderOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Modal, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import type { DocFolder } from '@/types';
import { childFolders } from '../utils/folderTree';

type Editing = { mode: 'create'; parentId: string | null } | { mode: 'rename'; folder: DocFolder } | null;

/**
 * Cột trái của tab "Thư mục team": cây thư mục lấy từ dữ liệu (đúng quy ước cột trái chỉ cho danh sách dữ liệu).
 * `selected` rỗng = "Chưa xếp thư mục".
 */
export function FolderSidebar(props: {
  folders: DocFolder[];
  selected: string;
  onSelect: (folderId: string) => void;
  onChanged: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Editing>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  function startCreate(parentId: string | null) {
    setName('');
    setEditing({ mode: 'create', parentId });
  }

  function startRename(folder: DocFolder) {
    setName(folder.name);
    setEditing({ mode: 'rename', folder });
  }

  async function save() {
    if (!editing) {
      return;
    }
    setBusy(true);
    try {
      if (editing.mode === 'create') {
        const created = await api.createDocFolder(name, editing.parentId);
        if (editing.parentId) {
          setCollapsed((current) => new Set([...current].filter((id) => id !== editing.parentId)));
        }
        props.onSelect(created.id);
      } else {
        await api.renameDocFolder(editing.folder.id, name);
      }
      setEditing(null);
      props.onChanged();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được thư mục.');
    } finally {
      setBusy(false);
    }
  }

  function remove(folder: DocFolder) {
    Modal.confirm({
      title: `Xóa thư mục "${folder.name}"?`,
      content: 'Chỉ xóa được thư mục rỗng (không còn tài liệu và thư mục con).',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.deleteDocFolder(folder.id);
          if (props.selected === folder.id) {
            props.onSelect(folder.parentId ?? '');
          }
          props.onChanged();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Không xóa được thư mục.');
        }
      },
    });
  }

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const renderLevel = (parentId: string | null, depth: number): React.ReactNode =>
    childFolders(props.folders, parentId).map((folder) => {
      const kids = childFolders(props.folders, folder.id).length > 0;
      const open = !collapsed.has(folder.id);
      const active = props.selected === folder.id;
      return (
        <div key={folder.id}>
          <div className={`docs-folder-row${active ? ' active' : ''}`} style={{ paddingLeft: 8 + depth * 16 }}>
            <button type="button" className="docs-folder-caret" onClick={() => toggle(folder.id)} disabled={!kids} aria-label={open ? 'Thu gọn' : 'Mở rộng'}>
              {kids ? open ? <CaretDownOutlined /> : <CaretRightOutlined /> : null}
            </button>
            <button type="button" className="docs-folder-name" onClick={() => props.onSelect(folder.id)}>
              {active ? <FolderOpenOutlined /> : <FolderOutlined />}
              <span>{folder.name}</span>
              {folder.docCount ? <em>{folder.docCount}</em> : null}
            </button>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'sub', label: 'Thư mục con' },
                  { key: 'rename', label: 'Đổi tên' },
                  { key: 'del', label: 'Xóa', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'sub') {
                    startCreate(folder.id);
                  } else if (key === 'rename') {
                    startRename(folder);
                  } else {
                    remove(folder);
                  }
                },
              }}
            >
              <button type="button" className="docs-folder-more" aria-label="Thêm">
                ⋯
              </button>
            </Dropdown>
          </div>
          {kids && open ? renderLevel(folder.id, depth + 1) : null}
        </div>
      );
    });

  return (
    <ModuleSidebar
      title="Thư mục team"
      groups={[]}
      action={
        <Button block icon={<PlusOutlined />} onClick={() => startCreate(props.selected || null)}>
          Thư mục
        </Button>
      }
    >
      <div className="docs-folders">
        <div className={`docs-folder-row${props.selected === '' ? ' active' : ''}`} style={{ paddingLeft: 8 }}>
          <span className="docs-folder-caret" />
          <button type="button" className="docs-folder-name" onClick={() => props.onSelect('')}>
            <InboxOutlined />
            <span>Chưa xếp thư mục</span>
          </button>
        </div>
        {renderLevel(null, 0)}
      </div>
      <Modal
        title={editing?.mode === 'rename' ? 'Đổi tên thư mục' : 'Thư mục mới'}
        open={Boolean(editing)}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={busy}
        okButtonProps={{ disabled: !name.trim() }}
        onOk={() => void save()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Input
          autoFocus
          maxLength={80}
          placeholder="Tên thư mục"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onPressEnter={() => name.trim() && void save()}
        />
      </Modal>
    </ModuleSidebar>
  );
}

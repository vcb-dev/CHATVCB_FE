import { Modal, TreeSelect, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { DocFolder, DocItem } from '@/types';
import { folderTreeData, ROOT_FOLDER } from '../utils/folderTree';

/** "Chuyển tới thư mục…": chọn thư mục team (hoặc Chưa xếp thư mục) cho một tài liệu */
export function MoveDocModal(props: {
  doc: DocItem | null;
  folders: DocFolder[];
  onClose: () => void;
  onMoved: (doc: DocItem) => void;
}) {
  const [target, setTarget] = useState<string>(ROOT_FOLDER);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTarget(props.doc?.folderId ?? ROOT_FOLDER);
  }, [props.doc]);

  async function move() {
    if (!props.doc) {
      return;
    }
    setBusy(true);
    try {
      const doc = await api.updateDoc(props.doc.id, { folderId: target === ROOT_FOLDER ? null : target });
      message.success(doc.folderName ? `Đã chuyển tới "${doc.folderName}".` : 'Đã đưa ra khỏi thư mục.');
      props.onMoved(doc);
      props.onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không chuyển được tài liệu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Chuyển tới thư mục"
      open={Boolean(props.doc)}
      okText="Chuyển"
      cancelText="Hủy"
      confirmLoading={busy}
      onOk={() => void move()}
      onCancel={props.onClose}
      destroyOnHidden
    >
      <div className="forward-preview">{props.doc?.title}</div>
      <TreeSelect
        className="docs-move-select"
        style={{ width: '100%' }}
        treeDefaultExpandAll
        showSearch
        treeNodeFilterProp="title"
        placeholder="Gõ để tìm thư mục"
        value={target}
        treeData={folderTreeData(props.folders)}
        onChange={(value) => setTarget(value)}
      />
    </Modal>
  );
}

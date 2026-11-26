import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { dismissUpdate, reloadToUpdate, usePwa } from '@/lib/pwa';

/** Bản web mới đã tải xong: hỏi trước khi tải lại để không mất tin đang gõ hay rớt cuộc gọi. */
export function PwaUpdateBanner() {
  const { needRefresh } = usePwa();
  if (!needRefresh) {
    return null;
  }
  return (
    <div className="pwa-update" role="status">
      <span>Có bản mới của CHATVCB</span>
      <Button type="primary" size="small" onClick={reloadToUpdate}>
        Tải lại
      </Button>
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        aria-label="Để sau"
        onClick={dismissUpdate}
      />
    </div>
  );
}

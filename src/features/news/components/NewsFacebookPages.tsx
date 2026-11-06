import { ArrowLeftOutlined, FacebookFilled, SyncOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Button, Empty, Popconfirm, Spin, Switch, Tag, Tooltip, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { NewsFacebookPage } from '@/types';
import { newsTime } from '../utils/news';

function PageRow(props: { page: NewsFacebookPage; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const { page } = props;
  const [busy, setBusy] = useState<'toggle' | 'sync' | 'delete' | null>(null);

  async function run(kind: 'toggle' | 'sync' | 'delete', action: () => Promise<void>) {
    setBusy(kind);
    try {
      await action();
    } catch (err) {
      void message.error(errorText(err, 'Không thực hiện được.'));
    } finally {
      setBusy(null);
      props.onChanged();
    }
  }

  return (
    <div className="news-facebook-page" data-page-id={page.pageId}>
      <Avatar size={44} src={page.pictureUrl} icon={<FacebookFilled />} style={{ flex: 'none' }} />
      <div className="news-facebook-page-text">
        <a href={`https://www.facebook.com/${page.pageId}`} target="_blank" rel="noreferrer">
          <strong>{page.name}</strong>
        </a>
        <small>
          {page.connectedBy ? `${page.connectedBy.name} kết nối · ` : ''}
          {page.lastSyncAt ? `kéo bài ${newsTime(page.lastSyncAt).toLowerCase()}` : 'chưa kéo bài lần nào'}
        </small>
        {page.lastError ? <small className="news-facebook-error">{page.lastError}</small> : null}
        <span>
          {page.webhookSubscribed ? (
            <Tooltip title="Page báo ngay khi có bài mới; lịch 5 phút vẫn chạy để dự phòng.">
              <Tag color="green">Nhận webhook</Tag>
            </Tooltip>
          ) : (
            <Tooltip title="Chưa đăng ký được webhook, bài vẫn về theo lịch mỗi 5 phút.">
              <Tag>Kéo theo lịch 5 phút</Tag>
            </Tooltip>
          )}
        </span>
      </div>
      <div className="news-facebook-page-actions">
        <span className="news-facebook-switch">
          <Switch
            checked={page.enabled}
            loading={busy === 'toggle'}
            aria-label="Tự đăng"
            onChange={(enabled) =>
              void run('toggle', async () => {
                await api.updateNewsFacebookPage(page.id, enabled);
              })
            }
          />
          Tự đăng
        </span>
        <Button
          icon={<SyncOutlined />}
          disabled={!page.enabled}
          loading={busy === 'sync'}
          onClick={() =>
            void run('sync', async () => {
              const { imported } = await api.syncNewsFacebookPage(page.id);
              void message.success(imported ? `Đã đăng ${imported} bài mới lên Bản tin.` : 'Không có bài mới.');
              if (imported) {
                void queryClient.invalidateQueries({ queryKey: queryKeys.newsPosts });
              }
            })
          }
        >
          Kéo ngay
        </Button>
        <Popconfirm
          title="Bỏ Page này khỏi danh sách?"
          description="Bài đã kéo về Bản tin vẫn giữ nguyên."
          okText="Bỏ"
          okButtonProps={{ danger: true }}
          cancelText="Hủy"
          onConfirm={() =>
            run('delete', async () => {
              await api.deleteNewsFacebookPage(page.id);
            })
          }
        >
          <Button danger loading={busy === 'delete'}>
            Xóa
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}

/** Kết nối Page bằng OAuth: BE nhận callback rồi chuyển về `?workspace=news&facebook=ok|error` */
export function NewsFacebookPages(props: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const status = useQuery({ queryKey: queryKeys.newsFacebookStatus, queryFn: () => api.newsFacebookStatus() });
  const pages = useQuery({ queryKey: queryKeys.newsFacebookPages, queryFn: () => api.newsFacebookPages() });

  async function connect() {
    setConnecting(true);
    try {
      const { url } = await api.newsFacebookStart();
      window.location.assign(url);
    } catch (err) {
      void message.error(errorText(err, 'Không mở được trang kết nối Facebook.'));
      setConnecting(false);
    }
  }

  return (
    <div className="news-facebook">
      <div className="news-reader-bar">
        <Button icon={<ArrowLeftOutlined />} onClick={props.onBack}>
          Quay lại
        </Button>
      </div>
      <section className="news-facebook-panel">
        <header className="news-header">
          <h1>Page Facebook</h1>
          <Button
            type="primary"
            icon={<FacebookFilled />}
            loading={connecting}
            disabled={status.data?.ready === false}
            onClick={() => void connect()}
          >
            Kết nối Facebook
          </Button>
        </header>
        {status.data?.ready === false ? (
          <Alert
            type="warning"
            showIcon
            message="Máy chủ chưa cấu hình Facebook App."
            description="Cần đặt FACEBOOK_APP_ID và FACEBOOK_APP_SECRET cho BE rồi khởi động lại."
          />
        ) : null}
        <p className="news-facebook-hint">
          Page mới kết nối đang tắt. Bật "Tự đăng" thì bài Page đăng từ lúc bật sẽ tự lên Bản tin. Muốn đổi
          Page thông báo, tắt Page cũ và bật Page mới.
        </p>
        {pages.isLoading ? <Spin className="news-loading" /> : null}
        {pages.isError ? (
          <div className="news-state">
            <p>{errorText(pages.error, 'Không tải được danh sách Page.')}</p>
            <Button onClick={() => void pages.refetch()}>Thử lại</Button>
          </div>
        ) : null}
        {pages.data && !pages.data.length ? <Empty description="Chưa kết nối Page nào" /> : null}
        {pages.data?.map((page) => (
          <PageRow
            key={page.id}
            page={page}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: queryKeys.newsFacebookPages })}
          />
        ))}
      </section>
    </div>
  );
}

import { FileTextOutlined, TableOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { googleDocIdFromUrl } from '@/features/docs/utils/googleLinks';
import { openDocOnGoogle } from '@/features/docs/utils/openDoc';
import type { ShareRole } from '@/types';
import { LinkPreviewCard } from './LinkPreviewCard';

const ROLE_TEXT: Record<ShareRole, string> = { writer: 'được sửa', reader: 'được xem' };

/**
 * Thẻ cho link Google Doc/Sheet của Drive công ty: tên, chủ sở hữu, nút Mở,
 * và cho người có quyền sửa cấp quyền cả nhóm chat. Link khác thì là thẻ link thường.
 */
export function DocLinkCard({ url, roomId }: { url: string; roomId: string }) {
  const googleId = googleDocIdFromUrl(url) ?? '';
  const queryClient = useQueryClient();
  const key = queryKeys.docCard(googleId, roomId);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => api.docCard(url, roomId),
    // Người khác cấp quyền thì thẻ cập nhật trong vòng 30 giây; lúc bấm Mở BE vẫn kiểm lại quyền
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) {
    return null;
  }
  if (isError || !data || !data.found) {
    return <LinkPreviewCard url={url} />;
  }

  const card = data;
  const sheet = card.doc.kind === 'sheet';

  async function run(action: string, task: () => Promise<unknown>) {
    setBusy(action);
    try {
      await task();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thực hiện được.');
    } finally {
      setBusy(null);
    }
  }

  function share(role: ShareRole) {
    return run(role, async () => {
      queryClient.setQueryData(key, await api.shareDocToRoom(card.doc.id, roomId, role));
    });
  }

  function unshare() {
    return run('remove', async () => {
      queryClient.setQueryData(key, await api.unshareDocFromRoom(card.doc.id, roomId));
    });
  }

  return (
    <div className="doc-card" onClick={(event) => event.stopPropagation()}>
      <div className="doc-card-main">
        <span className={`docs-kind ${sheet ? 'green' : 'blue'}`}>{sheet ? <TableOutlined /> : <FileTextOutlined />}</span>
        <div className="doc-card-text">
          <strong title={card.doc.title}>{card.doc.title}</strong>
          <small>
            {sheet ? 'Google Sheet' : 'Google Doc'} · {card.doc.owner.name}
          </small>
        </div>
        {card.myRole ? (
          <Button size="small" type="primary" onClick={() => void openDocOnGoogle(card.doc.id, undefined)}>
            Mở
          </Button>
        ) : null}
      </div>
      {card.myRole ? null : (
        <p className="doc-card-note">Bạn chưa có quyền mở. Nhắn người gửi để được cấp quyền.</p>
      )}
      {card.canShare && card.missing > 0 ? (
        <div className="doc-card-share">
          <span>{card.missing} người trong nhóm chưa mở được</span>
          <div className="doc-card-actions">
            <Button size="small" loading={busy === 'writer'} disabled={Boolean(busy)} onClick={() => void share('writer')}>
              Cho sửa
            </Button>
            <Button size="small" loading={busy === 'reader'} disabled={Boolean(busy)} onClick={() => void share('reader')}>
              Chỉ xem
            </Button>
          </div>
        </div>
      ) : null}
      {card.canShare && card.roomShare ? (
        <div className="doc-card-room">
          <span>Nhóm này: {ROLE_TEXT[card.roomShare]}</span>
          <Button
            type="link"
            size="small"
            loading={busy === 'writer' || busy === 'reader'}
            disabled={Boolean(busy)}
            onClick={() => void share(card.roomShare === 'writer' ? 'reader' : 'writer')}
          >
            {card.roomShare === 'writer' ? 'Đổi thành xem' : 'Đổi thành sửa'}
          </Button>
          <Button type="link" size="small" danger loading={busy === 'remove'} disabled={Boolean(busy)} onClick={() => void unshare()}>
            Bỏ
          </Button>
        </div>
      ) : null}
    </div>
  );
}

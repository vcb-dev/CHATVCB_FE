import { DownloadOutlined, FileTextOutlined, MessageOutlined } from '@ant-design/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, Dropdown } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UserAvatar } from '@/components/UserAvatar';
import { FileTypeIcon } from '@/features/chat/components/FileTypeIcon';
import { formatBytes } from '@/features/chat/utils/attachments';
import { fileKind } from '@/features/chat/utils/fileKind';
import type { ChatDocFile, ChatDocQuery } from '@/types';
import { saveFile } from '../utils/saveFile';
import type { ChatDocRoom } from './ChatFilesFilters';

function formatSentAt(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatFilesTable(props: {
  query: ChatDocQuery;
  onFilterRoom: (room: ChatDocRoom) => void;
  onOpenMessage: (roomId: string, messageId: string, createdAt: string) => void;
}) {
  const files = useInfiniteQuery({
    queryKey: queryKeys.chatDocs(props.query),
    queryFn: ({ pageParam }) => api.chatDocs(props.query, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Tệp mới gửi trong chat phải hiện ngay khi mở lại tab
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (files.isPending) {
    return <LoadingState />;
  }
  if (files.isError) {
    return (
      <EmptyState
        icon={<FileTextOutlined />}
        title="Không tải được tài liệu"
        description={files.error.message}
        action={<Button onClick={() => void files.refetch()}>Thử lại</Button>}
      />
    );
  }

  const items = files.data.pages.flatMap((page) => page.items);
  if (!items.length) {
    const filtered = Boolean(props.query.q || props.query.type || props.query.roomId);
    return (
      <EmptyState
        icon={<FileTextOutlined />}
        title={filtered ? 'Không có tài liệu phù hợp' : 'Chưa có tài liệu nào'}
        description={
          filtered
            ? 'Thử đổi từ khoá hoặc bỏ bớt bộ lọc.'
            : 'Tài liệu gửi trong nhóm và tin nhắn sẽ được lưu ở đây.'
        }
      />
    );
  }

  function openInChat(item: ChatDocFile) {
    props.onOpenMessage(item.room.id, item.messageId, item.createdAt);
  }

  return (
    <>
      <div className="docs-table">
        <div className="docs-tr head">
          <span>Tên</span>
          <span>Hội thoại</span>
          <span>Người gửi</span>
          <span>Ngày gửi</span>
          <span>Kích thước</span>
        </div>
        {items.map((item) => (
          <div
            key={item.messageId}
            className="docs-tr"
            title="Bấm để tải về"
            onClick={() => void saveFile(item)}
          >
            <span className="docs-name">
              <span className="chat-docs-ico">
                <FileTypeIcon kind={fileKind(item.filename, item.mimeType)} />
              </span>
              <em title={item.filename}>{item.filename}</em>
            </span>
            <span className="docs-owner">
              <button
                type="button"
                className="chat-docs-room"
                title="Chỉ xem tài liệu của hội thoại này"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onFilterRoom({ id: item.room.id, title: item.room.title });
                }}
              >
                <UserAvatar
                  size={22}
                  src={item.room.avatarUrl}
                  name={item.room.title}
                  zoomable={false}
                  style={{ flexShrink: 0 }}
                />
                <span className="chat-docs-text">{item.room.title}</span>
              </button>
            </span>
            <span className="docs-owner">
              <UserAvatar
                size={22}
                src={item.sender.avatarUrl}
                name={item.sender.name}
                zoomable={false}
                style={{ flexShrink: 0 }}
              />
              <span className="chat-docs-text">{item.sender.name}</span>
            </span>
            <span>{formatSentAt(item.createdAt)}</span>
            <span className="docs-recent chat-docs-size">
              {formatBytes(item.sizeBytes)}
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'download', icon: <DownloadOutlined />, label: 'Tải về' },
                    { key: 'chat', icon: <MessageOutlined />, label: 'Xem trong chat' },
                  ],
                  onClick: ({ key, domEvent }) => {
                    // Menu nằm trong portal nhưng sự kiện React vẫn nổi lên hàng
                    domEvent.stopPropagation();
                    if (key === 'download') {
                      void saveFile(item);
                    } else {
                      openInChat(item);
                    }
                  },
                }}
              >
                <button
                  type="button"
                  className="docs-more"
                  aria-label="Thao tác"
                  onClick={(event) => event.stopPropagation()}
                >
                  ⋯
                </button>
              </Dropdown>
            </span>
          </div>
        ))}
      </div>
      {files.hasNextPage ? (
        <div className="chat-docs-more">
          <Button loading={files.isFetchingNextPage} onClick={() => void files.fetchNextPage()}>
            Xem thêm
          </Button>
        </div>
      ) : null}
    </>
  );
}

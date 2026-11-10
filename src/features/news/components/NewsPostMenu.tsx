import { DeleteOutlined, EditOutlined, FacebookFilled, MoreOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, type MenuProps, Modal, message } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { NewsFeedPost } from '@/types';

export function NewsPostMenu(props: {
  post: NewsFeedPost;
  canPublish: boolean;
  onEdit: (id: string) => void;
}) {
  const { post, canPublish, onEdit } = props;
  const queryClient = useQueryClient();

  function confirmUnpublish() {
    Modal.confirm({
      title: 'Gỡ bài này về nháp?',
      okText: 'Gỡ',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.unpublishNewsPost(post.id);
          await queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
        } catch (err) {
          void message.error(errorText(err, 'Không thực hiện được.'));
        }
      },
    });
  }

  function confirmDelete() {
    Modal.confirm({
      title: 'Xóa hẳn bài này?',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.deleteNewsPost(post.id);
          await queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
        } catch (err) {
          void message.error(errorText(err, 'Không thực hiện được.'));
        }
      },
    });
  }

  const items: MenuProps['items'] = [
    ...(post.source
      ? [
          {
            key: 'facebook',
            label: 'Mở trên Facebook',
            icon: <FacebookFilled />,
            onClick: () => window.open(post.source!.url, '_blank', 'noreferrer'),
          },
        ]
      : []),
    ...(canPublish
      ? [
          {
            key: 'edit',
            label: 'Sửa',
            icon: <EditOutlined />,
            onClick: () => onEdit(post.id),
          },
          {
            key: 'unpublish',
            label: 'Gỡ về nháp',
            onClick: confirmUnpublish,
          },
          {
            key: 'delete',
            label: 'Xóa',
            danger: true,
            icon: <DeleteOutlined />,
            onClick: confirmDelete,
          },
        ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        shape="circle"
        icon={<MoreOutlined />}
        aria-label="Tùy chọn bài viết"
      />
    </Dropdown>
  );
}


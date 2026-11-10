import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Spin } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { confirmDiscard } from '@/lib/confirmDiscard';
import type { NewsPost } from '@/types';
import { useNewsEditor } from '../hooks/useNewsEditor';
import { NEWS_LIMITS } from '../utils/news';
import { postAuthor } from '../utils/feed';
import { NewsBlockRow } from './NewsBlockRow';
import { NewsImagePicker } from './NewsImagePicker';
import { NewsPostView } from './NewsPostView';

function statusText(dirty: boolean, saving: boolean, savedAt: Date | null): string {
  if (saving) {
    return 'Đang lưu…';
  }
  if (dirty) {
    return 'Chưa lưu';
  }
  return savedAt
    ? `Đã lưu ${savedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    : '';
}

export function NewsEditor(props: {
  postId: string;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onPublished: (post: NewsPost) => void;
}) {
  const { postId, onDirtyChange, onClose, onPublished } = props;
  const queryClient = useQueryClient();
  const editor = useNewsEditor(postId);
  const savedEmptyRef = useRef(false);
  savedEmptyRef.current = editor.isSavedEmpty;
  const [picker, setPicker] = useState<'cover' | 'block' | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { dirty, post } = editor;

  useEffect(() => {
    onDirtyChange(dirty);
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      onDirtyChange(false);
    };
  }, [dirty, onDirtyChange]);

  // Rời màn soạn bằng đường khác nút Quay lại (đổi mục, mở thông báo chat) cũng không để lại nháp trống
  useEffect(
    () => () => {
      if (savedEmptyRef.current) {
        void api
          .deleteNewsPost(postId)
          .catch(() => undefined)
          .finally(() => queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary }));
      }
    },
    [postId, queryClient],
  );

  const byId = useMemo(
    () => new Map(editor.images.map((image) => [image.id, image])),
    [editor.images],
  );
  const cover = editor.coverId ? (byId.get(editor.coverId) ?? null) : null;

  async function finish() {
    if (editor.isSavedEmpty) {
      await api.deleteNewsPost(postId).catch(() => undefined);
      savedEmptyRef.current = false;
    }
    onClose();
  }

  function leave() {
    if (!dirty) {
      void finish();
      return;
    }
    confirmDiscard(finish);
  }

  function askPublish() {
    const isFirst = !post?.publishedAt;
    Modal.confirm({
      title: isFirst ? 'Đăng bài này? Toàn công ty sẽ nhận thông báo.' : 'Đăng lại bài này?',
      okText: 'Đăng',
      cancelText: 'Hủy',
      onOk: async () => {
        const published = await editor.publish();
        if (published) {
          onPublished(published);
        }
      },
    });
  }

  if (!post) {
    return editor.problem === 'gone' ? (
      <div className="news-state">
        <p>Bài không còn tồn tại</p>
        <Button onClick={onClose}>Quay lại</Button>
      </div>
    ) : (
      <Spin className="news-loading" />
    );
  }

  if (previewing) {
    return (
      <div className="news-editor-preview">
        <div className="news-editor-toolbar">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setPreviewing(false)}>
            Tiếp tục soạn
          </Button>
        </div>
        <div className="news-column">
          <div className="news-post-card">
            <NewsPostView
              author={postAuthor(post)}
              timeLabel="Bản nháp"
              title={editor.title.trim()}
              blocks={editor.blocks.filter(
                (block) => block.type === 'image' || block.text.trim(),
              )}
              images={editor.images}
              cover={cover}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-editor" data-post-id={postId}>
      <div className="news-editor-toolbar">
        <Button icon={<ArrowLeftOutlined />} onClick={leave}>
          Quay lại
        </Button>
        <span className="news-editor-status">
          {statusText(dirty, editor.saving, editor.savedAt)}
        </span>
        <Button onClick={() => setPreviewing(true)}>Xem trước</Button>
        {post.status === 'draft' ? (
          <>
            <Button loading={editor.saving} onClick={() => void editor.save()}>
              Lưu nháp
            </Button>
            <Button type="primary" disabled={editor.saving} onClick={askPublish}>
              Đăng
            </Button>
          </>
        ) : (
          <Button type="primary" loading={editor.saving} onClick={() => void editor.save()}>
            Lưu
          </Button>
        )}
      </div>
      {/* Khóa ô nhập khi đang lưu: kết quả trả về thay state, chữ gõ giữa chừng sẽ mất */}
      <fieldset className="news-editor-form" disabled={editor.saving}>
        <Input
          className="news-editor-title"
          size="large"
          value={editor.title}
          maxLength={NEWS_LIMITS.title}
          placeholder="Tiêu đề bài viết"
          onChange={(event) => editor.setTitle(event.target.value)}
        />
        <div className="news-editor-cover">
          {cover ? <img src={cover.thumbUrl} alt="" /> : null}
          <Button onClick={() => setPicker('cover')}>{cover ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa'}</Button>
          {cover ? <Button onClick={() => editor.setCover(null)}>Bỏ ảnh bìa</Button> : null}
        </div>
        {editor.blocks.map((block, index) => (
          <NewsBlockRow
            key={block.key}
            block={block}
            image={block.type === 'image' ? byId.get(block.imageId) : undefined}
            isFirst={index === 0}
            isLast={index === editor.blocks.length - 1}
            onChange={editor.updateBlock}
            onMove={editor.moveBlock}
            onRemove={editor.removeBlock}
          />
        ))}
        <div className="news-add-block">
          <Button
            disabled={editor.blocks.length >= NEWS_LIMITS.blocks}
            onClick={() => editor.addBlock({ type: 'paragraph', text: '' })}
          >
            Đoạn văn
          </Button>
          <Button
            disabled={editor.blocks.length >= NEWS_LIMITS.blocks}
            onClick={() => editor.addBlock({ type: 'heading', text: '' })}
          >
            Tiêu đề phụ
          </Button>
          <Button disabled={editor.blocks.length >= NEWS_LIMITS.blocks} onClick={() => setPicker('block')}>
            Ảnh
          </Button>
        </div>
      </fieldset>
      {picker ? (
        <NewsImagePicker
          postId={postId}
          onClose={() => setPicker(null)}
          onPicked={(image) => {
            editor.addImage(image);
            if (picker === 'cover') {
              editor.setCover(image.id);
            } else {
              editor.addBlock({ type: 'image', imageId: image.id, caption: '' });
            }
            setPicker(null);
          }}
        />
      ) : null}
      <Modal
        open={editor.problem === 'conflict'}
        title="Bài vừa được người khác sửa."
        onCancel={() => editor.setProblem(null)}
        footer={[
          <Button key="stay" onClick={() => editor.setProblem(null)}>
            Xem lại nội dung đang soạn
          </Button>,
          <Button key="reload" type="primary" onClick={() => void editor.reload()}>
            Tải lại
          </Button>,
        ]}
      >
        Tải lại để lấy bản mới nhất. Nội dung bạn đang soạn sẽ mất, nên hãy sao chép phần cần giữ
        trước.
      </Modal>
      <Modal
        open={editor.problem === 'gone'}
        title="Bài không còn tồn tại"
        closable={false}
        footer={[
          <Button key="back" type="primary" onClick={onClose}>
            Quay lại
          </Button>,
        ]}
      >
        Có người vừa xóa bài này nên không lưu được nữa.
      </Modal>
    </div>
  );
}

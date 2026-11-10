import { AppstoreOutlined, CloseOutlined, PictureOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Input, Modal, Spin, message } from 'antd';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import { confirmDiscard } from '@/lib/confirmDiscard';
import { ACCEPT_IMAGES } from '@/lib/image';
import type { NewsPost } from '@/types';
import { isEmptyDraft, useNewsComposer } from '../hooks/useNewsComposer';
import { postAuthor } from '../utils/feed';
import { NEWS_LIMITS } from '../utils/news';
import { NewsImagePicker } from './NewsImagePicker';

/** Hộp đăng bài kiểu Facebook: một ô chữ (dòng đầu làm tiêu đề) và ảnh, xem spec mục 8 */
export function NewsComposer(props: {
  postId: string;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onPublished: (post: NewsPost) => void;
}) {
  const { postId, onDirtyChange, onClose, onPublished } = props;
  const queryClient = useQueryClient();
  const composer = useNewsComposer(postId);
  const { post, dirty, saving, uploading, images, savedRef } = composer;
  const fileRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<'draft' | 'save' | null>(null);

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

  // Hộp bị gỡ bằng đường khác (mở thông báo chat, đổi workspace) cũng không để lại nháp trống
  useEffect(
    () => () => {
      if (isEmptyDraft(savedRef.current)) {
        void api
          .deleteNewsPost(postId)
          .catch(() => undefined)
          .finally(() => queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary }));
      }
    },
    [postId, queryClient, savedRef],
  );

  const empty = !composer.text.trim();
  const busy = saving || uploading > 0;
  const full = images.length >= NEWS_LIMITS.images;

  function leave() {
    if (saving) {
      return;
    }
    if (dirty || uploading) {
      confirmDiscard(onClose);
      return;
    }
    onClose();
  }

  async function saveAndClose(kind: 'draft' | 'save') {
    setPending(kind);
    const saved = dirty ? await composer.save() : post;
    setPending(null);
    if (!saved) {
      return;
    }
    if (!isEmptyDraft(saved)) {
      void message.success(kind === 'draft' ? 'Đã lưu nháp' : 'Đã lưu');
    }
    onClose();
  }

  function askPublish() {
    Modal.confirm({
      title: post?.publishedAt ? 'Đăng lại bài này?' : 'Đăng bài này? Toàn công ty sẽ nhận thông báo.',
      okText: 'Đăng',
      cancelText: 'Hủy',
      onOk: async () => {
        const published = await composer.publish();
        if (published) {
          onPublished(published);
        }
      },
    });
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) {
      void composer.uploadFiles(files);
    }
  }

  const author = post ? postAuthor(post) : null;
  const isNew = post?.status === 'draft' && !post.title;

  return (
    <Modal
      open
      centered
      width={560}
      className="news-composer-modal"
      title={post ? (isNew ? 'Tạo bài viết' : 'Sửa bài viết') : ''}
      closable={!saving}
      keyboard={!saving}
      mask={{ closable: !saving }}
      onCancel={leave}
      footer={
        post ? (
          <div className="news-composer-footer">
            {post.status === 'draft' ? (
              <>
                <Button
                  loading={pending === 'draft'}
                  disabled={busy || (empty && !images.length)}
                  onClick={() => void saveAndClose('draft')}
                >
                  Lưu nháp
                </Button>
                <Button type="primary" disabled={busy || empty} onClick={askPublish}>
                  Đăng
                </Button>
              </>
            ) : (
              <Button
                type="primary"
                loading={pending === 'save'}
                disabled={busy || empty}
                onClick={() => void saveAndClose('save')}
              >
                Lưu
              </Button>
            )}
          </div>
        ) : null
      }
    >
      {!post || !author ? (
        composer.problem === 'gone' ? null : <Spin className="news-loading" />
      ) : (
        <div className="news-composer" data-post-id={postId}>
          <div className="news-composer-author">
            <Avatar
              size={40}
              src={author.avatarUrl || undefined}
              style={{ backgroundColor: avatarColor(author.name) }}
            >
              {initials(author.name)}
            </Avatar>
            <strong>{author.name}</strong>
          </div>
          {/* Khóa khi đang lưu: kết quả trả về thay nội dung ô, chữ gõ giữa chừng sẽ mất */}
          <Input.TextArea
            className="news-composer-text"
            variant="borderless"
            autoFocus
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="Bạn muốn thông báo điều gì?"
            value={composer.text}
            disabled={saving}
            onChange={(event) => composer.setText(event.target.value)}
          />
          {images.length || uploading ? (
            <div className="news-composer-images">
              {images.map((image, index) => (
                <div key={image.id} className="news-composer-image">
                  <img src={image.thumbUrl} alt="" />
                  {index === 0 ? <span className="news-composer-cover">Ảnh bìa</span> : null}
                  <button
                    type="button"
                    className="news-composer-remove"
                    aria-label="Bỏ ảnh"
                    disabled={saving}
                    onClick={() => composer.removeImage(image.id)}
                  >
                    <CloseOutlined />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploading }, (_, index) => (
                <div key={`uploading-${index}`} className="news-composer-image is-uploading">
                  <Spin size="small" />
                </div>
              ))}
            </div>
          ) : null}
          <div className="news-composer-add">
            <span>{full ? `Đủ ${NEWS_LIMITS.images} ảnh` : 'Thêm vào bài viết'}</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT_IMAGES}
              hidden
              onChange={onFiles}
            />
            <Button
              type="text"
              className="news-composer-add-button"
              icon={<PictureOutlined className="news-composer-icon-photo" />}
              disabled={busy || full}
              onClick={() => fileRef.current?.click()}
            >
              Ảnh từ máy
            </Button>
            <Button
              type="text"
              className="news-composer-add-button"
              icon={<AppstoreOutlined className="news-composer-icon-library" />}
              disabled={busy || full}
              onClick={() => setPicking(true)}
            >
              Thư viện ảnh
            </Button>
          </div>
        </div>
      )}
      {picking ? (
        <NewsImagePicker
          postId={postId}
          onClose={() => setPicking(false)}
          onPicked={(image) => {
            composer.addImage(image);
            setPicking(false);
          }}
        />
      ) : null}
      <Modal
        open={composer.problem === 'conflict'}
        title="Bài vừa được người khác sửa."
        onCancel={() => composer.setProblem(null)}
        footer={[
          <Button key="stay" onClick={() => composer.setProblem(null)}>
            Xem lại nội dung đang soạn
          </Button>,
          <Button key="reload" type="primary" onClick={() => void composer.reload()}>
            Tải lại
          </Button>,
        ]}
      >
        Tải lại để lấy bản mới nhất. Nội dung bạn đang soạn sẽ mất, nên hãy sao chép phần cần giữ
        trước.
      </Modal>
      <Modal
        open={composer.problem === 'gone'}
        title="Bài không còn tồn tại"
        closable={false}
        footer={[
          <Button key="back" type="primary" onClick={onClose}>
            Đóng
          </Button>,
        ]}
      >
        Có người vừa xóa bài này nên không lưu được nữa.
      </Modal>
    </Modal>
  );
}

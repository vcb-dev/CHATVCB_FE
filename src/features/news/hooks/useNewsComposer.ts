import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { apiErrorText } from '@/lib/errors';
import { imageFileError } from '@/lib/image';
import type { NewsImage, NewsPost } from '@/types';
import { composeToPost, postToCompose, type ComposedPost } from '../utils/compose';
import { feedImages } from '../utils/feed';
import { NEWS_LIMITS } from '../utils/news';

export type ComposerProblem = 'conflict' | 'gone' | null;

/** Nháp chưa từng đăng mà bản đã lưu không có gì thì không đáng giữ khi đóng hộp */
export function isEmptyDraft(post: NewsPost | null): boolean {
  return Boolean(
    post &&
      post.status === 'draft' &&
      !post.publishedAt &&
      !post.title &&
      !post.blocks.length &&
      !post.cover,
  );
}

export function useNewsComposer(postId: string) {
  const queryClient = useQueryClient();
  const [post, setPost] = useState<NewsPost | null>(null);
  // Cập nhật ngay khi có bản mới, vì hộp có thể đóng trước lần render kế tiếp
  const savedRef = useRef<NewsPost | null>(null);
  const aliveRef = useRef(true);
  const [text, setTextState] = useState('');
  const [images, setImages] = useState<NewsImage[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ComposerProblem>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const apply = useCallback((next: NewsPost) => {
    savedRef.current = next;
    setPost(next);
    setTextState(postToCompose(next));
    setImages(feedImages(next).map(({ image }) => image));
    setDirty(false);
  }, []);

  const handleFailure = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 409) {
      setProblem('conflict');
    } else if (err instanceof ApiError && err.status === 404) {
      setProblem('gone');
    } else {
      void message.error(apiErrorText(err, 'Không lưu được bài. Kiểm tra kết nối rồi thử lại.'));
    }
  }, []);

  const reload = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      try {
        const next = await api.newsPost(postId);
        if (isCancelled()) {
          return;
        }
        apply(next);
        setProblem(null);
      } catch (err) {
        if (!isCancelled()) {
          handleFailure(err);
        }
      }
    },
    [apply, handleFailure, postId],
  );

  useEffect(() => {
    let cancelled = false;
    void reload(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const save = useCallback(async (): Promise<NewsPost | null> => {
    if (!post) {
      return null;
    }
    let composed: ComposedPost;
    try {
      composed = composeToPost(text, images, post.blocks);
    } catch (err) {
      void message.error((err as Error).message);
      return null;
    }
    setSaving(true);
    try {
      const saved = await api.updateNewsPost(postId, {
        ...composed,
        expectedUpdatedAt: post.updatedAt,
      });
      apply(saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
      return saved;
    } catch (err) {
      handleFailure(err);
      return null;
    } finally {
      setSaving(false);
    }
  }, [apply, handleFailure, images, post, postId, queryClient, text]);

  const publish = useCallback(async (): Promise<NewsPost | null> => {
    const current = dirty ? await save() : post;
    if (!current) {
      return null;
    }
    setSaving(true);
    try {
      const published = await api.publishNewsPost(postId, current.updatedAt);
      apply(published);
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
      return published;
    } catch (err) {
      handleFailure(err);
      return null;
    } finally {
      setSaving(false);
    }
  }, [apply, dirty, handleFailure, post, postId, queryClient, save]);

  const setText = useCallback((value: string) => {
    setTextState(value);
    setDirty(true);
  }, []);

  const addImage = useCallback((image: NewsImage) => {
    setImages((list) => [...list, image]);
    setDirty(true);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((list) => list.filter((image) => image.id !== id));
    setDirty(true);
  }, []);

  /** Tải lần lượt; ảnh nào lỗi thì báo riêng ảnh đó, các ảnh khác vẫn tải */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      const valid: File[] = [];
      for (const file of files) {
        const invalid = imageFileError(file);
        if (invalid) {
          void message.error(`${file.name}: ${invalid}`);
        } else {
          valid.push(file);
        }
      }
      const room = Math.max(0, NEWS_LIMITS.images - images.length);
      if (valid.length > room) {
        void message.warning(`Mỗi bài tối đa ${NEWS_LIMITS.images} ảnh.`);
      }
      const queue = valid.slice(0, room);
      setUploading(queue.length);
      for (const file of queue) {
        if (!aliveRef.current) {
          return;
        }
        try {
          const image = await api.uploadNewsImage(postId, file);
          setImages((list) => [...list, image]);
          setDirty(true);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            setProblem('gone');
            setUploading(0);
            return;
          }
          void message.error(`${file.name}: ${apiErrorText(err, 'Không tải được ảnh.')}`);
        }
        setUploading((count) => count - 1);
      }
    },
    [images.length, postId],
  );

  return {
    post,
    savedRef,
    text,
    setText,
    images,
    addImage,
    removeImage,
    uploadFiles,
    uploading,
    dirty,
    saving,
    problem,
    setProblem,
    save,
    publish,
    reload,
  };
}

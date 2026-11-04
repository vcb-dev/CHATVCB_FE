import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { NewsBlock, NewsImage, NewsPost } from '@/types';

export type EditorBlock = NewsBlock & { key: string };
export type NewBlockType = NewsBlock['type'];
export type EditorProblem = 'conflict' | 'gone' | null;

function failureText(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Không lưu được bài. Kiểm tra kết nối rồi thử lại.';
}

export function useNewsEditor(postId: string) {
  const queryClient = useQueryClient();
  const nextKey = useRef(0);
  const [post, setPost] = useState<NewsPost | null>(null);
  const [title, setTitleState] = useState('');
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [images, setImages] = useState<NewsImage[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [problem, setProblem] = useState<EditorProblem>(null);

  const apply = useCallback((next: NewsPost) => {
    setPost(next);
    setTitleState(next.title);
    setBlocks(
      next.blocks.map((block) => ({ ...block, key: String((nextKey.current += 1)) })),
    );
    setImages(next.images);
    setCoverId(next.cover?.id ?? null);
    setDirty(false);
  }, []);

  const handleFailure = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 409) {
      setProblem('conflict');
    } else if (err instanceof ApiError && err.status === 404) {
      setProblem('gone');
    } else {
      void message.error(failureText(err));
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await api.newsPost(postId));
      setProblem(null);
    } catch (err) {
      handleFailure(err);
    }
  }, [apply, handleFailure, postId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshLists = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary }),
    [queryClient],
  );

  const save = useCallback(async (): Promise<NewsPost | null> => {
    if (!post) {
      return null;
    }
    setSaving(true);
    try {
      const saved = await api.updateNewsPost(postId, {
        title,
        blocks: blocks.map(({ key: _key, ...block }) => block as NewsBlock),
        coverImageId: coverId,
        expectedUpdatedAt: post.updatedAt,
      });
      apply(saved);
      setSavedAt(new Date());
      void refreshLists();
      return saved;
    } catch (err) {
      handleFailure(err);
      return null;
    } finally {
      setSaving(false);
    }
  }, [apply, blocks, coverId, handleFailure, post, postId, refreshLists, title]);

  const publish = useCallback(async (): Promise<NewsPost | null> => {
    const current = dirty ? await save() : post;
    if (!current) {
      return null;
    }
    setSaving(true);
    try {
      const published = await api.publishNewsPost(postId, current.updatedAt);
      apply(published);
      void refreshLists();
      return published;
    } catch (err) {
      handleFailure(err);
      return null;
    } finally {
      setSaving(false);
    }
  }, [apply, dirty, handleFailure, post, postId, refreshLists, save]);

  const setTitle = useCallback((value: string) => {
    setTitleState(value);
    setDirty(true);
  }, []);

  const addBlock = useCallback((block: NewsBlock) => {
    setBlocks((list) => [...list, { ...block, key: String((nextKey.current += 1)) }]);
    setDirty(true);
  }, []);

  const updateBlock = useCallback((key: string, patch: { text?: string; caption?: string }) => {
    setBlocks((list) =>
      list.map((block) => (block.key === key ? ({ ...block, ...patch } as EditorBlock) : block)),
    );
    setDirty(true);
  }, []);

  const moveBlock = useCallback((key: string, step: -1 | 1) => {
    setBlocks((list) => {
      const from = list.findIndex((block) => block.key === key);
      const to = from + step;
      if (from < 0 || to < 0 || to >= list.length) {
        return list;
      }
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setDirty(true);
  }, []);

  const removeBlock = useCallback((key: string) => {
    setBlocks((list) => list.filter((block) => block.key !== key));
    setDirty(true);
  }, []);

  const addImage = useCallback((image: NewsImage) => {
    setImages((list) => [...list, image]);
  }, []);

  const setCover = useCallback((id: string | null) => {
    setCoverId(id);
    setDirty(true);
  }, []);

  // Tính trên bản đã lưu cộng ảnh vừa tải: bỏ thay đổi mà nháp vẫn trống thì không đáng giữ
  const isSavedEmpty = Boolean(
    post &&
      post.status === 'draft' &&
      !post.publishedAt &&
      !post.title &&
      !post.blocks.length &&
      !images.length,
  );

  return {
    post,
    title,
    setTitle,
    blocks,
    images,
    coverId,
    dirty,
    saving,
    savedAt,
    problem,
    setProblem,
    isSavedEmpty,
    addBlock,
    updateBlock,
    moveBlock,
    removeBlock,
    addImage,
    setCover,
    save,
    publish,
    reload,
  };
}

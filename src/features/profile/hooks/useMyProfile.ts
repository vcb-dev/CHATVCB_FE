import { message as antMessage } from 'antd';
import { useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { compressImage } from '@/lib/image';
import type { User } from '@/types';

export function useMyProfile(
  user: User,
  onUserUpdate: (payload: { user: User }) => void,
) {
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    void api
      .me()
      .then((next) => onUserUpdate({ user: { ...userRef.current, ...next } }))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeAvatar(file: File) {
    const preview = URL.createObjectURL(file);
    onUserUpdate({ user: { ...userRef.current, avatarUrl: preview } });
    try {
      onUserUpdate(await api.uploadMyAvatar(await compressImage(file, 400)));
      antMessage.success('Đã đổi ảnh đại diện.');
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không đổi được ảnh.');
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  return { changeAvatar };
}

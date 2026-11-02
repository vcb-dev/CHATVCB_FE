import { api } from '@/api/client';
import type { User } from '@/types';

/** Cập nhật roles/permissions sau khi admin đổi quyền — JWT giữ nguyên. */
export async function refreshSessionUser(): Promise<User | null> {
  if (!localStorage.getItem('chatvcb.token')) {
    return null;
  }
  const next = await api.me();
  localStorage.setItem('chatvcb.user', JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('chatvcb:user-refreshed', { detail: next }));
  return next;
}

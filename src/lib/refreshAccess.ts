import { api } from '@/api/client';
import type { User } from '@/types';

/** Cập nhật roles/permissions sau khi admin đổi quyền — JWT giữ nguyên. */
export async function refreshSessionUser(): Promise<User> {
  const next = await api.me();
  window.dispatchEvent(new CustomEvent('chatvcb:user-refreshed', { detail: next }));
  return next;
}

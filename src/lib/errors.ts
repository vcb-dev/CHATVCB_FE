import { ApiError } from '@/api/client';

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Lỗi từ BE đã là câu tiếng Việt; lỗi mạng (`Failed to fetch`) thì thay bằng câu `offline`. */
export function apiErrorText(err: unknown, offline: string): string {
  return err instanceof ApiError ? err.message : offline;
}

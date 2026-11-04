import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { GalleryAccess } from '@/types';

const NO_ACCESS: GalleryAccess = { canReview: false, canReadPrivate: false };

/** FE không tự suy ra quyền, chỉ đọc từ BE */
export function useGalleryAccess(): GalleryAccess {
  const { data } = useQuery({
    queryKey: queryKeys.galleryAccess,
    queryFn: () => api.galleryAccess(),
    staleTime: 60_000,
  });
  return data ?? NO_ACCESS;
}

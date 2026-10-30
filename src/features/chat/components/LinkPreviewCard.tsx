import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';

export function LinkPreviewCard({ url }: { url: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.linkPreview(url),
    queryFn: () => api.linkPreview(url),
    staleTime: Infinity,
    retry: false,
  });

  if (isLoading || isError || !data || !data.title) {
    return null;
  }

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }

  return (
    <a
      className="link-card"
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {data.imageUrl ? (
        <img className="link-card-img" src={data.imageUrl} alt="" loading="lazy" />
      ) : null}
      <div className="link-card-body">
        <small>{data.siteName || hostname}</small>
        <strong>{data.title}</strong>
        {data.description ? <span>{data.description}</span> : null}
      </div>
    </a>
  );
}

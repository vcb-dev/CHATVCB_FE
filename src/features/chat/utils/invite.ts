export function inviteUrl(token: string): string {
  const configured = (import.meta.env.VITE_WEB_URL ?? '').replace(/\/$/, '');
  const base =
    configured ||
    (window.location.protocol === 'http:' || window.location.protocol === 'https:'
      ? window.location.origin
      : '');
  return base ? `${base}/#/join?token=${encodeURIComponent(token)}` : '';
}

export function parseJoinHash(hash: string): string | null {
  if (!hash) return null;
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  const qIndex = clean.indexOf('?');
  if (qIndex === -1) return null;
  const path = clean.slice(0, qIndex).replace(/^\//, '');
  if (path !== 'join') return null;
  const search = clean.slice(qIndex + 1);
  const params = new URLSearchParams(search);
  return params.get('token') || null;
}

export function inviteTokenOf(url: string): string | null {
  if (!url) return null;
  const match = url.match(/#\/?join\?[^#\s]*token=([^&#\s]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

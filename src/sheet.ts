export function parseSheetHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.startsWith('/sheet')) {
    return null;
  }
  const query = new URLSearchParams(raw.split('?')[1] || '');
  return { id: query.get('id') || '', draft: query.get('draft') || '' };
}

export function sheetTabUrl(next: { id?: string; draft?: string }) {
  const url = new URL(window.location.href);
  const query = new URLSearchParams();
  if (next.id) {
    query.set('id', next.id);
  }
  if (next.draft) {
    query.set('draft', next.draft);
  }
  url.hash = `/sheet${query.size ? `?${query}` : ''}`;
  return url.toString();
}

export function openSheetTab(next: { id?: string; draft?: string }) {
  const opened = window.open(sheetTabUrl(next), '_blank');
  if (!opened) {
    window.location.hash = sheetTabUrl(next).split('#')[1] || '/sheet';
  }
}

export function draftKey(key: string) {
  return `chatvcb.sheet.${key}`;
}

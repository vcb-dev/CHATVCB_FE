export const LINK = /https?:\/\/[^\s<>"']+/g;
const TRAILING_PUNCT = /[.,;:!?)*~]+$/;

export function splitLinkPunct(raw: string): { url: string; punct: string } {
  const m = raw.match(TRAILING_PUNCT);
  if (!m) return { url: raw, punct: '' };
  return {
    url: raw.slice(0, raw.length - m[0].length),
    punct: m[0],
  };
}

/** Tách văn bản thuần thành phần chữ và phần link http(s), không dựng HTML. */
export function textParts(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const { url, punct } = splitLinkPunct(match[0]);
    if (!url) continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: url, href: url });
    last = match.index + match[0].length - punct.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export type RichInline =
  | { type: 'text'; text: string }
  | { type: 'bold' | 'italic' | 'strike'; children: RichInline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; url: string };

export type RichBlock =
  | { type: 'paragraph'; lines: RichInline[][] }
  | { type: 'code'; text: string }
  | { type: 'list'; ordered: boolean; items: RichInline[][] };

export const LINK = /https?:\/\/[^\s<>"']+/g;
const TRAILING_PUNCT = /[.,;:!?)]+$/;

function splitLinkPunct(raw: string): { url: string; punct: string } {
  const m = raw.match(TRAILING_PUNCT);
  if (!m) return { url: raw, punct: '' };
  return {
    url: raw.slice(0, raw.length - m[0].length),
    punct: m[0],
  };
}

export function firstLink(text: string): string | null {
  if (!text) return null;
  const regex = new RegExp(LINK.source, LINK.flags);
  const match = regex.exec(text);
  if (!match) return null;
  const { url } = splitLinkPunct(match[0]);
  return url || null;
}

function flattenText(nodes: RichInline[]): RichInline[] {
  const res: RichInline[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      if (!node.text) continue;
      const last = res[res.length - 1];
      if (last && last.type === 'text') {
        last.text += node.text;
      } else {
        res.push({ type: 'text', text: node.text });
      }
    } else if ('children' in node) {
      res.push({
        ...node,
        children: flattenText(node.children),
      });
    } else {
      res.push(node);
    }
  }
  return res;
}

function parseItalic(s: string): RichInline[] {
  const isLetterOrNum = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== '*' && ch !== '_') continue;

    // Opening condition
    const nextChar = s[i + 1];
    if (!nextChar || /\s/.test(nextChar)) continue;
    if (ch === '_') {
      const prevChar = i > 0 ? s[i - 1] : undefined;
      if (prevChar && isLetterOrNum(prevChar)) continue;
    }

    // Look for closing delimiter of same type
    for (let j = i + 2; j < s.length; j++) {
      if (s[j] !== ch) continue;

      const prevClose = s[j - 1];
      if (!prevClose || /\s/.test(prevClose)) continue;
      if (ch === '_') {
        const nextClose = j + 1 < s.length ? s[j + 1] : undefined;
        if (nextClose && isLetterOrNum(nextClose)) continue;
      }

      // Valid italic pair!
      const before = s.slice(0, i);
      const content = s.slice(i + 1, j);
      const after = s.slice(j + 1);

      return [
        ...parseInline(before),
        { type: 'italic', children: parseInline(content) },
        ...parseInline(after),
      ];
    }
  }

  return [{ type: 'text', text: s }];
}

export function parseInline(text: string): RichInline[] {
  if (!text) return [];

  // 1. Inline code: `...`
  const codeMatch = text.match(/`([^`\n]+)`/);
  if (codeMatch && codeMatch.index !== undefined) {
    const before = text.slice(0, codeMatch.index);
    const code = codeMatch[1];
    const after = text.slice(codeMatch.index + codeMatch[0].length);
    return flattenText([
      ...parseInline(before),
      { type: 'code', text: code },
      ...parseInline(after),
    ]);
  }

  // 2. Link
  const linkRegex = new RegExp(LINK.source, LINK.flags);
  const linkMatch = linkRegex.exec(text);
  if (linkMatch && linkMatch.index !== undefined) {
    const { url, punct } = splitLinkPunct(linkMatch[0]);
    if (url) {
      const before = text.slice(0, linkMatch.index);
      const after = punct + text.slice(linkMatch.index + linkMatch[0].length);
      return flattenText([
        ...parseInline(before),
        { type: 'link', url },
        ...parseInline(after),
      ]);
    }
  }

  // 3. Bold: **...** and Strike: ~~...~~
  const boldStrikeMatch = text.match(/(\*\*|~~)(.+?)\1/s);
  if (boldStrikeMatch && boldStrikeMatch.index !== undefined) {
    const delim = boldStrikeMatch[1];
    const content = boldStrikeMatch[2];
    const before = text.slice(0, boldStrikeMatch.index);
    const after = text.slice(boldStrikeMatch.index + boldStrikeMatch[0].length);
    const type = delim === '**' ? 'bold' : 'strike';
    return flattenText([
      ...parseInline(before),
      { type, children: parseInline(content) },
      ...parseInline(after),
    ]);
  }

  // 4. Italic: *...* and _..._
  return flattenText(parseItalic(text));
}

export function parseRichText(text: string): RichBlock[] {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: RichBlock[] = [];

  let currentParagraph: { type: 'paragraph'; lines: RichInline[][] } | null = null;
  let currentList: { type: 'list'; ordered: boolean; items: RichInline[][] } | null = null;

  function flushParagraph() {
    if (currentParagraph) {
      blocks.push(currentParagraph);
      currentParagraph = null;
    }
  }

  function flushList() {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code block
    if (trimmed.startsWith('```')) {
      flushParagraph();
      flushList();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trim() === '```') {
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    // 3. Empty line
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // 2. Lists
    const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (currentList && currentList.ordered) {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'list', ordered: false, items: [] };
      }
      currentList.items.push(parseInline(bulletMatch[1]));
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (currentList && !currentList.ordered) {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'list', ordered: true, items: [] };
      }
      currentList.items.push(parseInline(orderedMatch[1]));
      continue;
    }

    // 4. Heading: /^#{1,6}\s+(.*)$/
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      flushList();
      if (!currentParagraph) {
        currentParagraph = { type: 'paragraph', lines: [] };
      }
      currentParagraph.lines.push([
        { type: 'bold', children: parseInline(headingMatch[1]) },
      ]);
      continue;
    }

    // 5. Normal line in paragraph
    flushList();
    if (!currentParagraph) {
      currentParagraph = { type: 'paragraph', lines: [] };
    }
    currentParagraph.lines.push(parseInline(line));
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export type AvatarPalette = {
  solid: string;
  from: string;
  to: string;
  text: string;
  gradient: string;
  cover: string;
};

const AVATAR_PALETTES: AvatarPalette[] = [
  {
    solid: '#dbeafe',
    from: '#dbeafe',
    to: '#bfdbfe',
    text: '#1e40af',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    cover: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #ede9fe 100%)',
  },
  {
    solid: '#dcfce7',
    from: '#dcfce7',
    to: '#bbf7d0',
    text: '#166534',
    gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    cover: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 50%, #e0f2fe 100%)',
  },
  {
    solid: '#ffedd5',
    from: '#ffedd5',
    to: '#fed7aa',
    text: '#9a3412',
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
    cover: 'linear-gradient(135deg, #fef3c7 0%, #ffedd5 50%, #ffe4e6 100%)',
  },
  {
    solid: '#ede9fe',
    from: '#ede9fe',
    to: '#ddd6fe',
    text: '#5b21b6',
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
    cover: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 50%, #fce7f3 100%)',
  },
  {
    solid: '#fce7f3',
    from: '#fce7f3',
    to: '#fbcfe8',
    text: '#9d174d',
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
    cover: 'linear-gradient(135deg, #fce7f3 0%, #fae8ff 50%, #ffe4e6 100%)',
  },
  {
    solid: '#ccfbf1',
    from: '#ccfbf1',
    to: '#99f6e4',
    text: '#115e59',
    gradient: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
    cover: 'linear-gradient(135deg, #ccfbf1 0%, #e0f2fe 50%, #dcfce7 100%)',
  },
  {
    solid: '#fef3c7',
    from: '#fef3c7',
    to: '#fde68a',
    text: '#92400e',
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    cover: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 50%, #ffedd5 100%)',
  },
];

function hashName(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

export function avatarPalette(name: string): AvatarPalette {
  return AVATAR_PALETTES[hashName(name) % AVATAR_PALETTES.length];
}

export function avatarColor(name: string) {
  return avatarPalette(name).solid;
}

export function avatarCoverGradient(name?: string) {
  if (!name?.trim()) {
    return 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #ede9fe 100%)';
  }
  return avatarPalette(name).cover;
}

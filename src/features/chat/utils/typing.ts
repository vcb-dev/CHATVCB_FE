export function typingText(names: string[]): string {
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return `${names[0]} đang soạn tin…`;
  }
  if (names.length === 2) {
    return `${names[0]} và ${names[1]} đang soạn tin…`;
  }
  return 'Nhiều người đang soạn tin…';
}

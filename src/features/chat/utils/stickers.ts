export function isStickerText(text: string) {
  const value = text.trim();
  if (!value || value.length > 8) {
    return false;
  }
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s\uFE0F\u200D]+$/u.test(value);
}

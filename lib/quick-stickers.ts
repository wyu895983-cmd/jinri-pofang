export function insertAtSelection(value: string, token: string, start: number, end: number, maxLength: number) {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const nextValue = `${value.slice(0, safeStart)}${token}${value.slice(safeEnd)}`;
  if (maxLength > 0 && nextValue.length > maxLength) return null;
  return { value: nextValue, caret: safeStart + token.length };
}

export function shouldShowQuickStickers(value: string, dismissed: boolean) {
  return value.length === 0 || !dismissed;
}

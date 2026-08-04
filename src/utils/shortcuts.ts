export interface ShortcutEvent {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export function matchesShortcut(event: ShortcutEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+').map((part) => part.trim()).filter(Boolean);
  const key = parts.at(-1);
  if (!key || event.key.toLowerCase() !== key) return false;

  const wantsCtrl = parts.includes('ctrl') || parts.includes('control');
  const wantsMeta = parts.includes('meta') || parts.includes('cmd') || parts.includes('command');
  const wantsAlt = parts.includes('alt') || parts.includes('option');
  const wantsShift = parts.includes('shift');
  return event.ctrlKey === wantsCtrl
    && event.metaKey === wantsMeta
    && event.altKey === wantsAlt
    && event.shiftKey === wantsShift;
}

import { describe, expect, it } from 'vitest';
import { matchesShortcut, type ShortcutEvent } from '../../src/utils/shortcuts';

const event = (key: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

describe('matchesShortcut', () => {
  it('matches plain keys without extra modifiers', () => {
    expect(matchesShortcut(event('J'), 'j')).toBe(true);
    expect(matchesShortcut(event('j', { ctrlKey: true }), 'j')).toBe(false);
  });

  it('matches modifier combinations case-insensitively', () => {
    expect(matchesShortcut(event('j', { ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+J')).toBe(true);
    expect(matchesShortcut(event('j', { ctrlKey: true }), 'Ctrl+Shift+J')).toBe(false);
  });

  it('supports command aliases on macOS', () => {
    expect(matchesShortcut(event('k', { metaKey: true }), 'Cmd+K')).toBe(true);
  });
});

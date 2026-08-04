import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { KeyboardShortcuts } from '../models/types';
import { matchesShortcut } from '../utils/shortcuts';

interface KeyboardNavState {
  active: boolean;
  focusIndex: number;
  setActive(active: boolean): void;
  setFocusIndex(index: number): void;
  totalItems: number;
  setTotalItems(count: number): void;
}

const KeyboardNavContext = createContext<KeyboardNavState>({
  active: false,
  focusIndex: -1,
  setActive: () => {},
  setFocusIndex: () => {},
  totalItems: 0,
  setTotalItems: () => {},
});

export function useKeyboardNav() {
  return useContext(KeyboardNavContext);
}

interface ProviderProps {
  children: ReactNode;
  shortcuts: KeyboardShortcuts;
  onClassify?(index: number, status: 'keep' | 'maybe' | 'reject'): void;
  onOpen?(index: number): void;
}

export function KeyboardNavProvider({ children, shortcuts, onClassify, onOpen }: ProviderProps) {
  const [active, setActive] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [totalItems, setTotalItems] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'escape') {
        setActive(false);
        setFocusIndex(-1);
        return;
      }

      if (matchesShortcut(event, shortcuts.nextResult)) {
        event.preventDefault();
        setActive(true);
        setFocusIndex((prev) => Math.min(prev + 1, totalItems - 1));
        return;
      }

      if (matchesShortcut(event, shortcuts.prevResult)) {
        event.preventDefault();
        setActive(true);
        setFocusIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (!active || focusIndex < 0) return;

      if (key === 'enter' && onOpen) {
        event.preventDefault();
        onOpen(focusIndex);
        return;
      }

      if (matchesShortcut(event, shortcuts.keepResult) && onClassify) {
        event.preventDefault();
        onClassify(focusIndex, 'keep');
        return;
      }

      if (matchesShortcut(event, shortcuts.maybeResult) && onClassify) {
        event.preventDefault();
        onClassify(focusIndex, 'maybe');
        return;
      }

      if (matchesShortcut(event, shortcuts.rejectResult) && onClassify) {
        event.preventDefault();
        onClassify(focusIndex, 'reject');
        return;
      }
    },
    [active, focusIndex, totalItems, shortcuts, onClassify, onOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <KeyboardNavContext.Provider
      value={{ active, focusIndex, setActive, setFocusIndex, totalItems, setTotalItems }}
    >
      {children}
    </KeyboardNavContext.Provider>
  );
}

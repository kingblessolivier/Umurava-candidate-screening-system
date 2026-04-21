import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = (shortcut.ctrlKey || shortcut.metaKey) 
          ? (e.ctrlKey || e.metaKey) 
          : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Common shortcuts
export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', ctrlKey: true, metaKey: true } as const,
  SEARCH: { key: 'k', ctrlKey: true, metaKey: true } as const,
  ESCAPE: { key: 'Escape' } as const,
  ENTER: { key: 'Enter' } as const,
  DELETE: { key: 'Delete' } as const,
  BULK_SELECT: { key: 'b', ctrlKey: true, metaKey: true } as const,
} as const;

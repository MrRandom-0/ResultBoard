import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutHelp } from '../../src/components/ShortcutHelp';
import { DEFAULT_SHORTCUTS } from '../../src/models/types';

describe('ShortcutHelp', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ShortcutHelp open={false} shortcuts={DEFAULT_SHORTCUTS} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('lists the configured shortcuts and the built-in keys', () => {
    render(<ShortcutHelp open shortcuts={{ ...DEFAULT_SHORTCUTS, keepResult: 'ctrl+k' }} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Next result')).toBeInTheDocument();
    expect(screen.getByText('ctrl+k')).toBeInTheDocument();
    expect(screen.getByText('Open focused result')).toBeInTheDocument();
    expect(screen.getByText('Show this help')).toBeInTheDocument();
  });

  it('closes from the close button and on Escape', () => {
    const onClose = vi.fn();
    render(<ShortcutHelp open shortcuts={DEFAULT_SHORTCUTS} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close shortcut help' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

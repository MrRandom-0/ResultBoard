import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionBar } from '../../src/components/BulkActionBar';
import type { Tag } from '../../src/models/types';

const tags: Tag[] = [
  { id: 'tag-1', projectId: 'proj-1', name: 'Important', color: '#ff0000', createdAt: '2024-01-01T00:00:00.000Z' },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof BulkActionBar>> = {}) {
  const props: React.ComponentProps<typeof BulkActionBar> = {
    count: 2,
    visibleCount: 5,
    tags,
    onClassify: vi.fn(),
    onTag: vi.fn(),
    onRemove: vi.fn(),
    onSelectAllVisible: vi.fn(),
    onClear: vi.fn(),
    onDone: vi.fn(),
    ...overrides,
  };
  render(<BulkActionBar {...props} />);
  return props;
}

describe('BulkActionBar', () => {
  it('shows the selection count and fires classify actions', () => {
    const props = renderBar();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(props.onClassify).toHaveBeenCalledWith('keep');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(props.onClassify).toHaveBeenCalledWith('reject');
  });

  it('disables actions when nothing is selected', () => {
    renderBar({ count: 0 });
    expect(screen.getByText('Select results to act on them together')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('select-all reports the visible count and disables once all are selected', () => {
    const props = renderBar({ count: 5, visibleCount: 5 });
    expect(screen.getByRole('button', { name: /Select all visible/ })).toBeDisabled();
    expect(props.onSelectAllVisible).not.toHaveBeenCalled();
  });

  it('tag menu adds and removes a tag on the selection', () => {
    const props = renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Tag/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add tag Important to selected' }));
    expect(props.onTag).toHaveBeenCalledWith('tag-1', 'add');
    fireEvent.click(screen.getByRole('button', { name: /Tag/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Important from selected' }));
    expect(props.onTag).toHaveBeenCalledWith('tag-1', 'remove');
  });

  it('remove asks for confirmation before firing', () => {
    const props = renderBar();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(props.onRemove).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(props.onRemove).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('clear and exit fire their handlers', () => {
    const props = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(props.onClear).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Exit select mode' }));
    expect(props.onDone).toHaveBeenCalledTimes(1);
  });
});

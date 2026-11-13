import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DuplicatesDialog } from '../../src/components/DuplicatesDialog';
import type { SearchResultRecord } from '../../src/models/types';
import type { DuplicateGroup } from '../../src/utils/records';

function makeRecord(overrides: Partial<SearchResultRecord> = {}): SearchResultRecord {
  return {
    id: 'rec-1',
    projectId: 'proj-1',
    canonicalUrl: 'https://example.com/page',
    url: 'https://example.com/page',
    title: 'Example Page',
    snippet: 'A snippet.',
    domain: 'example.com',
    status: 'keep',
    rejectionReason: '',
    notes: '',
    tagIds: [],
    sourceQueries: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const groups: DuplicateGroup[] = [
  {
    projectId: 'proj-1',
    canonicalUrl: 'https://example.com/page',
    keeper: makeRecord({ id: 'keeper' }),
    duplicates: [makeRecord({ id: 'dup-1', createdAt: '2024-02-01T00:00:00.000Z' })],
  },
  {
    projectId: 'proj-1',
    canonicalUrl: 'https://other.com/post',
    keeper: makeRecord({ id: 'keeper-2', canonicalUrl: 'https://other.com/post', url: 'https://other.com/post', title: 'Other Post', domain: 'other.com' }),
    duplicates: [makeRecord({ id: 'dup-2', canonicalUrl: 'https://other.com/post', createdAt: '2024-03-01T00:00:00.000Z' })],
  },
];

describe('DuplicatesDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<DuplicatesDialog open={false} groups={groups} onRemoveIds={vi.fn()} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('removes one group at a time, keeping the earliest copy', async () => {
    const onRemoveIds = vi.fn().mockResolvedValue(undefined);
    render(<DuplicatesDialog open groups={groups} onRemoveIds={onRemoveIds} onClose={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Keep earliest, remove 1/ })[0]!);
    expect(onRemoveIds).toHaveBeenCalledWith(['dup-1']);
  });

  it('can remove every duplicate across groups from the footer', () => {
    const onRemoveIds = vi.fn().mockResolvedValue(undefined);
    render(<DuplicatesDialog open groups={groups} onRemoveIds={onRemoveIds} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove all 2 duplicates' }));
    expect(onRemoveIds).toHaveBeenCalledWith(['dup-1', 'dup-2']);
  });

  it('shows the cleaned-up state when no groups remain', () => {
    render(<DuplicatesDialog open groups={[]} onRemoveIds={vi.fn()} onClose={() => {}} />);
    expect(screen.getByText(/All duplicates are cleaned up/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove all/ })).toBeNull();
  });
});

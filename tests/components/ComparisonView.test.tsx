import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonView } from '../../src/components/ComparisonView';
import type { ComparisonCriterion, SearchResultRecord, Tag } from '../../src/models/types';

function makeRecord(overrides: Partial<SearchResultRecord> = {}): SearchResultRecord {
  return {
    id: 'rec-1',
    projectId: 'proj-1',
    canonicalUrl: 'https://example.com',
    url: 'https://example.com',
    title: 'Example Page',
    snippet: 'A snippet description.',
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

function makeCriterion(overrides: Partial<ComparisonCriterion> = {}): ComparisonCriterion {
  return {
    id: 'crit-1',
    projectId: 'proj-1',
    name: 'Relevance',
    weight: 50,
    ...overrides,
  };
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'tag-1',
    projectId: 'proj-1',
    name: 'Research',
    color: '#4488ff',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ComparisonView', () => {
  const defaultProps = {
    records: [
      makeRecord({ id: 'r1', title: 'First Result', status: 'keep' }),
      makeRecord({ id: 'r2', title: 'Second Result', status: 'maybe', url: 'https://other.com', domain: 'other.com' }),
    ],
    criteria: [] as ComparisonCriterion[],
    tags: [] as Tag[],
    onClose: vi.fn(),
  };

  it('renders comparison header with title', () => {
    render(<ComparisonView {...defaultProps} />);
    expect(screen.getByText('Comparison Mode')).toBeInTheDocument();
  });

  it('renders a card for each record', () => {
    render(<ComparisonView {...defaultProps} />);
    expect(screen.getByText('First Result')).toBeInTheDocument();
    expect(screen.getByText('Second Result')).toBeInTheDocument();
  });

  it('renders close button that calls onClose', () => {
    const onClose = vi.fn();
    render(<ComparisonView {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close comparison');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows hint when no criteria are defined', () => {
    render(<ComparisonView {...defaultProps} criteria={[]} />);
    expect(screen.getByText(/Add comparison criteria/)).toBeInTheDocument();
  });

  it('does not show hint when criteria exist', () => {
    const criteria = [makeCriterion()];
    render(<ComparisonView {...defaultProps} criteria={criteria} />);
    expect(screen.queryByText(/Add comparison criteria/)).not.toBeInTheDocument();
  });

  it('displays scores when criteria are provided', () => {
    const criteria = [makeCriterion({ weight: 100 })];
    const records = [
      makeRecord({ id: 'r1', criterionScores: { 'crit-1': 5 } }),
      makeRecord({ id: 'r2', criterionScores: { 'crit-1': 2.5 } }),
      makeRecord({ id: 'r3', criterionScores: { 'crit-1': 0 } }),
    ];

    render(<ComparisonView records={records} criteria={criteria} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles weighted criteria correctly', () => {
    const criteria = [
      makeCriterion({ id: 'c1', name: 'Quality', weight: 70 }),
      makeCriterion({ id: 'c2', name: 'Speed', weight: 30 }),
    ];
    const records = [makeRecord({ id: 'r1', criterionScores: { c1: 5, c2: 5 } })];

    render(<ComparisonView records={records} criteria={criteria} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Speed')).toBeInTheDocument();
    expect(screen.getAllByText('5/5')).toHaveLength(2);
  });

  it('renders with 2 records', () => {
    const records = [
      makeRecord({ id: 'r1', title: 'Record A' }),
      makeRecord({ id: 'r2', title: 'Record B' }),
    ];

    render(<ComparisonView records={records} criteria={[]} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('Record A')).toBeInTheDocument();
    expect(screen.getByText('Record B')).toBeInTheDocument();
  });

  it('renders with 4 records', () => {
    const records = [
      makeRecord({ id: 'r1', title: 'A' }),
      makeRecord({ id: 'r2', title: 'B' }),
      makeRecord({ id: 'r3', title: 'C' }),
      makeRecord({ id: 'r4', title: 'D' }),
    ];

    render(<ComparisonView records={records} criteria={[]} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('displays tags on cards', () => {
    const tags = [
      makeTag({ id: 'tag-1', name: 'Frontend' }),
      makeTag({ id: 'tag-2', name: 'Backend' }),
    ];
    const records = [makeRecord({ id: 'r1', tagIds: ['tag-1', 'tag-2'] })];

    render(<ComparisonView records={records} criteria={[]} tags={tags} onClose={vi.fn()} />);
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('displays snippets on cards', () => {
    const records = [makeRecord({ snippet: 'This is a detailed snippet about the page.' })];
    render(<ComparisonView records={records} criteria={[]} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('This is a detailed snippet about the page.')).toBeInTheDocument();
  });

  it('displays notes on cards', () => {
    const records = [makeRecord({ notes: 'My personal notes about this result.' })];
    render(<ComparisonView records={records} criteria={[]} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('My personal notes about this result.')).toBeInTheDocument();
  });

  it('displays domain for each card', () => {
    const records = [
      makeRecord({ id: 'r1', domain: 'react.dev' }),
      makeRecord({ id: 'r2', domain: 'angular.io' }),
    ];
    render(<ComparisonView records={records} criteria={[]} tags={[]} onClose={vi.fn()} />);
    expect(screen.getByText('react.dev')).toBeInTheDocument();
    expect(screen.getByText('angular.io')).toBeInTheDocument();
  });

  it('renders record links with correct href', () => {
    const records = [makeRecord({ title: 'Link Test', url: 'https://example.com/page' })];
    render(<ComparisonView records={records} criteria={[]} tags={[]} onClose={vi.fn()} />);
    const link = screen.getByText('Link Test').closest('a');
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

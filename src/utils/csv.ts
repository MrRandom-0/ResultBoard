import type { Project, SearchResultRecord, Tag } from '../models/types';

function cell(value: string): string {
  const safe = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function recordsToCsv(records: SearchResultRecord[], project: Project, tags: Tag[]): string {
  const header = ['Project', 'Title', 'URL', 'Status', 'Domain', 'Notes', 'Tags', 'Source queries', 'Created', 'Updated'];
  const rows = records.filter((record) => record.projectId === project.id).map((record) => [
    project.name, record.title, record.url, record.status, record.domain, record.notes,
    record.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean).join('; '),
    record.sourceQueries.join('; '), record.createdAt, record.updatedAt
  ]);
  return [header.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\r\n');
}

export function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

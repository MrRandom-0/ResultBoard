import type { Project, SearchResultRecord, StoredDatabase, Tag } from '../models/types';

/**
 * Export full project data as JSON with metadata.
 */
export function recordsToJson(state: StoredDatabase, projectId: string): string {
  const project = state.projects.find((p) => p.id === projectId);
  const records = state.records.filter((r) => r.projectId === projectId);
  const tags = state.tags.filter((t) => t.projectId === projectId);
  const criteria = state.comparisonCriteria.filter((c) => c.projectId === projectId);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: state.version,
    project: project ?? null,
    records,
    tags,
    comparisonCriteria: criteria,
    stats: {
      total: records.length,
      keep: records.filter((r) => r.status === 'keep').length,
      maybe: records.filter((r) => r.status === 'maybe').length,
      reject: records.filter((r) => r.status === 'reject').length,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export records as formatted Markdown.
 */
export function recordsToMarkdown(
  records: SearchResultRecord[],
  project: Project,
  tags: Tag[]
): string {
  const markdownText = (value: string): string => value.replace(/[\\`*_{}()#+!|]|\[|\]/g, '\\$&');
  const lines: string[] = [];
  lines.push(`# ${project.name}`);
  lines.push('');
  lines.push(`Exported on ${new Date().toLocaleDateString()} | ${records.length} results`);
  lines.push('');

  const grouped: Record<string, SearchResultRecord[]> = { keep: [], maybe: [], reject: [] };
  for (const record of records) {
    const group = grouped[record.status];
    if (group) group.push(record);
  }

  for (const [status, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    const heading = status === 'keep' ? 'Kept' : status === 'maybe' ? 'Maybe' : 'Rejected';
    lines.push(`## ${heading} (${items.length})`);
    lines.push('');

    for (const record of items) {
      lines.push(`### ${markdownText(record.title)}`);
      lines.push('');
      lines.push(`<${record.url.replaceAll('>', '%3E')}>`);
      lines.push('');
      lines.push(`- **Domain:** ${record.domain}`);
      if (record.snippet) {
        lines.push(`- **Snippet:** ${record.snippet}`);
      }
      if (record.notes) {
        lines.push(`- **Notes:** ${record.notes}`);
      }
      if (record.rejectionReason) {
        lines.push(`- **Rejection reason:** ${record.rejectionReason}`);
      }
      const recordTags = record.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter(Boolean);
      if (recordTags.length) {
        lines.push(`- **Tags:** ${recordTags.join(', ')}`);
      }
      if (record.sourceQueries.length) {
        lines.push(`- **Found via:** ${record.sourceQueries.join(', ')}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Export records as a standalone HTML page with inline styles.
 */
export function recordsToHtml(
  records: SearchResultRecord[],
  project: Project,
  tags: Tag[]
): string {
  const escape = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const statusColor: Record<string, string> = {
    keep: '#496d59',
    maybe: '#936d2d',
    reject: '#a84949',
  };

  const cards = records
    .map((record) => {
      const color = statusColor[record.status] ?? '#666';
      const recordTags = record.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter(Boolean);

      return `<div class="card">
  <div class="status" style="background:${color}"></div>
  <div class="content">
    <h3><a href="${escape(record.url)}" target="_blank" rel="noopener noreferrer">${escape(record.title)}</a></h3>
    <span class="domain">${escape(record.domain)}</span>
    <span class="badge" style="color:${color}">${escape(record.status)}</span>
    ${record.snippet ? `<p class="snippet">${escape(record.snippet)}</p>` : ''}
    ${record.notes ? `<p class="notes"><strong>Notes:</strong> ${escape(record.notes)}</p>` : ''}
    ${record.rejectionReason ? `<p class="notes"><strong>Reason:</strong> ${escape(record.rejectionReason)}</p>` : ''}
    ${recordTags.length ? `<p class="tags">Tags: ${recordTags.map((t) => `<span class="tag">${escape(t!)}</span>`).join(' ')}</p>` : ''}
  </div>
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(project.name)} - ResultBoard Export</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;background:#f5f6f3;color:#18201b;padding:40px 20px;max-width:900px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.meta{color:#69736c;margin-bottom:32px}
.card{display:flex;border:1px solid #dfe4df;border-radius:12px;background:#fff;margin-bottom:12px;overflow:hidden}
.card .status{width:4px;flex-shrink:0}
.card .content{padding:16px;flex:1}
.card h3{font-size:15px;margin-bottom:4px}
.card h3 a{color:#18201b;text-decoration:none}
.card h3 a:hover{text-decoration:underline}
.domain{font-size:12px;color:#69736c;margin-right:8px}
.badge{font-size:12px;font-weight:600;text-transform:uppercase}
.snippet{margin-top:8px;font-size:13px;color:#69736c}
.notes{margin-top:6px;font-size:13px}
.tags{margin-top:6px;font-size:12px;color:#69736c}
.tag{background:#e5efe8;padding:2px 6px;border-radius:4px;margin-left:4px}
</style>
</head>
<body>
<h1>${escape(project.name)}</h1>
<p class="meta">Exported on ${new Date().toLocaleDateString()} | ${records.length} results</p>
${cards}
</body>
</html>`;
}

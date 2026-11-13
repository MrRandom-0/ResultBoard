import { Check, Clipboard, ExternalLink, MoreHorizontal, Square, SquareCheckBig, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SearchResultRecord, Tag } from '../models/types';

interface Props {
  record: SearchResultRecord; tags: Tag[]; compact: boolean;
  onUpdate(patch: { status?: SearchResultRecord['status']; notes?: string; tagIds?: string[]; criterionScores?: Record<string, number> }): Promise<unknown>;
  onRemove(): Promise<unknown>;
  selected?: boolean;
  onToggleSelect?(): void;
  /** Verb used for the select toggle, e.g. 'comparison' (default) or 'bulk actions'. */
  selectionPurpose?: string;
}
export function ResultCard({ record, tags, compact, onUpdate, onRemove, selected = false, onToggleSelect, selectionPurpose = 'comparison' }: Props) {
  const [notes, setNotes] = useState(record.notes); const [expanded, setExpanded] = useState(false); const [copied, setCopied] = useState(false);
  const projectTags = tags.filter((tag) => tag.projectId === record.projectId);
  const copy = async () => { await navigator.clipboard.writeText(record.url); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return <article className={`result-card ${compact ? 'compact' : ''}`}>
    <div className={`status-stripe ${record.status}`} />
    <div className="result-main">
      <div className="result-head"><div className="result-copy"><a href={record.url} target="_blank" rel="noreferrer">{record.title}</a><span>{record.domain}</span></div>
        <div className="card-actions">{onToggleSelect && <button className="icon-button" title={selected ? `Remove from ${selectionPurpose}` : `Select for ${selectionPurpose}`} aria-label={selected ? `Remove from ${selectionPurpose}` : `Select for ${selectionPurpose}`} aria-pressed={selected} onClick={onToggleSelect}>{selected ? <SquareCheckBig size={15} /> : <Square size={15} />}</button>}<button className="icon-button" title="Open result" aria-label="Open result" onClick={() => window.open(record.url, '_blank', 'noopener')}><ExternalLink size={15} /></button><button className="icon-button" title="Copy URL" aria-label="Copy URL" onClick={() => void copy()}>{copied ? <Check size={15} /> : <Clipboard size={15} />}</button><button className="icon-button" title={expanded ? 'Hide details' : 'Show details'} aria-label={expanded ? 'Hide details' : 'Show details'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><MoreHorizontal size={16} /></button></div>
      </div>
      {!compact && record.snippet && <p className="snippet">{record.snippet}</p>}
      <div className="card-meta"><span className={`badge ${record.status}`}>{record.status}</span>{record.tagIds.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <span className="tag" key={id} style={{ '--tag': tag.color } as React.CSSProperties}>{tag.name}</span> : null; })}<time>{new Date(record.createdAt).toLocaleDateString()}</time></div>
      {expanded && <div className="card-details">
        <label>Notes<textarea rows={3} value={notes} placeholder="Why is this useful?" onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (notes !== record.notes) void onUpdate({ notes }); }} /></label>
        <fieldset><legend>Tags</legend><div className="tag-picker">{projectTags.length ? projectTags.map((tag) => <label key={tag.id}><input type="checkbox" checked={record.tagIds.includes(tag.id)} onChange={() => void onUpdate({ tagIds: record.tagIds.includes(tag.id) ? record.tagIds.filter((id) => id !== tag.id) : [...record.tagIds, tag.id] })} /><span style={{ '--tag': tag.color } as React.CSSProperties}>{tag.name}</span></label>) : <small className="muted">Create tags from the filter bar.</small>}</div></fieldset>
        <div className="detail-actions"><select aria-label="Change status" value={record.status} onChange={(e) => void onUpdate({ status: e.target.value as SearchResultRecord['status'] })}><option value="keep">Keep</option><option value="maybe">Maybe</option><option value="reject">Rejected</option></select><button className="button danger" onClick={() => { if (confirm('Remove this result from the project?')) void onRemove(); }}><Trash2 size={14} /> Remove</button></div>
        {record.sourceQueries.length > 0 && <small className="muted">Found via: {record.sourceQueries.join(', ')}</small>}
      </div>}
    </div>
  </article>;
}

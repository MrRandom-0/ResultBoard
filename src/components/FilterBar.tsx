import { Filter, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Tag } from '../models/types';
import type { RecordFilters, SortKey } from '../utils/records';

interface Props {
  filters: RecordFilters;
  setFilters(next: RecordFilters): void;
  sort: SortKey;
  setSort(next: SortKey): void;
  tags: Tag[];
  domains: string[];
  onCreateTag(name: string): Promise<unknown>;
}

export function FilterBar({ filters, setFilters, sort, setSort, tags, domains, onCreateTag }: Props) {
  const [open, setOpen] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [tagName, setTagName] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const createTag = async () => {
    const name = tagName.trim();
    if (!name) return;
    await onCreateTag(name);
    setTagName('');
    setCreatingTag(false);
  };

  return (
    <div ref={rootRef} className="filters">
      <div className="search-box">
        <Search size={16} />
        <input aria-label="Search results" placeholder="Search title, notes, domain…" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
        {filters.query && <button aria-label="Clear search" onClick={() => setFilters({ ...filters, query: '' })}><X size={14} /></button>}
      </div>
      <button className={`icon-button ${open ? 'selected' : ''}`} aria-label="Filters" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}><Filter size={16} /></button>
      <select className="sort" aria-label="Sort results" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
        <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title</option><option value="domain">Domain</option>
      </select>
      {open && (
        <div className="filter-panel" role="dialog" aria-label="Filter results">
          <label>Domain<select value={filters.domain} onChange={(event) => setFilters({ ...filters, domain: event.target.value })}><option value="">Any domain</option>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
          <label>Notes<select value={filters.hasNote === null ? '' : String(filters.hasNote)} onChange={(event) => setFilters({ ...filters, hasNote: event.target.value === '' ? null : event.target.value === 'true' })}><option value="">With or without</option><option value="true">Has note</option><option value="false">No note</option></select></label>
          <fieldset>
            <legend>Tags</legend>
            <div className="tag-filter">
              {tags.map((tag) => <label key={tag.id}><input type="checkbox" checked={filters.tagIds.includes(tag.id)} onChange={() => setFilters({ ...filters, tagIds: filters.tagIds.includes(tag.id) ? filters.tagIds.filter((id) => id !== tag.id) : [...filters.tagIds, tag.id] })} />{tag.name}</label>)}
              {creatingTag ? (
                <form className="tag-create" onSubmit={(event) => { event.preventDefault(); void createTag(); }}>
                  <input autoFocus maxLength={50} placeholder="Tag name" value={tagName} onChange={(event) => setTagName(event.target.value)} />
                  <button className="button" type="submit" disabled={!tagName.trim()}>Add</button>
                  <button className="icon-button" type="button" aria-label="Cancel new tag" onClick={() => { setCreatingTag(false); setTagName(''); }}><X size={13} /></button>
                </form>
              ) : <button onClick={() => setCreatingTag(true)}><Plus size={13} /> New tag</button>}
            </div>
          </fieldset>
          <button className="button" onClick={() => setFilters({ query: '', statuses: [], tagIds: [], domain: '', hasNote: null })}>Clear filters</button>
        </div>
      )}
    </div>
  );
}

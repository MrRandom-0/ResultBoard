import { BarChart3, X } from 'lucide-react';
import type { ComparisonCriterion, SearchResultRecord, Tag } from '../models/types';
import { calculateComparisonScores } from '../utils/records';

interface Props {
  records: SearchResultRecord[];
  criteria: ComparisonCriterion[];
  tags: Tag[];
  onClose(): void;
  onUpdate?(recordId: string, criterionScores: Record<string, number>): Promise<unknown>;
}

export function ComparisonView({ records, criteria, tags, onClose, onUpdate }: Props) {
  const scores = calculateComparisonScores(records, criteria);

  const statusColor: Record<string, string> = {
    keep: 'var(--accent)',
    maybe: 'var(--amber)',
    reject: 'var(--danger)',
  };

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h2><BarChart3 size={18} /> Comparison Mode</h2>
        <button className="icon-button" aria-label="Close comparison" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {criteria.length === 0 && (
        <p className="comparison-hint muted">
          Add comparison criteria in Settings to enable weighted scoring.
        </p>
      )}

      <div className="comparison-grid" style={{ '--col-count': records.length } as React.CSSProperties}>
        {records.map((record) => {
          const scoreEntry = scores.find((s) => s.recordId === record.id);
          const score = scoreEntry ? Math.round(scoreEntry.score * 100) : 0;
          const recordTags = record.tagIds
            .map((id) => tags.find((t) => t.id === id))
            .filter(Boolean);

          return (
            <div className="comparison-card" key={record.id}>
              <div className="comparison-card-status" style={{ background: statusColor[record.status] ?? 'var(--border)' }} />
              <h3>
                <a href={record.url} target="_blank" rel="noreferrer">
                  {record.title}
                </a>
              </h3>
              <span className="comparison-domain">{record.domain}</span>

              {record.snippet && <p className="comparison-snippet">{record.snippet}</p>}

              {criteria.length > 0 && (
                <div className="comparison-score">
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${score}%` }} />
                  </div>
                  <span className="score-label">{score}%</span>
                </div>
              )}

              {criteria.length > 0 && (
                <div className="comparison-criteria">
                  {criteria.map((criterion) => (
                    <div className="criterion-row criterion-rating" key={criterion.id}>
                      <label htmlFor={`${record.id}-${criterion.id}`}>{criterion.name}</label>
                      <input
                        id={`${record.id}-${criterion.id}`}
                        type="range"
                        min={0}
                        max={5}
                        step={1}
                        value={record.criterionScores?.[criterion.id] ?? 0}
                        disabled={!onUpdate}
                        onChange={(event) => void onUpdate?.(record.id, {
                          ...(record.criterionScores ?? {}),
                          [criterion.id]: Number(event.target.value)
                        })}
                      />
                      <span className="criterion-weight">{record.criterionScores?.[criterion.id] ?? 0}/5</span>
                    </div>
                  ))}
                </div>
              )}

              {recordTags.length > 0 && (
                <div className="comparison-tags">
                  {recordTags.map((tag) =>
                    tag ? (
                      <span
                        className="tag"
                        key={tag.id}
                        style={{ '--tag': tag.color } as React.CSSProperties}
                      >
                        {tag.name}
                      </span>
                    ) : null
                  )}
                </div>
              )}

              {record.notes && <p className="comparison-notes">{record.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

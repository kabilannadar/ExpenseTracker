import { GitCommit, Megaphone } from 'lucide-react';
import { RELEASES, BADGE_COLORS, TYPE_LABELS } from '../data/updatesData';

export default function Updates() {
  return (
    <div className="page-wrapper" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Updates &amp; Bug Fixes</h1>
          <p className="page-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Everything that's new, improved, or fixed — in plain language</p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: 'var(--accent-primary, #6366f1)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <GitCommit size={15} />
          {RELEASES.reduce((acc, r) => acc + r.entries.length, 0)} changes across {RELEASES.length} releases
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {RELEASES.map((release, ri) => {
          const badge = BADGE_COLORS[release.labelColor] || BADGE_COLORS.accent;
          return (
            <div key={ri} className="animate-in">
              {/* Release header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  {release.version}
                </span>
                <span
                  style={{
                    padding: '3px 12px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    fontSize: 12,
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.text,
                  }}
                >
                  {release.label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {release.date}
                </span>
              </div>

              {/* Release entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {release.entries.map((entry, ei) => {
                  const Icon = entry.icon;
                  const typeLabel = TYPE_LABELS[entry.type] || entry.type;
                  return (
                    <div
                      key={ei}
                      style={{
                        display: 'flex',
                        gap: 16,
                        padding: '16px 20px',
                        background: 'var(--bg-card, #1e1e2e)',
                        border: '1px solid var(--border, #2d2d3d)',
                        borderRadius: 'var(--radius-lg, 12px)',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-md, 8px)',
                          background: `${entry.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: entry.color,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entry.title}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full, 9999px)',
                              fontSize: 11,
                              fontWeight: 600,
                              background: `${entry.color}15`,
                              color: entry.color,
                              border: `1px solid ${entry.color}25`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {typeLabel}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {entry.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom note */}
      <div
        style={{
          marginTop: '32px',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg, 12px)',
          background: 'var(--bg-card, #1e1e2e)',
          border: '1px solid var(--border, #2d2d3d)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--text-muted)',
        }}
      >
        <Megaphone size={15} style={{ color: 'var(--accent-primary, #6366f1)', flexShrink: 0 }} />
        More improvements coming soon. This page is updated with every release.
      </div>
    </div>
  );
}

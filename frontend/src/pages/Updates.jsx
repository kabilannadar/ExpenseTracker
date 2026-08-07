import { GitCommit, Megaphone, Calendar } from 'lucide-react';
import { RELEASES, BADGE_COLORS, TYPE_LABELS } from '../data/updatesData';

export default function Updates() {
  return (
    <div className="page-wrapper" style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        .updates-timeline {
          position: relative;
          padding-left: 36px;
          margin-left: 10px;
          border-left: 2px dashed var(--border);
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .release-group {
          position: relative;
        }
        .release-dot {
          position: absolute;
          left: -47px;
          top: 6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg-base);
          border: 4px solid var(--primary, #6366f1);
          box-shadow: 0 0 14px var(--primary);
          z-index: 10;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .release-group:hover .release-dot {
          transform: scale(1.25);
          border-color: #0088cc;
          box-shadow: 0 0 20px #0088cc;
        }
        .update-card {
          display: flex;
          gap: 18px;
          padding: 20px;
          background: var(--bg-card) !important;
          backdrop-filter: blur(12px);
          border: 1px solid var(--border) !important;
          border-radius: 16px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .update-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--card-accent-color);
          border-radius: 4px 0 0 4px;
          transition: all 0.3s ease;
        }
        .update-card:hover {
          transform: translateX(6px) translateY(-2px);
          border-color: var(--border-active) !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1), 0 0 20px var(--card-accent-glow);
        }
        .update-card:hover::before {
          width: 6px;
        }
        .updates-gradient-title {
          font-size: 32px;
          font-weight: 850;
          background: linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 70%, #0088cc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -1px;
          margin: 0 0 6px 0;
        }
        .pulse-badge {
          animation: pulseGlow 2s infinite alternate;
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.2); }
          100% { box-shadow: 0 0 16px rgba(99, 102, 241, 0.5); }
        }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="updates-gradient-title">System Updates</h1>
          <p className="page-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Discover what is new, optimized, and fixed in ExpenseTracker</p>
        </div>
        <div
          className="pulse-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: '99px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: 'var(--accent-primary, #6366f1)',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <GitCommit size={15} />
          {RELEASES.reduce((acc, r) => acc + r.entries.length, 0)} Changes across {RELEASES.length} Releases
        </div>
      </div>

      {/* Timeline */}
      <div className="updates-timeline">
        {RELEASES.map((release, ri) => {
          const badge = BADGE_COLORS[release.labelColor] || BADGE_COLORS.accent;
          return (
            <div key={ri} className="release-group animate-in" style={{ animationDelay: `${ri * 0.1}s` }}>
              {/* Release dot on timeline */}
              <div className="release-dot" style={{ borderColor: ri === 0 ? 'var(--primary)' : 'var(--border)' }} />

              {/* Release header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  {release.version}
                </span>
                <span
                  style={{
                    padding: '4px 14px',
                    borderRadius: '99px',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: badge.bg,
                    color: badge.text,
                    letterSpacing: '0.5px',
                    boxShadow: `0 2px 10px ${badge.bg}`
                  }}
                >
                  {release.label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} /> {release.date}
                </span>
              </div>

              {/* Release entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {release.entries.map((entry, ei) => {
                  const Icon = entry.icon;
                  const typeLabel = TYPE_LABELS[entry.type] || entry.type;
                  return (
                    <div
                      key={ei}
                      className="update-card"
                      style={{
                        '--card-accent-color': entry.color,
                        '--card-accent-glow': `${entry.color}22`
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '12px',
                          background: `${entry.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: entry.color,
                          flexShrink: 0,
                          boxShadow: `0 4px 10px ${entry.color}10`
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                            {entry.title}
                          </span>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: '99px',
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: `${entry.color}15`,
                              color: entry.color,
                              border: `1px solid ${entry.color}25`,
                              whiteSpace: 'nowrap',
                              letterSpacing: '0.3px'
                            }}
                          >
                            {typeLabel}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '13px',
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
          marginTop: '48px',
          padding: '18px 24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30, 30, 46, 0.4), rgba(20, 20, 35, 0.4))',
          border: '1px solid var(--border, #2d2d3d)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Megaphone size={16} style={{ color: 'var(--accent-primary, #6366f1)', flexShrink: 0 }} />
        More features and optimizations are underway. Check back for future release details!
      </div>
    </div>
  );
}

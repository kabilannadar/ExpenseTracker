import { useEffect, useRef } from 'react';
import { X, Megaphone, GitCommit } from 'lucide-react';
import { RELEASES, BADGE_COLORS, TYPE_LABELS } from '../data/updatesData';

const totalChanges = RELEASES.reduce((a, r) => a + r.entries.length, 0);

/* Map type → a subtle background/border colour token */
const TYPE_STYLE = {
  feat:  { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.22)',  text: '#a5b4fc' },
  style: { bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)', text: '#c4b5fd' },
  fix:   { bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.22)',   text: '#86efac' },
  chore: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.22)', text: '#94a3b8' },
};

export default function UpdatesPanel({ onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      function handleClick(e) {
        if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, 10);
    return () => clearTimeout(t);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="upanel"
      role="dialog"
      aria-label="Updates & Bug Fixes"
    >
      {/* ── Gradient accent bar at top ── */}
      <div className="upanel-accent-bar" />

      {/* ── Header ── */}
      <div className="upanel-header">
        <div className="upanel-header-left">
          <div className="upanel-icon-wrap">
            <Megaphone size={14} />
          </div>
          <div>
            <div className="upanel-title">What's New</div>
            <div className="upanel-subtitle">
              <GitCommit size={10} style={{ flexShrink: 0 }} />
              {totalChanges} changes · {RELEASES.length} releases
            </div>
          </div>
        </div>
        <button className="upanel-close" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="upanel-body">
        {RELEASES.map((release, ri) => {
          const badge = BADGE_COLORS[release.labelColor] || BADGE_COLORS.accent;
          return (
            <div key={ri} className="upanel-release">
              {/* Release header */}
              <div className="upanel-release-header">
                <div className="upanel-release-left">
                  <span className="upanel-version">{release.version}</span>
                  <span
                    className="upanel-release-badge"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {release.label}
                  </span>
                </div>
                <span className="upanel-date">{release.date}</span>
              </div>

              {/* Entries */}
              <div className="upanel-entries">
                {release.entries.map((entry, ei) => {
                  const Icon = entry.icon;
                  const ts = TYPE_STYLE[entry.type] || TYPE_STYLE.chore;
                  const typeLabel = TYPE_LABELS[entry.type] || entry.type;
                  return (
                    <div key={ei} className="upanel-entry">
                      <div
                        className="upanel-entry-icon"
                        style={{ background: `${entry.color}18`, color: entry.color }}
                      >
                        <Icon size={13} />
                      </div>
                      <div className="upanel-entry-body">
                        <div className="upanel-entry-top">
                          <span className="upanel-entry-title">{entry.title}</span>
                          <span
                            className="upanel-entry-type"
                            style={{
                              background: ts.bg,
                              border: `1px solid ${ts.border}`,
                              color: ts.text,
                            }}
                          >
                            {typeLabel}
                          </span>
                        </div>
                        <p className="upanel-entry-detail">{entry.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer note */}
        <div className="upanel-footer">
          <Megaphone size={11} />
          More improvements ship with every release.
        </div>
      </div>
    </div>
  );
}

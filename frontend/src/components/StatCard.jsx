import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, color = 'accent', trend, subtitle }) {
  const colorMap = {
    accent: { bg: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' },
    success: { bg: 'var(--success-bg)', color: 'var(--success)' },
    danger: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    info: { bg: 'var(--info-bg)', color: 'var(--info)' },
  };
  const c = colorMap[color] || colorMap.accent;

  return (
    <div className="stat-card card">
      <div className="stat-card-header">
        <div className="stat-icon" style={{ background: c.bg }}>
          {Icon && <Icon size={20} style={{ color: c.color }} />}
        </div>
        {trend !== undefined && (
          <span className={`badge ${trend >= 0 ? 'badge-success' : 'badge-danger'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}

      <style>{`
        .stat-card { padding: 20px; cursor: default; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), 0 0 0 1px var(--border-active); }
        .stat-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-value { font-size: 26px; font-weight: 800; color: var(--text-primary); letter-spacing: -1px; margin-bottom: 4px; }
        .stat-title { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .stat-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
      `}</style>
    </div>
  );
}

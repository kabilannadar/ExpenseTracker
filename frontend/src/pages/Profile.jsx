import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, exportApi, getApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Moon, Sun, Download, Save } from 'lucide-react';
import './Profile.css';

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', currency: user?.currency || 'INR', timezone: user?.timezone || 'Asia/Kolkata', dark_mode: user?.dark_mode ?? true });
  const [exportFilter, setExportFilter] = useState('this_month');

  const updateMut = useMutation({
    mutationFn: (d) => userApi.updateMe(d),
    onSuccess: (r) => {
      updateUser(r.data);
      document.documentElement.setAttribute('data-theme', r.data.dark_mode ? 'dark' : 'light');
      toast.success('Profile updated!');
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const handleExport = async (type) => {
    try {
      const res = type === 'csv'
        ? await exportApi.csv({ date_filter: exportFilter })
        : await exportApi.excel({ date_filter: exportFilter });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses.${type === 'csv' ? 'csv' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Profile</h1><p className="page-subtitle">Manage your account settings</p></div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Profile Settings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div className="profile-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); updateMut.mutate(form); }}>
            <div className="form-group"><label className="form-label">Full Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}>
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <div className="theme-toggle">
                <button
                  type="button"
                  className={`theme-btn ${!form.dark_mode ? 'active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, dark_mode: false }))}
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  type="button"
                  className={`theme-btn ${form.dark_mode ? 'active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, dark_mode: true }))}
                >
                  <Moon size={16} /> Dark
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={updateMut.isPending}>
              <Save size={16} /> Save Changes
            </button>
          </form>
        </div>

        {/* Export Panel */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={18} style={{ color: 'var(--accent-primary)' }} /> Export Data
          </h2>
          <div className="form-group">
            <label className="form-label">Date Range</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DATE_FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setExportFilter(f.value)}
                  className={exportFilter === f.value ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleExport('csv')}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleExport('excel')}>
              <Download size={14} /> Export Excel
            </button>
          </div>
          <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Account Info</strong>
            Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}


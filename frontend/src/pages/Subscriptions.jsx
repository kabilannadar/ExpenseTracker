import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const CYCLE_LABELS = { daily: '/day', weekly: '/wk', monthly: '/mo', yearly: '/yr' };
const EMPTY = { name: '', amount: '', billing_cycle: 'monthly', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '', sub_type: '', features: '' };

export default function Subscriptions() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [activeTab, setActiveTab] = useState('all');

  const { data: subs = [] } = useQuery({ queryKey: ['subscriptions'], queryFn: () => subscriptionsApi.getAll().then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d) => subscriptionsApi.create(d), onSuccess: () => { qc.invalidateQueries(['subscriptions']); toast.success('Subscription added!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => subscriptionsApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['subscriptions']); toast.success('Updated!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const deleteMut = useMutation({ mutationFn: (id) => subscriptionsApi.delete(id), onSuccess: () => { qc.invalidateQueries(['subscriptions']); toast.success('Removed'); }, onError: (e) => toast.error(getApiError(e)) });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (s) => { setForm({ name: s.name, amount: s.amount, billing_cycle: s.billing_cycle || 'monthly', start_date: s.start_date, end_date: s.end_date || '', sub_type: s.sub_type || '', features: s.features || '' }); setModal(s); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount), end_date: form.end_date || null };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const CYCLES = ['daily', 'weekly', 'monthly', 'yearly'];
  const CYCLE_SUFFIX = { daily: '/day', weekly: '/wk', monthly: '/mo', yearly: '/yr' };
  const cycleTotals = CYCLES.map(c => ({
    cycle: c,
    total: subs.filter(s => s.is_active && (s.billing_cycle || 'monthly') === c).reduce((a, s) => a + s.amount, 0),
    count: subs.filter(s => s.is_active && (s.billing_cycle || 'monthly') === c).length,
  })).filter(ct => ct.count > 0);
  const toMonthly = (s) => {
    const c = s.billing_cycle || 'monthly';
    if (c === 'daily')  return s.amount * 30;
    if (c === 'weekly') return s.amount * (52 / 12);
    if (c === 'yearly') return s.amount / 12;
    return s.amount;
  };
  const totalMonthly = subs.filter(s => s.is_active).reduce((a, s) => a + toMonthly(s), 0);

  const groupedSubs = {
    daily: subs.filter(s => (s.billing_cycle || 'monthly') === 'daily'),
    weekly: subs.filter(s => (s.billing_cycle || 'monthly') === 'weekly'),
    monthly: subs.filter(s => (s.billing_cycle || 'monthly') === 'monthly'),
    yearly: subs.filter(s => (s.billing_cycle || 'monthly') === 'yearly'),
  };

  const TABS = [
    { id: 'all', label: 'All Cycles', count: subs.length },
    { id: 'daily', label: 'Daily', count: groupedSubs.daily.length },
    { id: 'weekly', label: 'Weekly', count: groupedSubs.weekly.length },
    { id: 'monthly', label: 'Monthly', count: groupedSubs.monthly.length },
    { id: 'yearly', label: 'Yearly', count: groupedSubs.yearly.length },
  ];

  const CYCLES_ORDER = ['daily', 'weekly', 'monthly', 'yearly'];

  const renderSubCard = (s) => {
    const daysLeft = s.end_date ? differenceInDays(new Date(s.end_date), new Date()) : null;
    const expiringSoon = daysLeft !== null && daysLeft <= 7;
    return (
      <div key={s.id} className="card" style={{ padding: '18px 20px', borderColor: expiringSoon ? 'rgba(245,158,11,0.4)' : 'var(--border)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {s.sub_type ? `${s.sub_type} · ` : ''}Started {format(new Date(s.start_date), 'dd MMM yy')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={() => openEdit(s)}><Pencil size={13} /></button>
            <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete?')) deleteMut.mutate(s.id); }}><Trash2 size={13} /></button>
          </div>
        </div>
        <div className="flex justify-between" style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 18 }}>{fmt(s.amount)}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{CYCLE_LABELS[s.billing_cycle] || '/mo'}</span></span>
          {expiringSoon
            ? <span className="badge badge-warning">Expires in {daysLeft}d</span>
            : s.end_date
              ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Until {format(new Date(s.end_date), 'dd MMM yy')}</span>
              : <span className="badge badge-success">Active</span>}
        </div>
        {s.features && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{s.features}</div>}
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center' }}>
            {cycleTotals.map(ct => (
              <span key={ct.cycle} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{fmt(ct.total)}</span>{CYCLE_SUFFIX[ct.cycle]}
              </span>
            ))}
            {cycleTotals.length > 1 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>≈ {fmt(Math.round(totalMonthly))}/mo total</span>
            )}
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Subscription</button>
      </div>

      {subs.length > 0 && (
        <div className="audit-tabs-container" style={{ margin: '8px 0 16px 0' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn-secondary"
                style={{
                  background: isActive ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: isActive ? '1px solid transparent' : '1px solid var(--border)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: 6,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 11,
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-hover)',
                    color: isActive ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {subs.length === 0 ? (
        <div className="card empty-state"><CreditCard size={40} /><div>No subscriptions yet</div><button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add one</button></div>
      ) : activeTab === 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="animate-in">
          {CYCLES_ORDER.map(cycle => {
            const cycleSubs = groupedSubs[cycle];
            if (cycleSubs.length === 0) return null;
            return (
              <div key={cycle}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ textTransform: 'capitalize' }}>{cycle} Subscriptions</span>
                  <span className="badge badge-accent" style={{ fontSize: '10px', padding: '1px 6px' }}>{cycleSubs.length}</span>
                </h2>
                <div className="grid-2">
                  {cycleSubs.map(renderSubCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="animate-in">
          {groupedSubs[activeTab].length > 0 ? (
            <div className="grid-2">
              {groupedSubs[activeTab].map(renderSubCard)}
            </div>
          ) : (
            <div className="card empty-state">
              <CreditCard size={40} />
              <div>No {activeTab} subscriptions found</div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Subscription' : 'Edit Subscription'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Name *</label><input placeholder="e.g. Netflix, Spotify" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Amount *</label><input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
              <div className="form-group">
                <label className="form-label">Billing Cycle</label>
                <select value={form.billing_cycle} onChange={e => setForm(p => ({ ...p, billing_cycle: e.target.value }))}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Type</label><input placeholder="e.g. Streaming, SaaS" value={form.sub_type} onChange={e => setForm(p => ({ ...p, sub_type: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">End Date</label><input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Features / Notes</label><textarea rows={2} placeholder="What's included..." value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} /></div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


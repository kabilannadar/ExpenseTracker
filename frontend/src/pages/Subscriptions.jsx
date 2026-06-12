import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const EMPTY = { name: '', amount: '', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '', sub_type: '', features: '' };

export default function Subscriptions() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: subs = [] } = useQuery({ queryKey: ['subscriptions'], queryFn: () => subscriptionsApi.getAll().then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d) => subscriptionsApi.create(d), onSuccess: () => { qc.invalidateQueries(['subscriptions']); toast.success('Subscription added!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => subscriptionsApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['subscriptions']); toast.success('Updated!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const deleteMut = useMutation({ mutationFn: (id) => subscriptionsApi.delete(id), onSuccess: () => { qc.invalidateQueries(['subscriptions']); toast.success('Removed'); }, onError: (e) => toast.error(getApiError(e)) });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (s) => { setForm({ name: s.name, amount: s.amount, start_date: s.start_date, end_date: s.end_date || '', sub_type: s.sub_type || '', features: s.features || '' }); setModal(s); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount), end_date: form.end_date || null };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const totalMonthly = subs.filter(s => s.is_active).reduce((a, s) => a + s.amount, 0);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Subscriptions</h1><p className="page-subtitle">Total active: {fmt(totalMonthly)}/mo</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Subscription</button>
      </div>

      {subs.length === 0 ? (
        <div className="card empty-state"><CreditCard size={40} /><div>No subscriptions yet</div><button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add one</button></div>
      ) : (
        <div className="grid-2">
          {subs.map(s => {
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
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 18 }}>{fmt(s.amount)}</span>
                  {expiringSoon
                    ? <span className="badge badge-warning">Expires in {daysLeft}d</span>
                    : s.end_date
                      ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Until {format(new Date(s.end_date), 'dd MMM yy')}</span>
                      : <span className="badge badge-success">Active</span>}
                </div>
                {s.features && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{s.features}</div>}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Subscription' : 'Edit Subscription'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Name *</label><input placeholder="e.g. Netflix, Spotify" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Amount (₹/mo) *</label><input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Type</label><input placeholder="e.g. Streaming, SaaS" value={form.sub_type} onChange={e => setForm(p => ({ ...p, sub_type: e.target.value }))} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required /></div>
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


import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const EMPTY = { title: '', target_amount: '', saved_amount: '0', deadline: '' };

export default function Goals() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: goals = [], isLoading } = useQuery({ queryKey: ['goals'], queryFn: () => goalsApi.getAll().then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d) => goalsApi.create(d), onSuccess: () => { qc.invalidateQueries(['goals']); toast.success('Goal created!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => goalsApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['goals']); toast.success('Goal updated!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const deleteMut = useMutation({ mutationFn: (id) => goalsApi.delete(id), onSuccess: () => { qc.invalidateQueries(['goals']); toast.success('Goal deleted'); }, onError: (e) => toast.error(getApiError(e)) });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (g) => { setForm({ title: g.title, target_amount: g.target_amount, saved_amount: g.saved_amount, deadline: g.deadline || '' }); setModal(g); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { title: form.title, target_amount: parseFloat(form.target_amount), saved_amount: parseFloat(form.saved_amount || 0), deadline: form.deadline || null };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Goals</h1><p className="page-subtitle">Track your financial goals</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> New Goal</button>
      </div>

      {isLoading ? (
        <div className="grid-2">{[...Array(4)].map((_, i) => <div key={i} className="card skeleton" style={{ height: 140 }} />)}</div>
      ) : goals.length === 0 ? (
        <div className="card empty-state"><Target size={40} /><div>No goals yet</div><button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add Goal</button></div>
      ) : (
        <div className="grid-2">
          {goals.map(g => {
            const pct = Math.min(100, ((g.saved_amount / g.target_amount) * 100));
            return (
              <div key={g.id} className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{g.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(g)}><Pencil size={13} /></button>
                    <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete goal?')) deleteMut.mutate(g.id); }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: 'var(--text-muted)' }}>
                  <span>Saved: <strong style={{ color: 'var(--success)' }}>{fmt(g.saved_amount)}</strong></span>
                  <span>Target: <strong style={{ color: 'var(--text-primary)' }}>{fmt(g.target_amount)}</strong></span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'var(--accent-gradient)' }} />
                </div>
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span className={`badge ${pct >= 100 ? 'badge-success' : 'badge-info'}`}>{pct.toFixed(0)}% complete</span>
                  {g.deadline && <span style={{ color: 'var(--text-muted)' }}>By {format(new Date(g.deadline), 'dd MMM yyyy')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Goal' : 'Edit Goal'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Goal Title *</label><input placeholder="e.g. Emergency Fund" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Target Amount (₹) *</label><input type="number" min="0" step="0.01" placeholder="100000" value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Saved So Far (₹)</label><input type="number" min="0" step="0.01" placeholder="0" value={form.saved_amount} onChange={e => setForm(p => ({ ...p, saved_amount: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Deadline (optional)</label><input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} /></div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>{modal === 'create' ? 'Create Goal' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

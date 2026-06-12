import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringApi, categoriesApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const EMPTY = { title: '', amount: '', frequency: 'monthly', next_due: format(new Date(), 'yyyy-MM-dd'), category_id: '' };

export default function Recurring() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: txns = [] } = useQuery({ queryKey: ['recurring'], queryFn: () => recurringApi.getAll().then(r => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.getAll().then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d) => recurringApi.create(d), onSuccess: () => { qc.invalidateQueries(['recurring']); toast.success('Recurring transaction added!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => recurringApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['recurring']); toast.success('Updated!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const deleteMut = useMutation({ mutationFn: (id) => recurringApi.delete(id), onSuccess: () => { qc.invalidateQueries(['recurring']); toast.success('Removed'); }, onError: (e) => toast.error(getApiError(e)) });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (t) => { setForm({ title: t.title, amount: t.amount, frequency: t.frequency, next_due: t.next_due, category_id: t.category_id || '' }); setModal(t); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount), category_id: form.category_id ? parseInt(form.category_id) : null };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Recurring</h1><p className="page-subtitle">Auto-repeating transactions</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Recurring</button>
      </div>

      {txns.length === 0 ? (
        <div className="card empty-state"><RefreshCw size={40} /><div>No recurring transactions</div><button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add one</button></div>
      ) : (
        <div className="grid-2">
          {txns.map(t => (
            <div key={t.id} className="card" style={{ padding: '16px 20px', opacity: t.is_active ? 1 : 0.5 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={16} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.category && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.category.name}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                  <button className="btn-icon btn-danger" onClick={() => { if (confirm('Remove?')) deleteMut.mutate(t.id); }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex justify-between" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(t.amount)}</span>
                <span className={`badge ${t.frequency === 'monthly' ? 'badge-info' : 'badge-warning'}`}>{t.frequency}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Next due: {format(new Date(t.next_due), 'dd MMM yyyy')}</div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Recurring' : 'Edit Recurring'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Title *</label><input placeholder="e.g. Petrol" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Amount (₹) *</label><input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Frequency</label><select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Category</label><select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}><option value="">None</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Next Due Date *</label><input type="date" value={form.next_due} onChange={e => setForm(p => ({ ...p, next_due: e.target.value }))} required /></div>
            </div>
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


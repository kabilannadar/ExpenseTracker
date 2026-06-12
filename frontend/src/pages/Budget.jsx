import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi, categoriesApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const EMPTY = { category_id: '', monthly_limit: '', weekly_limit: '' };

export default function Budget() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: () => budgetsApi.getAll().then(r => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.getAll().then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d) => budgetsApi.create(d), onSuccess: () => { qc.invalidateQueries(['budgets']); qc.invalidateQueries(['dashboard']); toast.success('Budget set!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => budgetsApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['budgets']); qc.invalidateQueries(['dashboard']); toast.success('Budget updated!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const deleteMut = useMutation({ mutationFn: (id) => budgetsApi.delete(id), onSuccess: () => { qc.invalidateQueries(['budgets']); qc.invalidateQueries(['dashboard']); toast.success('Budget removed'); }, onError: (e) => toast.error(getApiError(e)) });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (b) => { setForm({ category_id: b.category_id || '', monthly_limit: b.monthly_limit || '', weekly_limit: b.weekly_limit || '' }); setModal(b); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      category_id: form.category_id ? parseInt(form.category_id) : null,
      monthly_limit: form.monthly_limit ? parseFloat(form.monthly_limit) : null,
      weekly_limit: form.weekly_limit ? parseFloat(form.weekly_limit) : null,
    };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const globalBudget = budgets.find(b => !b.category_id);
  const catBudgets = budgets.filter(b => b.category_id);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Budget</h1><p className="page-subtitle">Set monthly and weekly spending limits</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Set Budget</button>
      </div>

      {/* Global Budget */}
      {globalBudget && (
        <div className="card" style={{ borderColor: 'var(--accent-primary)', borderWidth: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="budget-global-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Global Budget</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Applies to categories without specific budgets</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn-icon" onClick={() => openEdit(globalBudget)}><Pencil size={14} /></button>
                <button className="btn-icon btn-danger" onClick={() => { if (confirm('Remove global budget?')) deleteMut.mutate(globalBudget.id); }}><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              {globalBudget.monthly_limit && (() => {
                const spent = globalBudget.monthly_spent || 0;
                const pct = Math.min(100, (spent / globalBudget.monthly_limit) * 100);
                const remaining = globalBudget.monthly_limit - spent;
                return (
                  <div className="card" style={{ background: 'var(--bg-elevated)', padding: '12px 16px', border: 'none' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Monthly Progress</span>
                      <span className={`badge ${remaining >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                        {remaining >= 0 ? `Remaining: ${fmt(remaining)}` : `Over by: ${fmt(Math.abs(remaining))}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      <strong>{fmt(spent)}</strong> / {fmt(globalBudget.monthly_limit)} ({pct.toFixed(0)}%)
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent-primary)'
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {globalBudget.weekly_limit && (() => {
                const spent = globalBudget.weekly_spent || 0;
                const pct = Math.min(100, (spent / globalBudget.weekly_limit) * 100);
                const remaining = globalBudget.weekly_limit - spent;
                return (
                  <div className="card" style={{ background: 'var(--bg-elevated)', padding: '12px 16px', border: 'none' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Weekly Progress</span>
                      <span className={`badge ${remaining >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                        {remaining >= 0 ? `Remaining: ${fmt(remaining)}` : `Over by: ${fmt(Math.abs(remaining))}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      <strong>{fmt(spent)}</strong> / {fmt(globalBudget.weekly_limit)} ({pct.toFixed(0)}%)
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent-primary)'
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Category Budgets */}
      {catBudgets.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Per-Category Budgets</h2>
          <div className="grid-2">
            {catBudgets.map(b => (
              <div key={b.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: b.category?.color || 'var(--accent-primary)', display: 'inline-block' }} />
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{b.category?.name || 'Unknown'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(b)}><Pencil size={13} /></button>
                    <button className="btn-icon btn-danger" onClick={() => { if (confirm('Remove?')) deleteMut.mutate(b.id); }}><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {b.monthly_limit && (() => {
                    const spent = b.monthly_spent || 0;
                    const pct = Math.min(100, (spent / b.monthly_limit) * 100);
                    const remaining = b.monthly_limit - spent;
                    return (
                      <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                        <div className="flex justify-between items-center" style={{ fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Monthly</span>
                          <span style={{ fontWeight: 500, color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {remaining >= 0 ? `Remaining: ${fmt(remaining)}` : `Over by: ${fmt(Math.abs(remaining))}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <strong>{fmt(spent)}</strong> / {fmt(b.monthly_limit)} ({pct.toFixed(0)}%)
                        </div>
                        <div className="progress-bar" style={{ height: 4 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent-primary)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {b.weekly_limit && (() => {
                    const spent = b.weekly_spent || 0;
                    const pct = Math.min(100, (spent / b.weekly_limit) * 100);
                    const remaining = b.weekly_limit - spent;
                    return (
                      <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                        <div className="flex justify-between items-center" style={{ fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Weekly</span>
                          <span style={{ fontWeight: 500, color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {remaining >= 0 ? `Remaining: ${fmt(remaining)}` : `Over by: ${fmt(Math.abs(remaining))}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <strong>{fmt(spent)}</strong> / {fmt(b.weekly_limit)} ({pct.toFixed(0)}%)
                        </div>
                        <div className="progress-bar" style={{ height: 4 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent-primary)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {budgets.length === 0 && (
        <div className="card empty-state">
          <Wallet size={40} />
          <div>No budgets set yet</div>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Set your first budget</button>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Set Budget' : 'Edit Budget'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Category (leave empty for global budget)</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">Global (all categories)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Monthly Limit (₹)</label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 50000" value={form.monthly_limit} onChange={e => setForm(p => ({ ...p, monthly_limit: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Weekly Limit (₹)</label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 12000" value={form.weekly_limit} onChange={e => setForm(p => ({ ...p, weekly_limit: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>Save Budget</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

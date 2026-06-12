import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi, categoriesApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Bell, CheckCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';

const EMPTY = { title: '', remind_at: '', category_id: '', note: '', description: '' };

export default function Reminders() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: reminders = [] } = useQuery({ queryKey: ['reminders'], queryFn: () => remindersApi.getAll().then(r => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.getAll().then(r => r.data) });

  const createMut = useMutation({ mutationFn: (d) => remindersApi.create(d), onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Reminder set!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => remindersApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Updated!'); setModal(null); }, onError: (e) => toast.error(getApiError(e)) });
  const deleteMut = useMutation({ mutationFn: (id) => remindersApi.delete(id), onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Reminder removed'); }, onError: (e) => toast.error(getApiError(e)) });
  const doneMut = useMutation({ mutationFn: ({ id, is_done }) => remindersApi.update(id, { is_done }), onSuccess: () => qc.invalidateQueries(['reminders']) });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (r) => { setForm({ title: r.title, remind_at: r.remind_at?.slice(0, 16), category_id: r.category_id || '', note: r.note || '', description: r.description || '' }); setModal(r); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, category_id: form.category_id ? parseInt(form.category_id) : null };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const upcoming = reminders.filter(r => !r.is_done);
  const done = reminders.filter(r => r.is_done);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div><h1 className="page-title">Reminders</h1><p className="page-subtitle">{upcoming.length} upcoming</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Reminder</button>
      </div>

      {reminders.length === 0 ? (
        <div className="card empty-state"><Bell size={40} /><div>No reminders</div><button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add Reminder</button></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {upcoming.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>UPCOMING</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(r => {
                  const overdue = isPast(new Date(r.remind_at));
                  return (
                    <div key={r.id} className="card" style={{ padding: '14px 18px', borderColor: overdue ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
                      <div className="reminder-item-container">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button onClick={() => doneMut.mutate({ id: r.id, is_done: true })} style={{ background: 'none', border: '2px solid var(--border)', borderRadius: '50%', width: 22, height: 22, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.title}</div>
                            <div style={{ fontSize: 12, color: overdue ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>
                              {overdue ? '⚠ Overdue · ' : ''}{format(new Date(r.remind_at), 'dd MMM yyyy, h:mm a')}
                              {r.category && ` · ${r.category.name}`}
                            </div>
                            {r.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.note}</div>}
                          </div>
                        </div>
                        <div className="reminder-item-actions">
                          <button className="btn-icon" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                          <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete?')) deleteMut.mutate(r.id); }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>DONE</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.6 }}>
                {done.map(r => (
                  <div key={r.id} className="card" style={{ padding: '12px 18px' }}>
                    <div className="reminder-item-container">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                        <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{r.title}</div>
                      </div>
                      <div className="reminder-item-actions">
                        <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete?')) deleteMut.mutate(r.id); }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Reminder' : 'Edit Reminder'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Title *</label><input placeholder="e.g. Pay electricity bill" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Date & Time *</label><input type="datetime-local" value={form.remind_at} onChange={e => setForm(p => ({ ...p, remind_at: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Category</label><select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}><option value="">None</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Note</label><input placeholder="Optional note..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea rows={2} placeholder="Additional details..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
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


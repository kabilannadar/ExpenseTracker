import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

const ICONS = ['tag', 'utensils', 'home', 'shopping-bag', 'car', 'file-text', 'heart', 'fuel', 'pill', 'key', 'tv', 'coffee', 'music', 'book', 'gift', 'plane', 'dumbbell'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#ef4444', '#64748b', '#a855f7'];

const EMPTY = { name: '', color: '#6366f1', icon: 'tag' };

export default function Categories() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => categoriesApi.create(d),
    onSuccess: () => { qc.invalidateQueries(['categories']); toast.success('Category created!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['categories']); toast.success('Category updated!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['categories']); toast.success('Category deleted'); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (c) => { setForm({ name: c.name, color: c.color, icon: c.icon }); setModal(c); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal === 'create') createMut.mutate(form);
    else updateMut.mutate({ id: modal.id, data: form });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{categories.length} categories</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> New Category</button>
      </div>

      {isLoading ? (
        <div className="grid-3">{[...Array(6)].map((_, i) => <div key={i} className="card skeleton" style={{ height: 90 }} />)}</div>
      ) : (
        <div className="grid-3">
          {categories.map(c => (
            <div key={c.id} className="card cat-card">
              <div className="cat-color-bar" style={{ background: c.color }} />
              <div className="cat-content">
                <div className="cat-icon-wrap" style={{ background: c.color + '22' }}>
                  <Tag size={18} style={{ color: c.color }} />
                </div>
                <div className="cat-name">{c.name}</div>
                {c.is_default && <span className="badge badge-info" style={{ fontSize: 10 }}>Default</span>}
              </div>
              <div className="cat-actions">
                <button className="btn-icon" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                <button className="btn-icon btn-danger" onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMut.mutate(c.id); }}><Trash2 size={13} /></button>
              </div>

              <style>{`
                .cat-card { position: relative; overflow: hidden; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
                .cat-color-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
                .cat-content { display: flex; align-items: center; gap: 10px; }
                .cat-icon-wrap { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .cat-name { font-weight: 600; font-size: 14px; }
                .cat-actions { display: flex; gap: 6px; }
              `}</style>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="card empty-state" style={{ gridColumn: '1/-1' }}>
              <Tag size={40} />
              <div>No categories yet</div>
              <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add Category</button>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Category' : 'Edit Category'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input placeholder="e.g. Outside Food" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{
                      width: 32, height: 32, borderRadius: 8, background: c, border: 'none', padding: 0,
                      outline: form.color === c ? `3px solid white` : 'none',
                      boxShadow: form.color === c ? `0 0 0 5px ${c}55` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {modal === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

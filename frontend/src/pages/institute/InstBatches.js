import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { batchesAPI } from '../../api';
import { Modal, ConfirmModal, Spinner, EmptyState, StreamBadge, ClassBadge } from '../../components/UI';

const INIT = { name: '', classLevel: '8', board: 'CBSE', stream: 'Board', timing: '' };

export default function InstBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await batchesAPI.getAll(); setBatches(r.data.data); }
    catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const show11_12 = cls => cls === '11' || cls === '12';

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Batch name is required'); return; }
    setSaving(true);
    try {
      if (modal?.type === 'add') {
        await batchesAPI.create(form);
        toast.success('Batch created!');
      } else {
        await batchesAPI.update(modal.data.id, form);
        toast.success('Batch updated!');
      }
      setModal(null); await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await batchesAPI.delete(modal.data.id); toast.success('Batch deleted'); setModal(null); await load(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><h2>Batches</h2><p>Manage your class batches</p></div>
        <button className="btn btn-blue btn-sm" onClick={() => { setForm(INIT); setModal({ type: 'add' }); }}>＋ Add Batch</button>
      </div>
      <div className="page-content">
        <div className="panel">
          {batches.length === 0 ? <EmptyState icon="📁" message="No batches yet. Click + Add Batch to create one." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Batch Name</th><th>Class</th><th>Board</th><th>Stream</th><th>Timing</th><th>Students</th><th>Actions</th></tr></thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td><ClassBadge cls={b.class} /></td>
                      <td><span className="badge bp">{b.board}</span></td>
                      <td>{show11_12(b.class) && b.stream ? <StreamBadge stream={b.stream} /> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                      <td style={{ color: 'var(--text2)' }}>{b.timing || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{b.student_count || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-sm" onClick={() => { setForm({ name: b.name, classLevel: b.class, board: b.board, stream: b.stream || 'Board', timing: b.timing || '' }); setModal({ type: 'edit', data: b }); }}>Edit</button>
                          <button className="btn btn-sm btn-red" onClick={() => setModal({ type: 'confirmDelete', data: b })}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <Modal title={modal.type === 'add' ? 'Add New Batch' : 'Edit Batch'} onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-blue" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Batch'}</button></>}>
          <div className="form-group"><label>Batch Name *</label><input className="form-control" placeholder="e.g. Science Batch A" value={form.name} onChange={f('name')} /></div>
          <div className="form-row">
            <div className="form-group"><label>Class *</label>
              <select className="form-control" value={form.classLevel} onChange={e => setForm(p => ({ ...p, classLevel: e.target.value, stream: 'Board' }))}>
                {['8','9','10','11','12'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Board *</label>
              <select className="form-control" value={form.board} onChange={f('board')}><option>CBSE</option><option>State</option></select>
            </div>
          </div>
          {show11_12(form.classLevel) && (
            <div className="form-group"><label>Stream (Class 11 & 12 only)</label>
              <select className="form-control" value={form.stream} onChange={f('stream')}><option>NEET</option><option>JEE</option><option>Board</option><option>Both</option></select>
            </div>
          )}
          <div className="form-group"><label>Timing</label><input className="form-control" placeholder="e.g. 7:00 AM - 9:00 AM" value={form.timing} onChange={f('timing')} /></div>
        </Modal>
      )}

      {modal?.type === 'confirmDelete' && (
        <ConfirmModal title="Delete Batch" message={`Delete "${modal.data.name}"? Students in this batch will become unassigned.`} onConfirm={handleDelete} onClose={() => setModal(null)} danger />
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { studentsAPI, batchesAPI, messagesAPI } from '../../api';
import { Modal, ConfirmModal, Spinner, EmptyState, Avatar, StreamBadge, ClassBadge } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

const INIT = { name:'', classLevel:'8', board:'CBSE', stream:'Board', batchId:'', studentPhone:'', parentName:'', parentPhone:'', parentEmail:'' };

// ── Credential Box (same style as institute credentials) ──────
function CredBox({ loginId, password, mustChange }) {
  const [copied, setCopied] = useState('');
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(()=>{});
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };
  return (
    <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:11, padding:'14px 16px' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
        🔑 Student Login Credentials
      </div>
      {[['Student Login ID', loginId, 'id'], ['Password', password || 'Not Set', 'pw']].map(([label, val, key]) => (
        <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:12, color:'#1d4ed8', minWidth:130 }}>{label}</span>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:700, color:'#1e3a5f', letterSpacing:0.5 }}>{val}</code>
            <button onClick={() => copy(val, key)}
              style={{ padding:'3px 10px', fontSize:11, background:'#fff', border:'1px solid #bfdbfe', borderRadius:6, cursor:'pointer', color:'#1d4ed8', fontFamily:'inherit', fontWeight:600, minWidth:52 }}>
              {copied === key ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      ))}
      <button onClick={() => copy(`Student Login ID: ${loginId}\nPassword: ${password || 'Not Set'}`, 'both')}
        style={{ width: '100%', marginTop:10, padding:'8px 14px', fontSize:12, background:'#2563eb', border:'none', borderRadius:7, cursor:'pointer', color:'#fff', fontFamily:'inherit', fontWeight:600 }}>
        {copied === 'both' ? '✓ Copied Both!' : 'Copy Both'}
      </button>
      {!!mustChange && (
        <div style={{ marginTop:10, padding:'7px 11px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, fontSize:11, color:'#92400e' }}>
          ⚠ Student has not yet changed their default password.
        </div>
      )}
    </div>
  );
}

export default function InstStudents() {
  const location = useLocation();
  const [students, setStudents]   = useState([]);
  const [batches, setBatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterBatch, setFB]      = useState('');
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(INIT);
  const [saving, setSaving]       = useState(false);
  const [viewData, setViewData]   = useState(null);
  const [newCreds, setNewCreds]   = useState(null); // shown after add
  const [sendingCreds, setSC]     = useState(false);
  const [resettingPwd, setRP]     = useState(false);

  const [sendingMsg, setSendingMsg] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [promoClass, setPromoClass] = useState('');
  const [promoBatch, setPromoBatch] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([studentsAPI.getAll(), batchesAPI.getAll()]);
      setStudents(s.data.data); setBatches(b.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (location.state?.openAdd) {
      setForm({
        ...INIT,
        batchId: location.state.batchId || '',
        classLevel: location.state.classLevel || '8',
        board: location.state.board || 'CBSE',
        stream: location.state.stream || 'Board'
      });
      setModal({ type: 'add' });
      // Clear the state so it doesn't re-trigger on reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const mQ = !q || s.name.toLowerCase().includes(q) || s.parent_name?.toLowerCase().includes(q) || s.parent_phone?.includes(q) || s.student_login_id?.toLowerCase().includes(q);
    const mB = !filterBatch || String(s.batch_id) === filterBatch;
    return mQ && mB;
  });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const show11_12 = cls => cls === '11' || cls === '12';

  const openAdd  = () => { setForm(INIT); setModal({ type:'add' }); };
  const openEdit = (s) => {
    setForm({ name:s.name, classLevel:s.class, board:s.board, stream:s.stream||'Board', batchId:s.batch_id||'', studentPhone:s.student_phone||'', parentName:s.parent_name, parentPhone:s.parent_phone, parentEmail:s.parent_email||'' });
    setModal({ type:'edit', data:s });
  };
  const openView = async (s) => {
    try {
      const r = await studentsAPI.getOne(s.id);
      setViewData(r.data.data); setModal({ type:'view' });
    } catch { toast.error('Failed to load student'); }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.parentName.trim() || !form.parentPhone.trim()) { toast.error('Name, parent name and phone required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, stream: show11_12(form.classLevel) ? form.stream : '' };
      if (modal?.type === 'add') {
        const r = await studentsAPI.create(payload);
        // Show credentials popup after successful creation
        setNewCreds(r.data.data);
        setModal({ type:'credsPreview' });
        const sent = r.data?.data?.notification?.sent ?? 0;
        const failed = r.data?.data?.notification?.failed ?? 0;
        if (failed > 0) toast.success(`Student registered. Notification result: ${sent} sent, ${failed} failed`);
        else toast.success('Student registered and credentials sent to parent.');
      } else {
        await studentsAPI.update(modal.data.id, payload);
        toast.success('Student updated!');
        setModal(null);
      }
      await load();
    } catch(err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await studentsAPI.delete(modal.data.id);
      toast.success('Student deleted');
      setModal(null); await load(); setSelectedIds([]);
    } catch { toast.error('Failed to delete'); }
  };

  const handlePromote = async () => {
    if (!promoClass) { toast.error('Select target class'); return; }
    setBtnLoading(true);
    try {
      await studentsAPI.promote({ studentIds: selectedIds, targetClass: promoClass, targetBatchId: promoBatch || null });
      toast.success(`Promoted ${selectedIds.length} students to Class ${promoClass}`);
      setModal(null); setSelectedIds([]); await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to promote'); }
    finally { setBtnLoading(false); }
  };

  const handleResendCreds = async (studentId) => {
    setSC(true);
    try {
      const r = await studentsAPI.resendCredentials(studentId);
      const sent = r.data?.data?.sent ?? 0;
      const failed = r.data?.data?.failed ?? 0;
      if (failed > 0) toast.success(`Re-send attempted: ${sent} sent, ${failed} failed`);
      else toast.success('Credentials sent to parent.');
    } catch(err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSC(false); }
  };

  const handleResetPwd = async (studentId, name) => {
    setRP(true);
    try {
      const r = await studentsAPI.resetPassword(studentId);
      const sent = r.data?.data?.sent ?? 0;
      const failed = r.data?.data?.failed ?? 0;
      if (failed > 0) toast.success(`Password reset for ${name}. Notification: ${sent} sent, ${failed} failed`);
      else toast.success(`Password reset to default for ${name}`);
      const fresh = await studentsAPI.getOne(studentId);
      setViewData(fresh.data.data);
    } catch(err) { toast.error(err.response?.data?.message || 'Failed to reset'); }
    finally { setRP(false); }
  };

  const handleSendMessage = async (studentId, type, subject, message) => {
    setSendingMsg(true);
    try {
      await messagesAPI.sendIndividual(studentId, { type, subject, message });
      toast.success('Message sent to parent');
      setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) return <Spinner />;

  const studentForm = (
    <>
      <div className="section-label">Student Details</div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}><label>Full Name *</label><input className="form-control" value={form.name} onChange={f('name')} placeholder="Student full name" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Class *</label>
          <select className="form-control" value={form.classLevel} onChange={e => setForm(p => ({ ...p, classLevel:e.target.value, stream:'Board' }))}>
            {['8','9','10','11','12'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Board</label>
          <select className="form-control" value={form.board} onChange={f('board')}><option>CBSE</option><option>State</option></select>
        </div>
      </div>
      {show11_12(form.classLevel) && (
        <div className="form-group"><label>Stream (Class 11 & 12 only)</label>
          <select className="form-control" value={form.stream} onChange={f('stream')}><option>NEET</option><option>JEE</option><option>Board</option><option>Both</option></select>
        </div>
      )}
      <div className="form-row">
        <div className="form-group"><label>Batch</label>
          <select className="form-control" value={form.batchId} onChange={f('batchId')}>
            <option value="">-- No Batch --</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Student Phone</label><input className="form-control" placeholder="10-digit number" value={form.studentPhone} onChange={f('studentPhone')} /></div>
      </div>
      <div className="divider" />
      <div className="section-label">Parent / Guardian</div>
      <div className="form-row">
        <div className="form-group"><label>Parent Name *</label><input className="form-control" value={form.parentName} onChange={f('parentName')} /></div>
        <div className="form-group"><label>Phone *</label><input className="form-control" placeholder="10-digit number" value={form.parentPhone} onChange={f('parentPhone')} /></div>
      </div>
      <div className="form-group"><label>Parent Email</label><input className="form-control" type="email" placeholder="parent@email.com" value={form.parentEmail} onChange={f('parentEmail')} /></div>
      {modal?.type === 'add' && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, padding:'10px 13px', fontSize:12, color:'#15803d', marginTop:4 }}>
          ✨ A <strong>Student Login ID</strong> and <strong>default password (123456)</strong> will be auto-generated and sent to the parent's phone number.
        </div>
      )}
    </>
  );

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><h2>Students</h2><p>Manage enrolled students and parents</p></div>
        <div style={{ display:'flex', gap:10 }}>
          {selectedIds.length > 0 && (
            <button className="btn btn-navy btn-sm" onClick={() => { setPromoClass(''); setPromoBatch(''); setModal({ type:'promote' }); }}>
              🎓 Promote ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-blue btn-sm" onClick={openAdd}>＋ Add Student</button>
        </div>
      </div>
      <div className="page-content">

        <div className="search-row">
          <input className="search-input" placeholder="🔍  Search name, parent, login ID..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-control" style={{ width:190 }} value={filterBatch} onChange={e => setFB(e.target.value)}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        </div>

        <div className="panel">
          {filtered.length === 0 ? <EmptyState icon="👤" message="No students found" /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} 
                        onChange={e => setSelectedIds(e.target.checked ? filtered.map(s => s.id) : [])} />
                    </th>
                    <th>Student</th><th>Class</th><th>Board</th><th>Stream</th><th>Batch</th><th>Login ID</th><th>Parent</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} style={{ background: selectedIds.includes(s.id) ? 'var(--blue-bg)' : '' }}>
                      <td>
                        <input type="checkbox" checked={selectedIds.includes(s.id)} 
                          onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <Avatar name={s.name} size={34} />
                          <div>
                            <div style={{ fontWeight:600 }}>{s.name}</div>
                          </div>
                        </div>
                      </td>
                      <td><ClassBadge cls={s.class} /></td>
                      <td><span className="badge bp">{s.board}</span></td>
                      <td>{show11_12(s.class) && s.stream ? <StreamBadge stream={s.stream} /> : <span style={{ color:'var(--text3)' }}>—</span>}</td>
                      <td style={{ fontSize:12 }}>{s.batch_name || '—'}</td>
                      <td>
                        {s.student_login_id
                          ? <code style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, background:'var(--bg)', padding:'2px 7px', borderRadius:5 }}>{s.student_login_id}</code>
                          : <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>}
                      </td>
                      <td>
                        <div style={{ fontSize:12, fontWeight:500 }}>{s.parent_name}</div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>{s.parent_phone}</div>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          <button className="btn btn-sm btn-navy" onClick={() => setModal({ type: 'message', data: s })}>💬 Message</button>
                          <button className="btn btn-sm" onClick={() => openView(s)}>View</button>
                          <button className="btn btn-sm" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-sm btn-red" onClick={() => setModal({ type:'confirmDelete', data:s })}>Delete</button>
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
        <Modal title={modal.type === 'add' ? 'Add New Student' : 'Edit Student'} onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-blue" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal.type === 'add' ? 'Register & Generate Credentials' : 'Save Changes'}</button></>}>
          {studentForm}
        </Modal>
      )}

      {modal?.type === 'credsPreview' && newCreds && (
        <Modal title="Student Registered!" onClose={() => setModal(null)}
          footer={<button className="btn btn-blue" onClick={() => setModal(null)}>Done</button>}>
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <div style={{ width:52, height:52, background:'var(--green-bg)', border:'1px solid var(--green-b)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 10px' }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700 }}>Student credentials auto-generated</div>
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>
              Login details have been logged and can be shared with the parent.
            </div>
          </div>

          <CredBox loginId={newCreds.studentLoginId} password={newCreds.defaultPassword} mustChange={true} />

          <div style={{ marginTop:14, padding:'11px 14px', background:'var(--blue-bg)', border:'1px solid #bfdbfe', borderRadius:9, fontSize:12, color:'var(--blue-text)', lineHeight:1.6 }}>
            📱 Credentials notification was attempted for parent number <strong>{newCreds.parentPhone}</strong>.
            Delivery details are visible in the Messages page history.
          </div>
        </Modal>
      )}

      {modal?.type === 'view' && viewData && (
        <Modal title="Student Profile" onClose={() => setModal(null)} size={560}
          footer={<>
            <button className="btn" onClick={() => setModal(null)}>Close</button>
            <button className="btn btn-blue" onClick={() => openEdit(viewData)}>Edit Student</button>
          </>}>

          <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:16 }}>
            <Avatar name={viewData.name} size={48} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{viewData.name}</div>
              <div style={{ marginTop:5, display:'flex', gap:5, flexWrap:'wrap' }}>
                <ClassBadge cls={viewData.class} />
                {show11_12(viewData.class) && viewData.stream && <StreamBadge stream={viewData.stream} />}
                <span className="badge bp">{viewData.board}</span>
              </div>
            </div>
            {viewData.attendance?.total_days > 0 && (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color: Math.round((viewData.attendance.present||0)/viewData.attendance.total_days*100) >= 75 ? 'var(--green-text)' : 'var(--red-text)' }}>
                  {Math.round((viewData.attendance.present||0)/viewData.attendance.total_days*100)}%
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>Attendance</div>
              </div>
            )}
          </div>

          <div className="divider" />
          {[
            ['Batch',        viewData.batch_name     || '—'],
            ['Student Phone', viewData.student_phone || '—'],
            ['Present Days', viewData.attendance?.present || 0, 'green'],
            ['Absent Days',  viewData.attendance?.absent  || 0, 'red'],
            ['Late Days',    viewData.attendance?.late    || 0, 'amber'],
            ['Parent Name',  viewData.parent_name],
            ['Parent Phone', viewData.parent_phone],
            ['Parent Email', viewData.parent_email   || '—'],
          ].map(([k,v,color]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--text2)' }}>{k}</span>
              <span style={{ fontWeight:500, color: color==='green'?'var(--green-text)':color==='red'?'var(--red-text)':color==='amber'?'var(--amber-text)':'var(--text)' }}>{v}</span>
            </div>
          ))}

          <div style={{ marginTop:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:10 }}>
              Login Credentials
            </div>
            {viewData.student_login_id ? (
              <>
                <CredBox loginId={viewData.student_login_id} password={viewData.student_password} mustChange={viewData.must_change_pass} />

                <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                  <button className="btn btn-sm btn-blue" disabled={sendingCreds}
                    onClick={() => handleResendCreds(viewData.id)}>
                    {sendingCreds ? 'Sending…' : '📱 Re-send to Parent'}
                  </button>
                  <button className="btn btn-sm btn-amber" disabled={resettingPwd}
                    onClick={() => handleResetPwd(viewData.id, viewData.name)}>
                    {resettingPwd ? 'Resetting…' : '🔄 Reset to Default (123456)'}
                  </button>
                </div>
                <div style={{ marginTop:8, fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>
                  Resend sends the Login ID and default password to the parent's registered phone number.<br />
                  Reset changes the password back to <code style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>123456</code> and requires the student to change it again on next login.
                </div>
              </>
            ) : (
              <div style={{ padding:'12px', background:'var(--bg2)', borderRadius:9, fontSize:12, color:'var(--text3)' }}>
                No login credentials generated yet.
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal?.type === 'message' && (
        <MessageModal
          student={modal.data}
          onClose={() => setModal(null)}
          onSend={(type, sub, msg) => handleSendMessage(modal.data.id, type, sub, msg)}
          sending={sendingMsg}
          instName={user?.name || 'Institute'}
        />
      )}

      {modal?.type === 'confirmDelete' && (
        <ConfirmModal title="Delete Student" message={`Delete "${modal.data.name}"? This will permanently remove all their attendance records and test results.`}
          onConfirm={handleDelete} onClose={() => setModal(null)} danger />
      )}

      {modal?.type === 'promote' && (
        <Modal title="Promote Students — Next Academic Year" onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-navy" onClick={handlePromote} disabled={btnLoading}>{btnLoading ? 'Promoting…' : `Promote ${selectedIds.length} Students`}</button></>}
        >
          <div style={{ marginBottom: 15, padding: 12, background: 'var(--blue-bg)', borderRadius: 10, fontSize: 13, color: 'var(--blue-text)', border: '1px solid var(--blue-border)' }}>
            You are promoting <b>{selectedIds.length} students</b>. This will update their class and move them to the selected batch.
          </div>
          
          <div className="form-group">
            <label>Target Class (Promote To) *</label>
            <select className="form-control" value={promoClass} onChange={e => setPromoClass(e.target.value)}>
              <option value="">Select Next Class</option>
              {['8','9','10','11','12','Alumni'].map(c => <option key={c} value={c}>{c === 'Alumni' ? 'Graduate / Alumni' : `Class ${c}`}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Target Batch (Optional)</label>
            <select className="form-control" value={promoBatch} onChange={e => setPromoBatch(e.target.value)}>
              <option value="">No Batch / Move to General</option>
              {batches.filter(b => b.class === promoClass || !promoClass).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.class})</option>
              ))}
            </select>
          </div>
          
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
            * Note: This action will not affect past attendance or test results. It only updates the student's current grade.
          </p>
        </Modal>
      )}
    </div>
  );
}

// ── INTERNAL COMPONENTS ───────────────────────────────────────

function MessageModal({ student, onClose, onSend, sending, instName }) {
  const [type, setType] = useState('custom');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [sub, setSub] = useState('');
  const [msg, setMsg] = useState('');

  const getPreview = (sName) => {
    const d = date || '[Date]', t = time || '[Time]', s = sub || (type === 'test' ? 'Unit Test' : type === 'holiday' ? '[Holiday]' : '');
    const templates = {
      test: `Dear Parent,\n\nThis is to inform you that a *${s}* is scheduled for your ward *${sName}* on *${d}* at *${t}*.\n\nKindly ensure they are well prepared.\n\nRegards,\n${instName}`,
      ptm: `Dear Parent,\n\nYou are invited to attend the *Parent-Teacher Meeting (PTM)* regarding *${sName}* on *${d}* at *${t}*.\n\nVenue: ${instName}\n\nYour presence is important.\n\nRegards,\n${instName}`,
      holiday: `Dear Parent,\n\nPlease note the institute will remain *closed on ${d}* for *${sName}* and all students on account of *${s}*.\n\nClasses will resume as normal thereafter.\n\nRegards,\n${instName}`,
      custom: msg ? msg.replace(/{name}/g, sName) : 'Type your message below...',
    };
    return templates[type];
  };

  const handleSend = () => {
    const finalSub = sub || (type === 'test' ? 'Upcoming Test' : type === 'ptm' ? 'PTM / Meeting' : type === 'holiday' ? 'Holiday Notice' : 'Custom Announcement');
    onSend(type, finalSub, getPreview('{name}'));
  };

  return (
    <Modal title={`Message to ${student.name}'s Parent`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-navy" onClick={handleSend} disabled={sending}>{sending ? 'Sending…' : '📤 Send SMS / WhatsApp'}</button></>}>
      <div style={{ marginBottom: 15 }}>
        <div className="section-label">Select Type</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 5 }}>
          {['custom', 'test', 'ptm', 'holiday'].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: type === t ? 'var(--blue-bg)' : 'var(--bg)', border: `1.5px solid ${type === t ? 'var(--blue)' : 'var(--border)'}`, color: type === t ? 'var(--blue-text)' : 'var(--text2)', transition: 'all 0.15s' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {type !== 'custom' ? (
        <div className="form-row">
          <div className="form-group"><label>Date</label><input className="form-control" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group"><label>Time</label><input className="form-control" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>
      ) : (
        <div className="form-group"><label>Custom Message</label>
          <textarea className="form-control" rows={3} placeholder="Use {name} for student name..." value={msg} onChange={e => setMsg(e.target.value)} />
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 15px', marginTop: 15 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
        <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {getPreview(student.name)}
        </div>
      </div>
    </Modal>
  );
}

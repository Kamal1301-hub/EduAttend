import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { institutesAPI } from '../../api';

// ─── HELPERS ──────────────────────────────────────────────────
function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).join('').slice(0, 2);
}
function isExpired(date) { return new Date(date) < new Date(); }
function copyText(text, btn) {
  navigator.clipboard.writeText(text).catch(() => {});
  const orig = btn.textContent;
  btn.textContent = '✓ Copied';
  setTimeout(() => { btn.textContent = orig; }, 1600);
}

// ─── BADGE ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    Active:    { bg:'#f0fdf4', border:'#bbf7d0', color:'#15803d', dot:'#16a34a' },
    Suspended: { bg:'#fef2f2', border:'#fecaca', color:'#b91c1c', dot:'#dc2626' },
    Expired:   { bg:'#fffbeb', border:'#fde68a', color:'#b45309', dot:'#d97706' },
  };
  const c = cfg[status] || cfg.Expired;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:20, fontSize:11, fontWeight:600, color:c.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot, display:'inline-block' }} />
      {status}
    </span>
  );
}

function PlanBadge({ plan }) {
  const cfg = {
    Premium:  { bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8' },
    Standard: { bg:'#f0fdfa', border:'#99f6e4', color:'#0f766e' },
    Basic:    { bg:'#faf5ff', border:'#e9d5ff', color:'#7e22ce' },
  };
  const c = cfg[plan] || cfg.Basic;
  return (
    <span style={{ display:'inline-flex', padding:'3px 10px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:20, fontSize:11, fontWeight:600, color:c.color }}>
      {plan}
    </span>
  );
}

// ─── MODAL ────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, footer, size = 540 }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(10,22,44,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#fff', borderRadius:16, width:size, maxWidth:'100%', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'1px solid #e2e8f0' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#0f172a', letterSpacing:-0.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:22, lineHeight:1, padding:'0 0 0 16px' }}>×</button>
        </div>
        <div style={{ padding:'20px 24px' }}>{children}</div>
        {footer && <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10, justifyContent:'flex-end', position:'sticky', bottom:0, background:'#fff' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────
function Btn({ children, onClick, variant='default', size='md', disabled, style: ex }) {
  const [hover, setHover] = useState(false);
  const v = {
    default: { bg: hover?'#f1f5f9':'#fff',   border:'#cbd5e1', color:'#374151' },
    primary: { bg: hover?'#1d4ed8':'#2563eb', border:'#2563eb', color:'#fff'    },
    danger:  { bg: hover?'#fee2e2':'#fef2f2', border:'#fecaca', color:'#b91c1c' },
    amber:   { bg: hover?'#fef3c7':'#fffbeb', border:'#fde68a', color:'#b45309' },
    green:   { bg: hover?'#dcfce7':'#f0fdf4', border:'#bbf7d0', color:'#15803d' },
    ghost:   { bg:'transparent', border:'transparent', color: hover?'#0f172a':'#64748b' },
  }[variant] || { bg:'#fff', border:'#cbd5e1', color:'#374151' };
  const pad = size==='sm'?'5px 12px':size==='lg'?'11px 22px':'8px 16px';
  const fs  = size==='sm'?12:size==='lg'?14:13;
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:pad, background:v.bg, border:`1.5px solid ${v.border}`, borderRadius:9, color:v.color, cursor:disabled?'not-allowed':'pointer', fontSize:fs, fontWeight:600, fontFamily:'inherit', transition:'all 0.15s', opacity:disabled?0.55:1, whiteSpace:'nowrap', ...ex }}>
      {children}
    </button>
  );
}

// ─── INPUT ────────────────────────────────────────────────────
const IS = { width:'100%', padding:'9px 12px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:9, color:'#0f172a', fontSize:13, fontFamily:'inherit', outline:'none', transition:'all 0.2s', boxSizing:'border-box' };
function Input({ value, onChange, placeholder, type='text', readOnly, autoFocus }) {
  const [f, setF] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly} autoFocus={autoFocus}
      style={{ ...IS, ...(f&&!readOnly?{borderColor:'#2563eb',background:'#fff',boxShadow:'0 0 0 3px rgba(37,99,235,0.1)'}:{}), ...(readOnly?{background:'#f1f5f9',color:'#94a3b8',cursor:'default'}:{}) }}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)} />
  );
}
function Sel({ value, onChange, children }) {
  const [f, setF] = useState(false);
  return (
    <select value={value} onChange={onChange} style={{ ...IS, ...(f?{borderColor:'#2563eb',background:'#fff',boxShadow:'0 0 0 3px rgba(37,99,235,0.1)'}:{}), cursor:'pointer' }}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}>
      {children}
    </select>
  );
}

// ─── FIELD ────────────────────────────────────────────────────
function Field({ label, required, children, error }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>
        {label}{required&&<span style={{ color:'#ef4444', marginLeft:3 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>⚠ {error}</div>}
    </div>
  );
}

function Row2({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{children}</div>; }
function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'18px 0 14px' }}>
      <div style={{ flex:1, height:1, background:'#f1f5f9' }} />
      <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      <div style={{ flex:1, height:1, background:'#f1f5f9' }} />
    </div>
  );
}

// ─── CRED BOX ─────────────────────────────────────────────────
function CredBox({ loginId, password }) {
  return (
    <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:0.8, marginBottom:14 }}>🔑 Login Credentials — Keep Confidential</div>
      {[['Login ID', loginId], ['Password', password]].map(([label, val]) => (
        <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:12, color:'#1d4ed8', minWidth:80 }}>{label}</span>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:700, color:'#1e3a5f', letterSpacing:0.5 }}>{val}</span>
            <button onClick={e => copyText(val, e.currentTarget)}
              style={{ padding:'3px 10px', fontSize:11, background:'#fff', border:'1px solid #bfdbfe', borderRadius:6, cursor:'pointer', color:'#1d4ed8', fontFamily:'inherit', fontWeight:600 }}>
              Copy
            </button>
          </div>
        </div>
      ))}
      <button onClick={e => copyText(`Login ID: ${loginId}\nPassword: ${password}`, e.currentTarget)}
        style={{ width: '100%', marginTop:10, padding:'8px 14px', fontSize:12, background:'#2563eb', border:'none', borderRadius:7, cursor:'pointer', color:'#fff', fontFamily:'inherit', fontWeight:600 }}>
        Copy Both
      </button>
    </div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────
function Avatar({ name, size=36 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:9, background:'#eff6ff', border:'1.5px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, color:'#1d4ed8', flexShrink:0 }}>
      {initials(name)}
    </div>
  );
}

// ─── FORM BLANK ───────────────────────────────────────────────
const BLANK = { name:'', city:'', state:'', email:'', phone:'', contactPerson:'', plan:'Standard', durationMonths:'12', status:'Active', expiryDate:'' };

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AdminInstitutes() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [fStatus, setFStatus]       = useState('');
  const [fPlan, setFPlan]           = useState('');
  const [sortBy, setSortBy]         = useState('newest');

  // modals
  const [addOpen, setAddOpen]       = useState(false);
  const [editData, setEditData]     = useState(null);
  const [viewData, setViewData]     = useState(null);
  const [credsData, setCredsData]   = useState(null);
  const [delData, setDelData]       = useState(null);
  const [newCreds, setNewCreds]     = useState(null);
  const [pwdResult, setPwdResult]   = useState(null);

  const [form, setForm]             = useState(BLANK);
  const [errs, setErrs]             = useState({});
  const [saving, setSaving]         = useState(false);

  // ── LOAD ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const r = await institutesAPI.getAll();
      setInstitutes(r.data.data || []);
    } catch { toast.error('Failed to load institutes'); }
    finally   { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // ── FILTER & SORT ─────────────────────────────────────────────
  const filtered = institutes
    .filter(i => {
      const q = search.toLowerCase();
      if (q && ![i.name, i.city, i.login_id, i.contact_person, i.email, i.phone].some(v => v?.toLowerCase().includes(q))) return false;
      if (fStatus && i.status !== fStatus) return false;
      if (fPlan   && i.plan   !== fPlan)   return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest')   return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'name')     return a.name.localeCompare(b.name);
      if (sortBy === 'students') return (b.students_count||0) - (a.students_count||0);
      return 0;
    });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── VALIDATE ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name = 'Required';
    if (!form.contactPerson.trim())  e.contactPerson = 'Required';
    if (!form.phone.trim())          e.phone = 'Required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrs(e);
    return !Object.keys(e).length;
  };

  // ── ADD ───────────────────────────────────────────────────────
  const openAdd = () => { setForm(BLANK); setErrs({}); setAddOpen(true); };
  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await institutesAPI.create(form);
      setAddOpen(false);
      setNewCreds({ ...res.data.data, phone: form.phone });
      await load();
      toast.success('Institute registered!');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setSaving(false); }
  };

  // ── EDIT ──────────────────────────────────────────────────────
  const openEdit = inst => {
    setForm({ name:inst.name||'', city:inst.city||'', state:inst.state||'', email:inst.email||'', phone:inst.phone||'', contactPerson:inst.contact_person||'', plan:inst.plan||'Standard', status:inst.status||'Active', expiryDate:inst.expiry_date||'', durationMonths:'12' });
    setErrs({});
    setEditData(inst);
  };
  const handleEdit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await institutesAPI.update(editData.id, form);
      setEditData(null);
      await load();
      toast.success('Institute updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  // ── DELETE ────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await institutesAPI.delete(delData.id);
      setDelData(null);
      await load();
      toast.success('Institute deleted');
    } catch { toast.error('Delete failed'); }
  };

  // ── STATUS TOGGLE ─────────────────────────────────────────────
  const handleToggle = async (inst, e) => {
    e.stopPropagation();
    try {
      const r = await institutesAPI.toggleStatus(inst.id);
      await load();
      toast.success(`${inst.name} is now ${r.data.newStatus}`);
    } catch { toast.error('Status update failed'); }
  };

  // ── RESET PASSWORD ────────────────────────────────────────────
  const handleResetPwd = async (inst) => {
    try {
      const r = await institutesAPI.resetPassword(inst.id);
      setCredsData(null);
      setPwdResult({ name:inst.name, loginId:inst.login_id, password:r.data.newPassword, phone:inst.phone });
      toast.success('Password reset!');
    } catch { toast.error('Password reset failed'); }
  };

  // ── STATS ─────────────────────────────────────────────────────
  const stats = {
    total:     institutes.length,
    active:    institutes.filter(i => i.status === 'Active').length,
    suspended: institutes.filter(i => i.status === 'Suspended').length,
    expired:   institutes.filter(i => isExpired(i.expiry_date)).length,
    students:  institutes.reduce((a, b) => a + (b.students_count||0), 0),
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ padding:'14px 24px', background:'#fff', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:'#0f172a', letterSpacing:-0.4 }}>Institutes</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Manage all registered institutes on the EduAttend platform</div>
        </div>
        <Btn variant="primary" onClick={openAdd}>＋ Register Institute</Btn>
      </div>

      {/* SCROLLABLE BODY */}
      <div style={{ flex:1, overflowY:'auto', background:'#f8fafc' }}>
        <div style={{ padding:'20px 24px' }}>

          {/* STATS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Total Institutes', value:stats.total,    color:'#0f172a' },
              { label:'Active',           value:stats.active,   color:'#16a34a' },
              { label:'Suspended',        value:stats.suspended, color:'#dc2626' },
              { label:'Expired',          value:stats.expired,   color:'#d97706' },
              { label:'Total Students',   value:stats.students.toLocaleString(), color:'#2563eb' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:24, fontWeight:700, color:s.color, letterSpacing:-1 }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4, fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* EXPIRY ALERT */}
          {stats.expired > 0 && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <span style={{ fontSize:20 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#b45309' }}>{stats.expired} institute{stats.expired>1?'s':''} with expired subscription</div>
                <div style={{ fontSize:12, color:'#d97706', marginTop:2 }}>Review and renew their plans to restore access.</div>
              </div>
              <Btn variant="amber" size="sm" onClick={() => { setFStatus('Expired'); }}>View Expired →</Btn>
            </div>
          )}

          {/* FILTERS */}
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:220 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:14, pointerEvents:'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, city, login ID, phone…"
                style={{ width:'100%', padding:'9px 12px 9px 36px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:9, color:'#0f172a', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>
            {[
              { val:fStatus, set:setFStatus, opts:['','Active','Suspended','Expired'],         placeholder:'All Status'  },
              { val:fPlan,   set:setFPlan,   opts:['','Basic','Standard','Premium'],            placeholder:'All Plans'   },
              { val:sortBy,  set:setSortBy,  opts:['newest','oldest','name','students'],        labels:['Newest First','Oldest First','Name A–Z','Most Students'], placeholder:'Sort' },
            ].map(({ val, set, opts, labels, placeholder }) => (
              <select key={placeholder} value={val} onChange={e => set(e.target.value)}
                style={{ padding:'9px 12px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:9, color:'#374151', fontFamily:'inherit', fontSize:13, outline:'none', cursor:'pointer', minWidth:140 }}>
                {opts.map((o, i) => <option key={o} value={o}>{labels ? labels[i] : o || placeholder}</option>)}
              </select>
            ))}
            {(search || fStatus || fPlan) && (
              <Btn variant="ghost" size="sm" onClick={() => { setSearch(''); setFStatus(''); setFPlan(''); }}>✕ Clear</Btn>
            )}
          </div>

          {/* COUNT */}
          {!loading && (
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12, fontWeight:500 }}>
              Showing {filtered.length} of {institutes.length} institute{institutes.length!==1?'s':''}
              {(search||fStatus||fPlan) && <span style={{ color:'#2563eb' }}> (filtered)</span>}
            </div>
          )}

          {/* TABLE */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            {loading ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }} />
                <div style={{ fontSize:13, color:'#94a3b8' }}>Loading institutes…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:'60px 20px', textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>{search ? '🔍' : '🏫'}</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#334155', marginBottom:6 }}>{search ? `No results for "${search}"` : 'No institutes yet'}</div>
                <div style={{ fontSize:13, color:'#94a3b8' }}>{search ? 'Try a different search term' : 'Register your first institute using the button above'}</div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:960 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Institute','Contact','Plan','Status','Login ID','Joined','Expiry','Students','Actions'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'10px 14px', color:'#94a3b8', fontWeight:600, fontSize:11, borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inst, idx) => {
                      const exp = isExpired(inst.expiry_date);
                      return (
                        <tr key={inst.id} onClick={() => setViewData(inst)}
                          style={{ borderBottom: idx < filtered.length-1 ? '1px solid #f8fafc' : 'none', cursor:'pointer', transition:'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#fafbfd'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                          <td style={{ padding:'12px 14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <Avatar name={inst.name} size={36} />
                              <div>
                                <div style={{ fontWeight:600, color:'#0f172a' }}>{inst.name}</div>
                                <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{inst.code} · {inst.city}{inst.state ? `, ${inst.state}` : ''}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding:'12px 14px' }}>
                            <div style={{ fontSize:13 }}>{inst.contact_person || '—'}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{inst.phone}</div>
                          </td>

                          <td style={{ padding:'12px 14px' }}><PlanBadge plan={inst.plan} /></td>
                          <td style={{ padding:'12px 14px' }}><StatusBadge status={inst.status} /></td>

                          <td style={{ padding:'12px 14px' }}>
                            <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, background:'#f1f5f9', padding:'3px 8px', borderRadius:6, color:'#374151' }}>
                              {inst.login_id}
                            </code>
                          </td>

                          <td style={{ padding:'12px 14px', fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>{inst.join_date}</td>
                          <td style={{ padding:'12px 14px', fontSize:12, color: exp?'#dc2626':'#94a3b8', fontWeight: exp?600:400, whiteSpace:'nowrap' }}>
                            {inst.expiry_date}{exp && ' ⚠'}
                          </td>
                          <td style={{ padding:'12px 14px', fontWeight:600, color:'#0f172a' }}>{inst.students_count || 0}</td>

                          <td style={{ padding:'12px 14px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                              <Btn size="sm" onClick={() => setViewData(inst)}>View</Btn>
                              <Btn size="sm" onClick={() => openEdit(inst)}>Edit</Btn>
                              <Btn size="sm" onClick={() => setCredsData(inst)}>🔑</Btn>
                              <Btn size="sm" variant={inst.status==='Active'?'amber':'green'} onClick={e => handleToggle(inst, e)}>
                                {inst.status==='Active' ? 'Suspend' : 'Activate'}
                              </Btn>
                              <Btn size="sm" variant="danger" onClick={e => { e.stopPropagation(); setDelData(inst); }}>Delete</Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ADD MODAL ══════════════════════════════════════════════ */}
      {addOpen && (
        <Modal title="Register New Institute" subtitle="Fill in the details. Login credentials will be auto-generated." onClose={() => setAddOpen(false)} size={580}
          footer={<><Btn onClick={() => setAddOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? 'Registering…' : 'Register & Generate Credentials'}</Btn></>}>
          <Divider label="Institute Information" />
          <Field label="Institute Name" required error={errs.name}><Input value={form.name} onChange={f('name')} placeholder="e.g. Bright Future Academy" autoFocus /></Field>
          <Row2>
            <Field label="City"><Input value={form.city} onChange={f('city')} placeholder="City" /></Field>
            <Field label="State"><Input value={form.state} onChange={f('state')} placeholder="State" /></Field>
          </Row2>
          <Row2>
            <Field label="Contact Person" required error={errs.contactPerson}><Input value={form.contactPerson} onChange={f('contactPerson')} placeholder="Principal / Admin" /></Field>
            <Field label="Phone Number" required error={errs.phone}><Input value={form.phone} onChange={f('phone')} placeholder="10-digit number" /></Field>
          </Row2>
          <Field label="Email Address" error={errs.email}><Input type="email" value={form.email} onChange={f('email')} placeholder="official@institute.com" /></Field>
          <Divider label="Subscription" />
          <Row2>
            <Field label="Plan"><Sel value={form.plan} onChange={f('plan')}><option>Basic</option><option>Standard</option><option>Premium</option></Sel></Field>
            <Field label="Duration"><Sel value={form.durationMonths} onChange={f('durationMonths')}><option value="1">1 Month</option><option value="3">3 Months</option><option value="6">6 Months</option><option value="12">1 Year</option><option value="24">2 Years</option></Sel></Field>
          </Row2>
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'11px 14px', display:'flex', gap:10, alignItems:'center', marginTop:4 }}>
            <span style={{ fontSize:18 }}>✨</span>
            <div style={{ fontSize:12, color:'#1d4ed8' }}>A unique <strong>Login ID</strong> and <strong>Password</strong> will be auto-generated and shown after registration.</div>
          </div>
        </Modal>
      )}

      {/* ══ CREDS PREVIEW (after add) ═══════════════════════════════ */}
      {newCreds && (
        <Modal title="Institute Registered!" subtitle="Share these credentials with the institute admin." onClose={() => setNewCreds(null)} size={480}
          footer={<Btn variant="primary" onClick={() => setNewCreds(null)}>Done</Btn>}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ width:56, height:56, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 12px' }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700 }}>{newCreds.name}</div>
            <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>has been successfully registered on EduAttend</div>
          </div>
          <CredBox loginId={newCreds.loginId} password={newCreds.password} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Btn variant="primary" onClick={() => alert(`Credentials sent via SMS to ${newCreds.phone}`)}>📱 Send Credentials via SMS</Btn>
          </div>
          <div style={{ marginTop:16, fontSize:12, color:'#94a3b8', textAlign:'center' }}>The institute can log in at the EduAttend Institute Portal using these credentials.</div>
        </Modal>
      )}

      {/* ══ EDIT MODAL ═════════════════════════════════════════════ */}
      {editData && (
        <Modal title="Edit Institute" subtitle={`Editing: ${editData.name}`} onClose={() => setEditData(null)} size={580}
          footer={<><Btn onClick={() => setEditData(null)}>Cancel</Btn><Btn variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Btn></>}>
          <Divider label="Institute Information" />
          <Field label="Institute Name" required error={errs.name}><Input value={form.name} onChange={f('name')} autoFocus /></Field>
          <Row2>
            <Field label="City"><Input value={form.city} onChange={f('city')} /></Field>
            <Field label="State"><Input value={form.state} onChange={f('state')} /></Field>
          </Row2>
          <Row2>
            <Field label="Contact Person" required error={errs.contactPerson}><Input value={form.contactPerson} onChange={f('contactPerson')} /></Field>
            <Field label="Phone" required error={errs.phone}><Input value={form.phone} onChange={f('phone')} /></Field>
          </Row2>
          <Field label="Email" error={errs.email}><Input type="email" value={form.email} onChange={f('email')} /></Field>
          <Divider label="Subscription & Access" />
          <Row2>
            <Field label="Plan"><Sel value={form.plan} onChange={f('plan')}><option>Basic</option><option>Standard</option><option>Premium</option></Sel></Field>
            <Field label="Status"><Sel value={form.status} onChange={f('status')}><option>Active</option><option>Suspended</option><option>Expired</option></Sel></Field>
          </Row2>
          <Field label="Expiry Date"><Input type="date" value={form.expiryDate} onChange={f('expiryDate')} /></Field>
          <Divider label="Credentials (read-only)" />
          <Field label="Login ID" hint="Login ID cannot be changed after registration"><Input value={editData.login_id} readOnly /></Field>
        </Modal>
      )}

      {/* ══ VIEW MODAL ═════════════════════════════════════════════ */}
      {viewData && (
        <Modal title="Institute Profile" onClose={() => setViewData(null)} size={520}
          footer={<>
            <Btn onClick={() => setViewData(null)}>Close</Btn>
            <Btn variant="amber" onClick={() => { setViewData(null); setCredsData(viewData); }}>🔑 Credentials</Btn>
            <Btn variant="primary" onClick={() => { setViewData(null); openEdit(viewData); }}>Edit Institute</Btn>
          </>}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <Avatar name={viewData.name} size={52} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>{viewData.name}</div>
              <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}><PlanBadge plan={viewData.plan} /><StatusBadge status={viewData.status} /></div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:26, fontWeight:700, color:'#2563eb' }}>{viewData.students_count || 0}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Students</div>
            </div>
          </div>
          {[
            ['Institute Code', viewData.code, true],
            ['City',           viewData.city],
            ['State',          viewData.state],
            ['Contact Person', viewData.contact_person],
            ['Phone',          viewData.phone],
            ['Email',          viewData.email],
            ['Join Date',      viewData.join_date],
            ['Expiry Date',    viewData.expiry_date, false, isExpired(viewData.expiry_date)],
          ].map(([k, v, mono, warn]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
              <span style={{ color:'#94a3b8', fontWeight:500 }}>{k}</span>
              <span style={{ fontWeight:600, color: warn?'#dc2626':'#0f172a', fontFamily:mono?'JetBrains Mono, monospace':'inherit', fontSize:mono?12:13 }}>
                {v || '—'}{warn && ' ⚠'}
              </span>
            </div>
          ))}
          <div style={{ marginTop:16, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Login ID</div>
            <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:15, fontWeight:700, color:'#1d4ed8' }}>{viewData.login_id}</code>
          </div>
        </Modal>
      )}

      {/* ══ CREDENTIALS MODAL ══════════════════════════════════════ */}
      {credsData && (
        <Modal title="Login Credentials" subtitle={credsData.name} onClose={() => setCredsData(null)} size={480}
          footer={<Btn onClick={() => setCredsData(null)}>Close</Btn>}>
          <CredBox loginId={credsData.login_id} password="••••••••" />
          <div style={{ marginTop:18, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Reset Password</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:14, lineHeight:1.6 }}>
              Generate a new random password. Share it immediately with the institute admin after resetting.
            </div>
            <Btn variant="amber" onClick={() => handleResetPwd(credsData)}>🔄 Generate New Password</Btn>
          </div>
        </Modal>
      )}

      {/* ══ PASSWORD RESULT ════════════════════════════════════════ */}
      {pwdResult && (
        <Modal title="Password Reset Successfully" subtitle={pwdResult.name} onClose={() => setPwdResult(null)} size={480}
          footer={<Btn variant="primary" onClick={() => setPwdResult(null)}>Done</Btn>}>
          <CredBox loginId={pwdResult.loginId} password={pwdResult.password} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Btn variant="amber" onClick={() => alert(`New password sent via SMS to ${pwdResult.phone}`)}>📱 Send New Password via SMS</Btn>
          </div>
          <div style={{ marginTop:16, fontSize:12, color:'#94a3b8', textAlign:'center' }}>Share these new credentials with the institute admin immediately.</div>
        </Modal>
      )}

      {/* ══ DELETE CONFIRM ═════════════════════════════════════════ */}
      {delData && (
        <Modal title="Delete Institute" onClose={() => setDelData(null)} size={420}
          footer={<><Btn onClick={() => setDelData(null)}>Cancel</Btn><Btn variant="danger" onClick={handleDelete}>Yes, Delete Permanently</Btn></>}>
          <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>
            Are you sure you want to permanently delete <strong style={{ color:'#0f172a' }}>{delData.name}</strong>?
            <br /><br />
            This will remove all their batches, students, and attendance records. <strong style={{ color:'#dc2626' }}>This action cannot be undone.</strong>
          </p>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import React, { useState } from 'react';
import { studentsAPI, testsAPI } from '../../api';
import { Avatar, StreamBadge, ClassBadge, ProgressBar, Modal } from '../../components/UI';
import toast from 'react-hot-toast';

// ── Credential Box ──────
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

export default function InstSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const openViewDetails = async (studentId) => {
    setViewLoading(true);
    try {
      const res = await testsAPI.studentPortal(studentId);
      const portalData = res.data.data;
      if (portalData && Array.isArray(portalData.results)) {
        portalData.results = portalData.results.map(r => {
          if (r.components && typeof r.components === 'string') {
            try {
              r.components = JSON.parse(r.components);
              if (typeof r.components === 'string') r.components = JSON.parse(r.components);
            } catch (e) { r.components = []; }
          }
          if (r.component_scores && typeof r.component_scores === 'string') {
            try {
              r.component_scores = JSON.parse(r.component_scores);
              if (typeof r.component_scores === 'string') r.component_scores = JSON.parse(r.component_scores);
            } catch (e) { r.component_scores = {}; }
          }
          return r;
        });
      }
      setViewData(portalData);
    } catch {
      toast.error('Failed to load student details');
    } finally {
      setViewLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const r = await studentsAPI.getAll({ search: q });
      const full = await Promise.all(r.data.data.map(s => studentsAPI.getOne(s.id).then(res => res.data.data)));
      setResults(full); setSearched(true);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const show11_12 = cls => cls === '11' || cls === '12';

  return (
    <div className="fade-in">
      <div className="topbar"><div><h2>Search Student</h2><p>Find student details</p></div></div>
      <div className="page-content">
        <div className="panel" style={{ padding: '15px 16px', marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
            Search by name or parent details
          </label>
          <input className="search-input" style={{ width: '100%', padding: '11px 14px' }}
            placeholder="🔍  Type at least 2 characters..." value={query} onChange={handleSearch} autoFocus />
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Searching…</div>}

        {searched && results.length === 0 && !loading && (
          <div className="panel" style={{ padding: 50, textAlign: 'center', color: 'var(--text3)' }}>No students found for "{query}"</div>
        )}

        {results.map(s => {
          const att = s.attendance || {};
          const pct = att.total_days > 0 ? Math.round((att.present || 0) / att.total_days * 100) : null;
          return (
            <div key={s.id} className="panel" style={{ marginBottom: 12 }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                  <Avatar name={s.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <ClassBadge cls={s.class} />
                      {show11_12(s.class) && s.stream && <StreamBadge stream={s.stream} />}
                      <span className="badge bp">{s.board}</span>
                    </div>
                  </div>
                  {pct !== null && (
                    <div style={{ textAlign: 'center', minWidth: 56 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: pct >= 75 ? 'var(--green-text)' : 'var(--red-text)' }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Attendance</div>
                    </div>
                  )}
                </div>

                {pct !== null && (
                  <div style={{ marginBottom: 14 }}>
                    <ProgressBar value={pct} color={pct >= 75 ? 'var(--green)' : 'var(--red)'} />
                  </div>
                )}

                <div className="divider" style={{ margin: '8px 0 12px' }} />

                <div className="form-row3" style={{ fontSize: 12 }}>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Batch</div><div>{s.batch_name || '—'}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Present Days</div><div style={{ fontWeight: 700, color: 'var(--green-text)' }}>{att.present || 0}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Parent</div><div style={{ fontWeight: 500 }}>{s.parent_name}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Phone</div><div>{s.parent_phone}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Absent Days</div><div style={{ fontWeight: 700, color: 'var(--red-text)' }}>{att.absent || 0}</div></div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {(att.absent > 0) && (
                    <button className="btn btn-blue btn-sm"
                      onClick={() => alert(`Notification sent to ${s.parent_name} (${s.parent_phone})\n\nDear ${s.parent_name}, your ward ${s.name} has ${att.absent} absent day(s). Please contact the institute.\n\n[Production: SMS via MSG91 or Twilio]`)}>
                      📱 Notify Parent
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => openViewDetails(s.id)} disabled={viewLoading}>
                    {viewLoading ? 'Loading...' : 'View Full Details'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewData && (
        <Modal title="Student Full Details" onClose={() => setViewData(null)} size={600}
          footer={<button className="btn btn-blue" onClick={() => setViewData(null)}>Close</button>}>
          
          <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:16 }}>
            <Avatar name={viewData.student.name} size={48} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{viewData.student.name}</div>
              <div style={{ marginTop:5, display:'flex', gap:5, flexWrap:'wrap' }}>
                <ClassBadge cls={viewData.student.class} />
                {show11_12(viewData.student.class) && viewData.student.stream && <StreamBadge stream={viewData.student.stream} />}
                <span className="badge bp">{viewData.student.board}</span>
              </div>
            </div>
            {viewData.attendance?.summary?.total > 0 && (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color: viewData.attendance.summary.percentage >= 75 ? 'var(--green-text)' : 'var(--red-text)' }}>
                  {viewData.attendance.summary.percentage}%
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>Attendance</div>
              </div>
            )}
          </div>

          <div className="divider" />
          
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text2)' }}>Personal & Contact Details</div>
          {[
            ['Batch',        viewData.student.batchName     || '—'],
            ['Student Phone', viewData.student.studentPhone || '—'],
            ['Parent Name',  viewData.student.parentName],
            ['Parent Phone', viewData.student.parentPhone],
            ['Parent Email', viewData.student.parentEmail   || '—'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--text3)' }}>{k}</span>
              <span style={{ fontWeight:500, color: 'var(--text)' }}>{v}</span>
            </div>
          ))}

          <div style={{ marginTop: 20, marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Login Credentials</div>
          {viewData.student.loginId ? (
            <CredBox loginId={viewData.student.loginId} password={viewData.student.password} mustChange={viewData.student.mustChange} />
          ) : (
             <div style={{ padding:'12px', background:'var(--bg2)', borderRadius:9, fontSize:12, color:'var(--text3)' }}>
               No login credentials generated yet.
             </div>
          )}

          <div style={{ marginTop: 20, marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Test Results</div>
          {viewData.results && viewData.results.length > 0 ? (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Test Date</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Subject</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Marks</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {viewData.results.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text2)' }}>{new Date(r.test_date).toLocaleDateString('en-GB')}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.title} {r.subject ? `(${r.subject})` : ''}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{r.marks_scored} / {r.total_marks}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                         <span className={`badge ${['A+','A'].includes(r.grade)?'bg':['B+','B'].includes(r.grade)?'bp':['C','D'].includes(r.grade)?'ba':'br'}`}>{r.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding:'12px', background:'var(--bg2)', borderRadius:9, fontSize:12, color:'var(--text3)' }}>
               No test results available.
            </div>
          )}

        </Modal>
      )}

    </div>
  );
}

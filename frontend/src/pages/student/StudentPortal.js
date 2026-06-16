import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function gradeColor(g) {
  return { 'A+':'#15803d','A':'#16a34a','B+':'#0f766e','B':'#0369a1','C':'#b45309','D':'#c2410c','F':'#b91c1c' }[g]||'#64748b';
}
function gradeBg(g) {
  return { 'A+':'#f0fdf4','A':'#f0fdf4','B+':'#f0fdfa','B':'#eff6ff','C':'#fffbeb','D':'#fff7ed','F':'#fef2f2' }[g]||'#f8fafc';
}
function statusColor(s) { return s==='P'?'#16a34a':s==='A'?'#dc2626':'#d97706'; }
function statusBg(s)    { return s==='P'?'#f0fdf4':s==='A'?'#fef2f2':'#fffbeb'; }
function statusLabel(s) { return s==='P'?'Present':s==='A'?'Absent':'Late'; }
function pctColor(p)    { return p>=75?'#16a34a':p>=50?'#d97706':'#dc2626'; }

export default function StudentPortal() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('attendance'); 
  const [attFilter, setAF]    = useState('all');
  const [viewingTest, setVT]  = useState(null); 
  const { user, logout }      = useAuth();
  const navigate              = useNavigate();

  useEffect(() => {
    testsAPI.studentPortal()
      .then(r => {
        const portalData = r.data.data;
        if (portalData && Array.isArray(portalData.results)) {
          portalData.results = portalData.results.map(res => {
            if (res.components && typeof res.components === 'string') {
              try {
                res.components = JSON.parse(res.components);
                if (typeof res.components === 'string') res.components = JSON.parse(res.components);
              } catch (e) { res.components = []; }
            }
            if (res.component_scores && typeof res.component_scores === 'string') {
              try {
                res.component_scores = JSON.parse(res.component_scores);
                if (typeof res.component_scores === 'string') res.component_scores = JSON.parse(res.component_scores);
              } catch (e) { res.component_scores = {}; }
            }
            return res;
          });
        }
        setData(portalData);
      })
      .catch(() => toast.error('Failed to load your data'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div>
        <div style={{ width:36,height:36,border:'3px solid #e2e8f0',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 14px' }} />
        <div style={{ fontSize:13,color:'#94a3b8',textAlign:'center' }}>Loading your portal…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40,marginBottom:12 }}>😕</div>
        <div style={{ fontSize:15,fontWeight:600,color:'#334155' }}>Unable to load your data</div>
        <div style={{ fontSize:13,color:'#94a3b8',marginTop:6 }}>Please try again or contact your institute</div>
      </div>
    </div>
  );

  const { student, attendance, results, ranking } = data;
  const att = attendance.summary;
  const attRecords = attendance.records.filter(r => attFilter === 'all' || r.status === attFilter);

  // Results stats
  const totalTests = results.length;
  const avgMarks   = totalTests > 0 ? Math.round(results.reduce((a,r)=>a+(parseFloat(r.marks_scored)/parseFloat(r.total_marks)*100),0)/totalTests) : null;
  const best       = totalTests > 0 ? results.reduce((b,r)=>parseFloat(r.marks_scored)/parseFloat(r.total_marks)>parseFloat(b.marks_scored)/parseFloat(b.total_marks)?r:b) : null;

  const initials = student.name.trim().split(/\s+/).map(w=>w[0].toUpperCase()).join('').slice(0,2);

  return (
    <div style={{ minHeight:'100vh',background:'#f8fafc',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

      {/* ── TOPBAR ── */}
      <div style={{ background:'#0f2040',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:58,flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,background:'#2563eb',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff' }}>EA</div>
          <div style={{ fontSize:14,fontWeight:700,color:'#f0f4ff',letterSpacing:-0.3 }}>Edu<span style={{ color:'#93c5fd' }}>Attend</span></div>
          <div style={{ width:1,height:18,background:'rgba(255,255,255,0.15)',margin:'0 6px' }} />
          <div style={{ fontSize:12,color:'#94a3b8' }}>Student Portal</div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ fontSize:12,color:'#94a3b8',textAlign:'right' }}>
            <div style={{ color:'#e2e8f0',fontWeight:600 }}>{student.name}</div>
            <div>{student.instituteName}</div>
          </div>
          <button onClick={handleLogout}
            style={{ padding:'6px 14px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,color:'#94a3b8',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:500 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth:900,margin:'0 auto',padding:'24px 20px' }}>

        {/* ── PROFILE CARD ── */}
        <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',alignItems:'center',gap:18,flexWrap:'wrap' }}>
          <div style={{ width:56,height:56,borderRadius:'50%',background:'#eff6ff',border:'2px solid #bfdbfe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#1d4ed8',flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:22,fontWeight:800,color:'#1e3a8a',letterSpacing:-0.5 }}>{student.instituteName}</div>
            <div style={{ fontSize:18,fontWeight:700,color:'#0f172a',letterSpacing:-0.3,marginTop:4 }}>{student.name}</div>
            <div style={{ marginTop:8,display:'flex',gap:6,flexWrap:'wrap' }}>
              <span style={{ padding:'2px 9px',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:20,fontSize:11,fontWeight:600,color:'#0f766e' }}>Class {student.class}</span>
              {student.stream && <span style={{ padding:'2px 9px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:20,fontSize:11,fontWeight:600,color:'#1d4ed8' }}>{student.stream}</span>}
              <span style={{ padding:'2px 9px',background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:20,fontSize:11,fontWeight:600,color:'#7e22ce' }}>{student.board}</span>
            </div>
          </div>
          <div style={{ display:'flex',gap:24,flexWrap:'wrap' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22,fontWeight:700,color:pctColor(att.percentage) }}>{att.percentage}%</div>
              <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>Attendance</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22,fontWeight:700,color:avgMarks!==null?pctColor(avgMarks):'#94a3b8' }}>{avgMarks!==null?`${avgMarks}%`:'—'}</div>
              <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>Avg Score</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22,fontWeight:700,color:'#0f172a' }}>{totalTests}</div>
              <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>Tests</div>
            </div>
            {ranking && ranking.overallRank && (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:22,fontWeight:700,color:'#1d4ed8' }}>#{ranking.overallRank}</div>
                <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>Overall Rank</div>
              </div>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:'flex',gap:0,background:'#f1f5f9',borderRadius:12,padding:4,marginBottom:20 }}>
          {[
            { id:'attendance', icon:'✅', label:'Attendance' },
            { id:'results',    icon:'📊', label:'Test Results' },
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1,padding:'11px 8px',border:'none',background:tab===t.id?'#fff':'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:tab===t.id?'#0f172a':'#64748b',transition:'all 0.2s',boxShadow:tab===t.id?'0 2px 6px rgba(0,0,0,0.08)':'none',display:'flex',alignItems:'center',justifyContent:'center',gap:7 }}>
              <span style={{ fontSize:15 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ══ ATTENDANCE TAB ══════════════════════════════════════ */}
        {tab === 'attendance' && (
          <>
            {/* Summary cards */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
              {[
                { label:'Total Days', value:att.total,   color:'#0f172a' },
                { label:'Present',   value:att.present, color:'#16a34a' },
                { label:'Absent',    value:att.absent,  color:'#dc2626' },
                { label:'Late',      value:att.late,    color:'#d97706' },
              ].map(s=>(
                <div key={s.label} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center' }}>
                  <div style={{ fontSize:24,fontWeight:700,color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px 20px',marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                <div style={{ fontSize:13,fontWeight:600,color:'#0f172a' }}>Overall Attendance</div>
                <div style={{ fontSize:18,fontWeight:700,color:pctColor(att.percentage) }}>{att.percentage}%</div>
              </div>
              <div style={{ height:10,background:'#f1f5f9',borderRadius:5,overflow:'hidden' }}>
                <div style={{ height:'100%',width:`${att.percentage}%`,background:pctColor(att.percentage),borderRadius:5,transition:'width 0.5s' }} />
              </div>
              {att.percentage < 75 && (
                <div style={{ marginTop:10,padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,fontSize:12,color:'#b91c1c',fontWeight:500 }}>
                  ⚠ Your attendance is below 75%. Please attend more classes.
                </div>
              )}
            </div>

            {/* Filter buttons */}
            <div style={{ display:'flex',gap:8,marginBottom:14 }}>
              {[
                { id:'all', label:'All Days' },
                { id:'P',   label:'Present' },
                { id:'A',   label:'Absent'  },
                { id:'L',   label:'Late'    },
              ].map(f=>(
                <button key={f.id} onClick={()=>setAF(f.id)}
                  style={{ padding:'6px 14px',border:`1.5px solid ${attFilter===f.id?'#2563eb':'#e2e8f0'}`,borderRadius:20,background:attFilter===f.id?'#eff6ff':'#fff',color:attFilter===f.id?'#1d4ed8':'#64748b',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,transition:'all 0.15s' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Attendance list */}
            {attRecords.length === 0 ? (
              <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'50px 20px',textAlign:'center' }}>
                <div style={{ fontSize:32,marginBottom:10 }}>📅</div>
                <div style={{ fontSize:14,fontWeight:600,color:'#334155' }}>No attendance records found</div>
              </div>
            ) : (
              <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ padding:'11px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:13,fontWeight:700,color:'#0f172a' }}>Attendance Records</span>
                  <span style={{ fontSize:12,color:'#94a3b8' }}>{attRecords.length} record{attRecords.length!==1?'s':''}</span>
                </div>
                <div style={{ maxHeight:400,overflowY:'auto' }}>
                  {attRecords.map((r,i) => (
                    <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:i<attRecords.length-1?'1px solid #f8fafc':'none' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                        <div style={{ width:36,height:36,borderRadius:8,background:statusBg(r.status),border:`1.5px solid ${statusColor(r.status)}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:statusColor(r.status),fontWeight:700 }}>
                          {r.status}
                        </div>
                        <div>
                          <div style={{ fontSize:13,fontWeight:600,color:'#0f172a' }}>
                            {new Date(r.date).toLocaleDateString('en-IN',{ weekday:'short',day:'numeric',month:'long',year:'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span style={{ padding:'3px 12px',background:statusBg(r.status),border:`1px solid ${statusColor(r.status)}33`,borderRadius:20,fontSize:11,fontWeight:600,color:statusColor(r.status) }}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ RESULTS TAB ═════════════════════════════════════════ */}
        {tab === 'results' && (
          <>
            {/* Summary */}
            {totalTests > 0 && (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20 }}>
                {[
                  { label:'Tests Taken', value:totalTests, color:'#0f172a' },
                  { label:'Average Score', value:`${avgMarks}%`, color:pctColor(avgMarks) },
                  { label:'Best Performance', value:best?`${best.grade} (${best.subject})`:'—', color:gradeColor(best?.grade||'') },
                ].map(s=>(
                  <div key={s.label} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center' }}>
                    <div style={{ fontSize:s.label==='Best Performance'?15:22,fontWeight:700,color:s.color,letterSpacing:s.label==='Tests Taken'?-1:0 }}>{s.value}</div>
                    <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 ? (
              <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'60px 20px',textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:40,marginBottom:12 }}>📝</div>
                <div style={{ fontSize:15,fontWeight:600,color:'#334155',marginBottom:6 }}>No results yet</div>
                <div style={{ fontSize:13,color:'#94a3b8' }}>Your institute hasn't entered any test results for you yet</div>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                {results.map((r,i) => {
                  const pct = Math.round((parseFloat(r.marks_scored)/parseFloat(r.total_marks))*100);
                  return (
                    <div key={i} 
                      onClick={() => setVT(r)}
                      style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px 22px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',cursor:'pointer',transition:'transform 0.2s,boxShadow 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; }}
                    >
                      <div style={{ display:'flex',alignItems:'flex-start',gap:14,flexWrap:'wrap' }}>
                        {/* Grade circle */}
                        <div style={{ width:54,height:54,borderRadius:'50%',background:gradeBg(r.grade),border:`2px solid ${gradeColor(r.grade)}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <span style={{ fontSize:18,fontWeight:800,color:gradeColor(r.grade) }}>{r.grade}</span>
                        </div>

                        {/* Info */}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4 }}>
                            <div style={{ fontSize:15,fontWeight:700,color:'#0f172a' }}>{r.title}</div>
                            <span style={{ padding:'2px 9px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:20,fontSize:11,fontWeight:600,color:'#1d4ed8' }}>{r.subject}</span>
                          </div>
                          <div style={{ display:'flex',gap:16,fontSize:12,color:'#64748b',flexWrap:'wrap' }}>
                            <span>📅 <strong style={{ color:'#0f172a' }}>
                              {new Date(r.test_date).toLocaleDateString('en-IN',{ day:'numeric',month:'long',year:'numeric' })}
                            </strong></span>
                            {r.batch_name && <span>📁 {r.batch_name}</span>}
                            {r.test_rank && (
                              <span style={{ padding:'0 6px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:4,color:'#d97706',fontWeight:700 }}>
                                Rank: #{r.test_rank} / {r.total_students_test}
                              </span>
                            )}
                          </div>
                          {r.remarks && (
                            <div style={{ marginTop:8,padding:'6px 10px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:7,fontSize:12,color:'#475569',fontStyle:'italic' }}>
                              💬 {r.remarks}
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div style={{ textAlign:'right',flexShrink:0 }}>
                          <div style={{ fontSize:26,fontWeight:800,color:pctColor(pct),letterSpacing:-1 }}>
                            {r.marks_scored}
                            <span style={{ fontSize:14,fontWeight:600,color:'#94a3b8' }}>/{r.total_marks}</span>
                          </div>
                          <div style={{ fontSize:13,fontWeight:600,color:pctColor(pct),marginTop:1 }}>{pct}%</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop:14,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${pct}%`,background:pctColor(pct),borderRadius:3,transition:'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {viewingTest && (
        <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20,backdropFilter:'blur(4px)' }}>
          <div className="fade-in" style={{ background:'#fff',borderRadius:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding:'20px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>{viewingTest.title} Report</div>
                <div style={{ fontSize:12,color:'#64748b',marginTop:2 }}>{new Date(viewingTest.test_date).toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })}</div>
              </div>
              <button onClick={()=>setVT(null)} style={{ background:'#f1f5f9',border:'none',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:18,color:'#64748b' }}>×</button>
            </div>
            
            <div style={{ padding:24,overflowY:'auto' }}>
              {/* Summary */}
              <div style={{ background:'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',borderRadius:16,padding:20,marginBottom:24,textAlign:'center',border:'1px solid #bfdbfe' }}>
                <div style={{ display:'flex',justifyContent:'center',marginBottom:12 }}>
                  <div style={{ width:64,height:64,borderRadius:'50%',background:gradeBg(viewingTest.grade),border:`3px solid ${gradeColor(viewingTest.grade)}44`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontSize:22,fontWeight:800,color:gradeColor(viewingTest.grade) }}>{viewingTest.grade}</span>
                  </div>
                </div>
                <div style={{ fontSize:32,fontWeight:800,color:'#1e3a8a',letterSpacing:-1 }}>{viewingTest.marks_scored} <span style={{ fontSize:16,color:'#64748b' }}>/ {viewingTest.total_marks}</span></div>
                <div style={{ fontSize:14,fontWeight:600,color:'#3b82f6',marginTop:2 }}>Overall Percentage: {Math.round((parseFloat(viewingTest.marks_scored)/parseFloat(viewingTest.total_marks))*100)}%</div>
                {viewingTest.test_rank && (
                  <div style={{ fontSize:15,fontWeight:700,color:'#d97706',marginTop:8 }}>Class Rank: #{viewingTest.test_rank} out of {viewingTest.total_students_test}</div>
                )}
              </div>

              {/* Subject Breakdown */}
              {viewingTest.is_combined ? (
                <>
                  <div style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.8,marginBottom:12 }}>Subject-wise Breakdown</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                    {(viewingTest.components || []).map((c, idx) => {
                      const scored = viewingTest.component_scores?.[c.subject] || 0;
                      const cPct = Math.round((parseFloat(scored)/parseFloat(c.total))*100);
                      const cG = ['A+','A','B+','B','C','D','F'][cPct>=90?0:cPct>=80?1:cPct>=70?2:cPct>=60?3:cPct>=50?4:cPct>=35?5:6];
                      return (
                        <div key={idx} style={{ background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px 14px' }}>
                          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8,alignItems:'center' }}>
                            <div style={{ fontSize:13,fontWeight:700,color:'#334155' }}>{c.subject}</div>
                            <div style={{ fontSize:14,fontWeight:700,color:pctColor(cPct) }}>{scored} <span style={{ fontSize:11,color:'#94a3b8' }}>/ {c.total}</span></div>
                          </div>
                          <div style={{ height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden',marginBottom:6 }}>
                            <div style={{ width:`${cPct}%`,height:'100%',background:pctColor(cPct),borderRadius:3 }} />
                          </div>
                          <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,fontWeight:700,color:'#64748b' }}>
                            <span>{cPct}% Scored</span>
                            <span style={{ color:gradeColor(cG) }}>Grade: {cG}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ padding:12,background:'#f8fafc',borderRadius:12,border:'1px dashed #cbd5e1',textAlign:'center' }}>
                  <div style={{ fontSize:13,color:'#64748b' }}>Standard Test: {viewingTest.subject}</div>
                </div>
              )}

              {viewingTest.remarks && (
                <div style={{ marginTop:24 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.8,marginBottom:8 }}>Remarks</div>
                  <div style={{ background:'#fffbeb',border:'1px solid #fde68a',padding:12,borderRadius:10,fontSize:13,color:'#92400e',fontStyle:'italic' }}>
                    "{viewingTest.remarks}"
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding:'16px 24px',background:'#f8fafc',borderTop:'1px solid #f1f5f9',textAlign:'right' }}>
              <button onClick={()=>setVT(null)} style={{ padding:'8px 20px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer' }}>Close Report</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

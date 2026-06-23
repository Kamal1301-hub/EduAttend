import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsAPI, studentsAPI } from '../../api';
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

const renderTestTrendChart = (testTrend) => {
  if (!testTrend || testTrend.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 13 }}>
        No test scores recorded this month.
      </div>
    );
  }
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const points = testTrend.map((t, idx) => {
    const x = padding.left + (idx / Math.max(1, testTrend.length - 1)) * (width - padding.left - padding.right);
    const y = height - padding.bottom - (t.score / 100) * (height - padding.top - padding.bottom);
    return { x, y, score: t.score, title: t.title, subject: t.subject };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = testTrend.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : '';

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 350, height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(val => {
          const y = height - padding.bottom - (val / 100) * (height - padding.top - padding.bottom);
          return (
            <g key={val}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}>{val}%</text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="url(#lineGrad)" />}
        {linePath && <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#1e3a8a', fontWeight: 700 }}>
              {p.score}%
            </text>
            <text x={p.x} y={height - 10} textAnchor="middle" style={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}>
              {p.subject.slice(0, 5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const renderSubjectBarChart = (subjectStats) => {
  if (!subjectStats || subjectStats.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 13 }}>
        No subject statistics available.
      </div>
    );
  }
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  
  const totalWidth = width - padding.left - padding.right;
  const barWidth = Math.min(40, (totalWidth / subjectStats.length) * 0.6);
  const gap = (totalWidth - (barWidth * subjectStats.length)) / Math.max(1, subjectStats.length - 1);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 350, height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(val => {
          const y = height - padding.bottom - (val / 100) * (height - padding.top - padding.bottom);
          return (
            <g key={val}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}>{val}%</text>
            </g>
          );
        })}
        {subjectStats.map((item, idx) => {
          const x = padding.left + idx * (barWidth + gap) + (gap / 2);
          const barHeight = (item.average / 100) * (height - padding.top - padding.bottom);
          const y = height - padding.bottom - barHeight;
          
          return (
            <g key={idx}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill="url(#barGrad)" rx="3" />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" style={{ fontSize: 10, fill: '#047857', fontWeight: 700 }}>
                {item.average}%
              </text>
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" style={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}>
                {item.subject}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const renderAttendanceTrendChart = (attendanceTrend) => {
  if (!attendanceTrend || attendanceTrend.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 13 }}>
        No attendance data recorded this month.
      </div>
    );
  }
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  let runningPresents = 0;
  const trendData = attendanceTrend.map((a, idx) => {
    if (a.status === 'P') runningPresents++;
    const score = Math.round((runningPresents / (idx + 1)) * 100);
    return { date: a.date, score };
  });

  const points = trendData.map((t, idx) => {
    const x = padding.left + (idx / Math.max(1, trendData.length - 1)) * (width - padding.left - padding.right);
    const y = height - padding.bottom - (t.score / 100) * (height - padding.top - padding.bottom);
    return { x, y, score: t.score, date: t.date };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = trendData.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : '';

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 350, height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(val => {
          const y = height - padding.bottom - (val / 100) * (height - padding.top - padding.bottom);
          return (
            <g key={val}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}>{val}%</text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="url(#attGrad)" />}
        {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, idx) => {
          const shouldShowLabel = idx === 0 || idx === points.length - 1 || idx === Math.round(points.length / 2);
          return (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="3" fill="#10b981" />
              {shouldShowLabel && (
                <>
                  <text x={p.x} y={p.y - 8} textAnchor="middle" style={{ fontSize: 9, fill: '#047857', fontWeight: 700 }}>
                    {p.score}%
                  </text>
                  <text x={p.x} y={height - 10} textAnchor="middle" style={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }}>
                    {new Date(p.date).getDate()}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const renderRankTrendChart = (rankHistory) => {
  const validHistory = rankHistory.filter(h => h.rank !== null);
  if (validHistory.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 13 }}>
        No ranking history available.
      </div>
    );
  }
  const maxRank = Math.max(...validHistory.map(h => h.rank)) + 2;
  
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const points = rankHistory.map((h, idx) => {
    const x = padding.left + (idx / Math.max(1, rankHistory.length - 1)) * (width - padding.left - padding.right);
    const rankVal = h.rank !== null ? h.rank : maxRank;
    const y = padding.top + ((rankVal - 1) / Math.max(1, maxRank - 1)) * (height - padding.top - padding.bottom);
    return { x, y, rank: h.rank, month: h.month };
  });

  const linePoints = points.filter(p => p.rank !== null);
  const linePath = linePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 350, height: 'auto', overflow: 'visible' }}>
        {[1, Math.round(maxRank / 2), maxRank].map(val => {
          const y = padding.top + ((val - 1) / Math.max(1, maxRank - 1)) * (height - padding.top - padding.bottom);
          return (
            <g key={val}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}>#{val}</text>
            </g>
          );
        })}
        {linePath && <path d={linePath} fill="none" stroke="#7e22ce" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, idx) => {
          const [yr, mn] = p.month.split('-');
          const label = new Date(yr, mn - 1).toLocaleDateString('en-IN', { month: 'short' });
          return (
            <g key={idx}>
              {p.rank !== null ? (
                <>
                  <circle cx={p.x} cy={p.y} r="4" fill="#7e22ce" stroke="#fff" strokeWidth="2" />
                  <text x={p.x} y={p.y - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#7e22ce', fontWeight: 700 }}>
                    #{p.rank}
                  </text>
                </>
              ) : (
                <circle cx={p.x} cy={p.y} r="3" fill="#cbd5e1" />
              )}
              <text x={p.x} y={height - 10} textAnchor="middle" style={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function StudentPortal() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('attendance'); 
  const [attFilter, setAF]    = useState('all');
  const [viewingTest, setVT]  = useState(null); 
  const [showMeetingModal, setMeetingModal] = useState(false);
  const [meetingData, setMeetingData] = useState({ facultyName: '', message: '' });
  const [sendingMeeting, setSendingMeeting] = useState(false);
  const [showFeesModal, setFeesModal] = useState(false);
  const [feesData, setFeesData] = useState(null);
  const [showStatsModal, setStatsModal] = useState(false);
  const [selectedStatsTest, setStatsTest] = useState(null);
  const [testStatsData, setTestStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reportData, setReportData]       = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  
  const [profileData, setProfileData]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  
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
  
  // Get list of months to populate month picker starting from the student's admission month
  const getRecentMonthsList = (admissionDate) => {
    const list = [];
    const date = new Date();
    const admissionYearMonth = admissionDate ? admissionDate.slice(0, 7) : null;
    
    // Loop back up to 36 months to verify all months since admission are available
    for (let i = 0; i < 36; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${month}`;
      
      // Stop including months older than the month of admission
      if (admissionYearMonth && val < admissionYearMonth) {
        break;
      }
      
      list.push({ value: val, label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) });
      date.setMonth(date.getMonth() - 1);
    }
    return list;
  };
  const monthsList = getRecentMonthsList(data?.student?.createdAt);

  useEffect(() => {
    if (tab === 'report' && !selectedMonth) {
      const today = new Date();
      setSelectedMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [tab, selectedMonth]);

  useEffect(() => {
    if (tab === 'report' && selectedMonth) {
      setReportLoading(true);
      testsAPI.studentMonthlyReport(selectedMonth)
        .then(r => {
          setReportData(r.data.data);
        })
        .catch(() => {
          toast.error('Failed to load monthly report');
        })
        .finally(() => {
          setReportLoading(false);
        });
    }
  }, [tab, selectedMonth]);

  useEffect(() => {
    if (tab === 'profile' && !profileData && !profileLoading) {
      setProfileLoading(true);
      studentsAPI.getProfile()
        .then(r => setProfileData(r.data.data))
        .catch(() => toast.error('Failed to load profile data'))
        .finally(() => setProfileLoading(false));
    }
  }, [tab, profileData, profileLoading]);

  const handlePwdChange = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setPwdLoading(true);
    try {
      await studentsAPI.changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      toast.success('Password changed successfully!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleViewFees = async () => {
    try {
      const res = await studentsAPI.getFeeHistory(data.student.id);
      setFeesData(res.data.data);
      setFeesModal(true);
    } catch (err) {
      toast.error('Failed to load fees details');
    }
  };

  const handleLoadStats = async (testId) => {
    setLoadingStats(true);
    setTestStatsData(null);
    try {
      const res = await testsAPI.studentTestAnalysis(testId);
      setTestStatsData(res.data.data);
    } catch (err) {
      toast.error('Failed to load test stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleMeetingRequest = async (e) => {
    e.preventDefault();
    if (!meetingData.message.trim()) return toast.error('Message is required');
    setSendingMeeting(true);
    try {
      await studentsAPI.requestMeeting(meetingData);
      toast.success('Meeting request sent successfully!');
      setMeetingModal(false);
      setMeetingData({ facultyName: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send meeting request');
    } finally {
      setSendingMeeting(false);
    }
  };

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
    <div style={{ height:'100vh',overflowY:'auto',background:'#f8fafc',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

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
            { id:'more',       icon:'⚙️', label:'More Options' },
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

        {/* ══ MONTHLY REPORT TAB ══════════════════════════════════ */}
        {tab === 'report' && (
          <div className="fade-in">
            {/* Month selector */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Select Reporting Month:</span>
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)} 
                  style={{ padding: '8px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {reportLoading ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: '#64748b' }}>Generating monthly performance report...</div>
              </div>
            ) : reportData ? (
              (() => {
                const { overview, charts, statistics, insights } = reportData;
                
                // MoM Calculations
                const attDiff = overview.attendancePct - overview.prevAttendancePct;
                const scoreDiff = overview.averageScore - overview.prevAverageScore;
                
                let rankDiffLabel = '';
                let rankDiffColor = '#64748b';
                if (overview.currentRank && overview.prevRank) {
                  const diff = overview.prevRank - overview.currentRank;
                  if (diff > 0) {
                    rankDiffLabel = `↑ Improved by ${diff} pos`;
                    rankDiffColor = '#16a34a';
                  } else if (diff < 0) {
                    rankDiffLabel = `↓ Declined by ${Math.abs(diff)} pos`;
                    rankDiffColor = '#dc2626';
                  } else {
                    rankDiffLabel = 'No change';
                  }
                } else if (overview.currentRank) {
                  rankDiffLabel = 'Initial ranking';
                  rankDiffColor = '#2563eb';
                } else {
                  rankDiffLabel = '—';
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Performance Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                      
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Attendance Rate</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{overview.attendancePct}%</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: attDiff >= 0 ? '#16a34a' : '#dc2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                          {attDiff >= 0 ? `▲ +${attDiff}%` : `▼ ${attDiff}%`} <span style={{ color: '#94a3b8', fontWeight: 500 }}>MoM</span>
                        </div>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Average Test Score</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{overview.averageScore}%</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: scoreDiff >= 0 ? '#16a34a' : '#dc2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                          {scoreDiff >= 0 ? `▲ +${scoreDiff}%` : `▼ ${scoreDiff}%`} <span style={{ color: '#94a3b8', fontWeight: 500 }}>MoM</span>
                        </div>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Batch Ranking</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                          {overview.currentRank ? `#${overview.currentRank}` : '—'}
                          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}> / {overview.totalStudents || 0}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: rankDiffColor, marginTop: 6 }}>
                          {rankDiffLabel}
                        </div>
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tests Attempted</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{overview.testsAttempted}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                          Compared to <strong style={{ color: '#64748b' }}>{overview.prevTestsAttempted}</strong> last month
                        </div>
                      </div>

                    </div>

                    {/* Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                      
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>📈 Test Marks Trend</div>
                        {renderTestTrendChart(charts.testTrend)}
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>📊 Subject-Wise Average</div>
                        {renderSubjectBarChart(charts.subjectStats)}
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>📅 Attendance Running Average Trend</div>
                        {renderAttendanceTrendChart(charts.attendanceTrend)}
                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>👑 6-Month Batch Rank Trend</div>
                        {renderRankTrendChart(charts.rankHistory)}
                      </div>

                    </div>

                    {/* Comparison Chart & Insights */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                      
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>🔄 Month-over-Month Comparison</div>
                        
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                            <span>Average Marks</span>
                            <span>{overview.averageScore}% vs {overview.prevAverageScore}%</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 50, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Current</span>
                              <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${overview.averageScore}%`, background: '#2563eb', borderRadius: 5 }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 50, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Previous</span>
                              <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${overview.prevAverageScore}%`, background: '#cbd5e1', borderRadius: 5 }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                            <span>Attendance Rate</span>
                            <span>{overview.attendancePct}% vs {overview.prevAttendancePct}%</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 50, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Current</span>
                              <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${overview.attendancePct}%`, background: '#10b981', borderRadius: 5 }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 50, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Previous</span>
                              <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${overview.prevAttendancePct}%`, background: '#cbd5e1', borderRadius: 5 }} />
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>💡 Performance Insights</div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Strongest Subject</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d', marginTop: 4 }}>{insights.strongestSubject}</div>
                          </div>
                          
                          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>Needs Work</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#7f1d1d', marginTop: 4 }}>{insights.weakestSubject}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Actionable Observations</div>
                        <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6, flex: 1 }}>
                          {insights.observations.map((obs, idx) => (
                            <li key={idx} style={{ marginBottom: 6 }}>{obs}</li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    {/* Monthly Statistics Breakdown Table */}
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>📋 Monthly Statistics Breakdown</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Attendance Metrics</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                              <span style={{ color: '#64748b' }}>Total Classes Conducted:</span>
                              <strong style={{ color: '#334155' }}>{statistics.totalDays}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                              <span style={{ color: '#64748b' }}>Classes Attended:</span>
                              <strong style={{ color: '#16a34a' }}>{statistics.presentDays}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                              <span style={{ color: '#64748b' }}>Classes Missed:</span>
                              <strong style={{ color: '#dc2626' }}>{statistics.absentDays}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b' }}>Late Arrivals:</span>
                              <strong style={{ color: '#d97706' }}>{statistics.lateDays}</strong>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Academic Metrics</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                              <span style={{ color: '#64748b' }}>Average Score:</span>
                              <strong style={{ color: '#2563eb' }}>{overview.averageScore}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                              <span style={{ color: '#64748b' }}>Highest Test Score:</span>
                              <strong style={{ color: '#16a34a' }}>{overview.highestScore !== null ? `${overview.highestScore}%` : '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b' }}>Lowest Test Score:</span>
                              <strong style={{ color: '#dc2626' }}>{overview.lowestScore !== null ? `${overview.lowestScore}%` : '—'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No report data found for this month</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Please try choosing another month from the picker.</div>
              </div>
            )}
          </div>
        )}

        {/* ══ MORE TAB ══════════════════════════════════════════ */}
        {tab === 'more' && (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:16 }}>
            {/* Profile Card */}
            <div onClick={() => setTab('profile')} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',cursor:'pointer',transition:'transform 0.2s,boxShadow 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:16 }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
              <div style={{ width:48,height:48,borderRadius:'50%',background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>👤</div>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Profile</div>
                <div style={{ fontSize:13,color:'#64748b',marginTop:4 }}>Student & Institute Details</div>
              </div>
            </div>

            {/* Monthly Report Card */}
            <div onClick={() => setTab('report')} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',cursor:'pointer',transition:'transform 0.2s,boxShadow 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:16 }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
              <div style={{ width:48,height:48,borderRadius:'50%',background:'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>📋</div>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Monthly Report</div>
                <div style={{ fontSize:13,color:'#64748b',marginTop:4 }}>Monthly performance & insights</div>
              </div>
            </div>

            {/* Contact Faculty Card */}
            <div onClick={() => setMeetingModal(true)} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',cursor:'pointer',transition:'transform 0.2s,boxShadow 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:16 }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
              <div style={{ width:48,height:48,borderRadius:'50%',background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Contact Faculty</div>
                <div style={{ fontSize:13,color:'#64748b',marginTop:4 }}>Request a meeting or slot</div>
              </div>
            </div>

            {/* Stats Card */}
            <div onClick={() => setStatsModal(true)} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',cursor:'pointer',transition:'transform 0.2s,boxShadow 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:16 }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
              <div style={{ width:48,height:48,borderRadius:'50%',background:'#fdf2f8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>📈</div>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Test Analysis Stats</div>
                <div style={{ fontSize:13,color:'#64748b',marginTop:4 }}>Detailed performance insights</div>
              </div>
            </div>

            {/* Fees Details Card */}
            <div onClick={handleViewFees} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',cursor:'pointer',transition:'transform 0.2s,boxShadow 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:16 }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
              <div style={{ width:48,height:48,borderRadius:'50%',background:'#fef3c7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>💳</div>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Fees Details</div>
                <div style={{ fontSize:13,color:'#64748b',marginTop:4 }}>View fee structure & due dates</div>
              </div>
            </div>
          </div>
        )}

        {/* ══ PROFILE TAB ═══════════════════════════════════════ */}
        {tab === 'profile' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <button onClick={()=>setTab('more')} style={{ background:'transparent',border:'none',color:'#64748b',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',gap:4 }}>
                <span>←</span> Back to Options
              </button>
            </div>
            
            {profileLoading || !profileData ? (
              <div style={{ padding:60,textAlign:'center' }}>
                <div style={{ width:32,height:32,border:'3px solid #e2e8f0',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 14px' }} />
                <div style={{ fontSize:13,color:'#94a3b8' }}>Loading profile…</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {/* Student Profile Card */}
                <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:16,display:'flex',alignItems:'center',gap:8 }}><span style={{ fontSize:20 }}>👤</span> Student Profile</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:16, fontSize:14 }}>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Student Name</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.name}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Student Contact Number</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.student_phone || '—'}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Class</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.class}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Stream</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.stream || '—'}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Board</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.board}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Parent/Guardian Name</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.parent_name}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Parent Contact Number</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.parent_phone}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Parent Email</span><span style={{ fontWeight:600,color:'#0f172a' }}>{profileData.student.parent_email || '—'}</span></div>
                    <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Unique Login ID</span><code style={{ background:'#f1f5f9',padding:'2px 6px',borderRadius:4,fontSize:13,color:'#1d4ed8' }}>{profileData.student.student_login_id}</code></div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
                  {/* Fee Summary */}
                  <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:16,display:'flex',alignItems:'center',gap:8 }}><span style={{ fontSize:20 }}>💳</span> Fee Summary</div>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f1f5f9' }}>
                      <span style={{ color:'#64748b',fontSize:14 }}>Total Fees</span>
                      <span style={{ fontWeight:700,fontSize:16,color:'#0f172a' }}>₹{profileData.student.total_fees}</span>
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f1f5f9' }}>
                      <span style={{ color:'#64748b',fontSize:14 }}>Fees Paid</span>
                      <span style={{ fontWeight:700,fontSize:16,color:'#16a34a' }}>₹{profileData.feesPaid}</span>
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0' }}>
                      <span style={{ color:'#64748b',fontSize:14 }}>Remaining Balance</span>
                      <span style={{ fontWeight:700,fontSize:16,color:'#dc2626' }}>₹{Math.max(0, profileData.student.total_fees - profileData.feesPaid)}</span>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:16,display:'flex',alignItems:'center',gap:8 }}><span style={{ fontSize:20 }}>🔒</span> Change Password</div>
                    <form onSubmit={handlePwdChange} style={{ display:'flex',flexDirection:'column',gap:12 }}>
                      <div>
                        <div style={{ fontSize:12,color:'#64748b',marginBottom:4 }}>Current Password</div>
                        <input type="password" value={pwdForm.currentPassword} onChange={e=>setPwdForm(p=>({...p, currentPassword:e.target.value}))} required style={{ width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:12,color:'#64748b',marginBottom:4 }}>New Password</div>
                        <input type="password" value={pwdForm.newPassword} onChange={e=>setPwdForm(p=>({...p, newPassword:e.target.value}))} required minLength={6} style={{ width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:12,color:'#64748b',marginBottom:4 }}>Confirm New Password</div>
                        <input type="password" value={pwdForm.confirmPassword} onChange={e=>setPwdForm(p=>({...p, confirmPassword:e.target.value}))} required minLength={6} style={{ width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:14,boxSizing:'border-box' }} />
                      </div>
                      <button type="submit" disabled={pwdLoading} style={{ marginTop:8,padding:'10px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontWeight:600,cursor:pwdLoading?'not-allowed':'pointer' }}>
                        {pwdLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Institute Details Section */}
                <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize:24,fontWeight:800,color:'#1e3a8a',marginBottom:16 }}>{profileData.student.inst_name}</div>
                  
                  {profileData.student.inst_desc && (
                    <div style={{ fontSize:14,color:'#475569',marginBottom:20,lineHeight:1.6 }}>{profileData.student.inst_desc}</div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:20 }}>
                    {profileData.student.inst_principal && <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Principal / Director</span><span style={{ fontWeight:600,color:'#0f172a',fontSize:14 }}>{profileData.student.inst_principal}</span></div>}
                    {profileData.student.inst_phone && <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Contact Number</span><span style={{ fontWeight:600,color:'#0f172a',fontSize:14 }}>{profileData.student.inst_phone}</span></div>}
                    {profileData.student.inst_email && <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Email Address</span><span style={{ fontWeight:600,color:'#0f172a',fontSize:14 }}>{profileData.student.inst_email}</span></div>}
                    {profileData.student.inst_website && <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Website</span><a href={profileData.student.inst_website} target="_blank" rel="noreferrer" style={{ fontWeight:600,color:'#2563eb',fontSize:14,textDecoration:'none' }}>{profileData.student.inst_website}</a></div>}
                    {profileData.student.inst_est && <div><span style={{ color:'#64748b',fontSize:12,display:'block' }}>Established</span><span style={{ fontWeight:600,color:'#0f172a',fontSize:14 }}>{profileData.student.inst_est}</span></div>}
                  </div>

                  {(profileData.student.inst_achievements || profileData.student.inst_awards) && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20, marginTop:16, paddingTop:20, borderTop:'1px solid #f1f5f9' }}>
                      {profileData.student.inst_achievements && (
                        <div>
                          <div style={{ fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}><span>🏆</span> Achievements</div>
                          <div style={{ fontSize:14,color:'#475569',whiteSpace:'pre-line',lineHeight:1.6 }}>{profileData.student.inst_achievements}</div>
                        </div>
                      )}
                      {profileData.student.inst_awards && (
                        <div>
                          <div style={{ fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}><span>🎖️</span> Awards & Recognitions</div>
                          <div style={{ fontSize:14,color:'#475569',whiteSpace:'pre-line',lineHeight:1.6 }}>{profileData.student.inst_awards}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
      {showMeetingModal && (
        <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20,backdropFilter:'blur(4px)' }}>
          <div className="fade-in" style={{ background:'#fff',borderRadius:16,width:'100%',maxWidth:480,boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding:'20px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Contact Faculty / Request Meeting</div>
              <button onClick={() => setMeetingModal(false)} style={{ background:'#f1f5f9',border:'none',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:18,color:'#64748b' }}>×</button>
            </div>
            <form onSubmit={handleMeetingRequest} style={{ padding:24 }}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block',fontSize:13,fontWeight:600,color:'#334155',marginBottom:6 }}>Faculty Name (Optional)</label>
                <input type="text" placeholder="e.g. Mr. Sharma" value={meetingData.facultyName} onChange={e=>setMeetingData({...meetingData, facultyName:e.target.value})}
                  style={{ width:'100%',padding:'10px 14px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:14,color:'#0f172a',boxSizing:'border-box',fontFamily:'inherit' }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block',fontSize:13,fontWeight:600,color:'#334155',marginBottom:6 }}>Message</label>
                <textarea rows="4" placeholder="Ask for free time or book a slot..." value={meetingData.message} onChange={e=>setMeetingData({...meetingData, message:e.target.value})}
                  style={{ width:'100%',padding:'10px 14px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:14,color:'#0f172a',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical' }} required />
              </div>
              <div style={{ display:'flex',justifyContent:'flex-end',gap:12 }}>
                <button type="button" onClick={() => setMeetingModal(false)} style={{ padding:'8px 16px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={sendingMeeting} style={{ padding:'8px 16px',background:'#2563eb',border:'none',borderRadius:8,fontSize:13,fontWeight:600,color:'#fff',cursor:sendingMeeting?'not-allowed':'pointer',opacity:sendingMeeting?0.7:1 }}>
                  {sendingMeeting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showFeesModal && feesData && (
        <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20,backdropFilter:'blur(4px)' }}>
          <div className="fade-in" style={{ background:'#fff',borderRadius:16,width:'100%',maxWidth:640,boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)',display:'flex',flexDirection:'column' }}>
            <div style={{ padding:'20px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>Fees Details & History</div>
              <button onClick={() => setFeesModal(false)} style={{ background:'#f1f5f9',border:'none',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:18,color:'#64748b' }}>×</button>
            </div>
            
            <div style={{ padding:24 }}>
              {/* Summary Cards */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Fees</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>₹{feesData.totalFees}</div>
                </div>
                <div style={{ flex: 1, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Total Paid</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d', marginTop: 4 }}>₹{feesData.totalPaid}</div>
                </div>
                <div style={{ flex: 1, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Balance</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>₹{feesData.balance}</div>
                </div>
              </div>

              {/* Payment History */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                Payment History
              </div>
              
              {feesData.history?.length > 0 ? (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Remarks</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feesData.history.map(h => (
                        <tr key={h.id}>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                            {new Date(h.payment_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </td>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontStyle: 'italic' }}>
                            {h.remarks || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#16a34a' }}>
                            ₹{h.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No payment history recorded yet.
                </div>
              )}
            </div>

            <div style={{ padding:'16px 24px', background:'#f8fafc', borderTop:'1px solid #f1f5f9', textAlign:'right' }}>
              <button onClick={() => setFeesModal(false)} style={{ padding:'8px 20px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showStatsModal && (
        <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'#f8fafc',zIndex:1100,display:'flex',flexDirection:'column' }}>
          {/* Header */}
          <div style={{ height:64,background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',flexShrink:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:36,height:36,borderRadius:'50%',background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>📈</div>
              <div style={{ fontSize:18,fontWeight:800,color:'#0f172a' }}>Test Analysis</div>
            </div>
            <button onClick={() => { setStatsModal(false); setStatsTest(null); setTestStatsData(null); }} style={{ padding:'8px 16px',background:'#f1f5f9',border:'none',borderRadius:8,fontSize:14,fontWeight:600,color:'#475569',cursor:'pointer' }}>Close Stats</button>
          </div>
          
          <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
            {/* Sidebar: List of Tests */}
            <div style={{ width:320,background:'#fff',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column' }}>
              <div style={{ padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontSize:13,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5 }}>Select a Test</div>
              <div style={{ flex:1,overflowY:'auto',padding:12 }}>
                {results.length === 0 ? (
                  <div style={{ padding:20,textAlign:'center',color:'#94a3b8',fontSize:13 }}>No tests available</div>
                ) : (
                  results.map(r => (
                    <div key={r.test_id} onClick={() => { setStatsTest(r); handleLoadStats(r.test_id); }}
                      style={{ padding:'12px 16px',marginBottom:8,borderRadius:10,cursor:'pointer',border:`1px solid ${selectedStatsTest?.test_id === r.test_id ? '#bfdbfe' : 'transparent'}`,background:selectedStatsTest?.test_id === r.test_id ? '#eff6ff' : '#f8fafc',transition:'all 0.2s' }}>
                      <div style={{ fontSize:14,fontWeight:700,color:selectedStatsTest?.test_id === r.test_id ? '#1d4ed8' : '#334155',marginBottom:4 }}>{r.title}</div>
                      <div style={{ fontSize:12,color:'#64748b',display:'flex',justifyContent:'space-between' }}>
                        <span>{r.subject}</span>
                        <span>{Math.round((r.marks_scored/r.total_marks)*100)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Main Content: Stats Details */}
            <div style={{ flex:1,padding:32,overflowY:'auto' }}>
              {!selectedStatsTest ? (
                <div style={{ height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',color:'#94a3b8' }}>
                  <div style={{ fontSize:48,marginBottom:16 }}>📊</div>
                  <div style={{ fontSize:16,fontWeight:600 }}>Select a test from the left to view detailed analysis</div>
                </div>
              ) : loadingStats ? (
                <div style={{ height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',fontSize:15 }}>Loading analysis...</div>
              ) : testStatsData ? (
                <div className="fade-in" style={{ maxWidth:900,margin:'0 auto' }}>
                  <div style={{ fontSize:28,fontWeight:800,color:'#0f172a',marginBottom:4 }}>{testStatsData.testDetails.title}</div>
                  <div style={{ fontSize:15,color:'#64748b',marginBottom:32 }}>{new Date(testStatsData.testDetails.testDate).toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })} • {testStatsData.testDetails.subject}</div>

                  {/* Summary Blocks */}
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:20,marginBottom:32 }}>
                    <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center' }}>
                      <div style={{ fontSize:13,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5 }}>Your Marks</div>
                      <div style={{ fontSize:32,fontWeight:800,color:'#1e3a8a',marginTop:8 }}>{testStatsData.analysis.studentMarks} <span style={{fontSize:16,color:'#94a3b8'}}>/ {testStatsData.testDetails.totalMarks}</span></div>
                    </div>
                    <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center' }}>
                      <div style={{ fontSize:13,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5 }}>Class Average</div>
                      <div style={{ fontSize:32,fontWeight:800,color:'#d97706',marginTop:8 }}>{Math.round(testStatsData.analysis.classAverage*10)/10}</div>
                    </div>
                    <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center' }}>
                      <div style={{ fontSize:13,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5 }}>Highest Marks</div>
                      <div style={{ fontSize:32,fontWeight:800,color:'#16a34a',marginTop:8 }}>{testStatsData.analysis.highestMarks}</div>
                    </div>
                    <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center' }}>
                      <div style={{ fontSize:13,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5 }}>Overall Rank</div>
                      <div style={{ fontSize:32,fontWeight:800,color:'#2563eb',marginTop:8 }}>#{testStatsData.analysis.overallRank} <span style={{fontSize:16,color:'#94a3b8'}}>/ {testStatsData.analysis.totalStudents}</span></div>
                    </div>
                  </div>

                  {/* Overall Performance Chart */}
                  <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:28,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',marginBottom:32 }}>
                    <div style={{ fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:24 }}>Overall Performance Comparison</div>
                    <div style={{ display:'flex',alignItems:'flex-end',gap:40,height:200,paddingBottom:30,borderBottom:'1px solid #f1f5f9',position:'relative' }}>
                      {/* Student */}
                      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',position:'relative' }}>
                        <div style={{ marginBottom:8,fontSize:14,fontWeight:700,color:'#1e3a8a' }}>{testStatsData.analysis.studentMarks}</div>
                        <div style={{ width:60,background:'linear-gradient(to top, #3b82f6, #60a5fa)',borderRadius:'8px 8px 0 0',height:`${(testStatsData.analysis.studentMarks/testStatsData.testDetails.totalMarks)*100}%`,minHeight:20,transition:'height 1s ease-out' }}></div>
                        <div style={{ position:'absolute',bottom:-28,fontSize:13,fontWeight:600,color:'#475569',textAlign:'center' }}>You</div>
                      </div>
                      {/* Average */}
                      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',position:'relative' }}>
                        <div style={{ marginBottom:8,fontSize:14,fontWeight:700,color:'#d97706' }}>{Math.round(testStatsData.analysis.classAverage*10)/10}</div>
                        <div style={{ width:60,background:'linear-gradient(to top, #f59e0b, #fbbf24)',borderRadius:'8px 8px 0 0',height:`${(testStatsData.analysis.classAverage/testStatsData.testDetails.totalMarks)*100}%`,minHeight:20,transition:'height 1s ease-out' }}></div>
                        <div style={{ position:'absolute',bottom:-28,fontSize:13,fontWeight:600,color:'#475569',textAlign:'center' }}>Average</div>
                      </div>
                      {/* Highest */}
                      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',position:'relative' }}>
                        <div style={{ marginBottom:8,fontSize:14,fontWeight:700,color:'#16a34a' }}>{testStatsData.analysis.highestMarks}</div>
                        <div style={{ width:60,background:'linear-gradient(to top, #10b981, #34d399)',borderRadius:'8px 8px 0 0',height:`${(testStatsData.analysis.highestMarks/testStatsData.testDetails.totalMarks)*100}%`,minHeight:20,transition:'height 1s ease-out' }}></div>
                        <div style={{ position:'absolute',bottom:-28,fontSize:13,fontWeight:600,color:'#475569',textAlign:'center' }}>Highest</div>
                      </div>
                    </div>
                  </div>

                  {/* Subject-wise Analysis */}
                  {testStatsData.testDetails.isCombined && testStatsData.analysis.subjectAnalysis?.length > 0 && (
                    <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:28,boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:24 }}>Subject-wise Analysis</div>
                      <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                        {testStatsData.analysis.subjectAnalysis.map(sub => (
                          <div key={sub.subject} style={{ border:'1px solid #f1f5f9',borderRadius:12,padding:20,background:'#f8fafc' }}>
                            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
                              <div style={{ fontSize:16,fontWeight:700,color:'#334155' }}>{sub.subject} <span style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>(out of {sub.total})</span></div>
                              {sub.rank && <div style={{ fontSize:13,fontWeight:700,color:'#2563eb',background:'#eff6ff',padding:'4px 12px',borderRadius:20 }}>Rank: #{sub.rank}</div>}
                            </div>
                            <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                              {/* Horizontal Bar Chart for Subject */}
                              <div style={{ flex:1,display:'flex',flexDirection:'column',gap:12 }}>
                                
                                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                                  <div style={{ width:60,fontSize:12,color:'#475569',fontWeight:600,textAlign:'right' }}>You</div>
                                  <div style={{ flex:1,height:12,background:'#e2e8f0',borderRadius:6,overflow:'hidden' }}>
                                    <div style={{ height:'100%',width:`${(sub.studentMarks/sub.total)*100}%`,background:'#3b82f6',borderRadius:6 }} />
                                  </div>
                                  <div style={{ width:40,fontSize:13,fontWeight:700,color:'#1e3a8a' }}>{sub.studentMarks}</div>
                                </div>
                                
                                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                                  <div style={{ width:60,fontSize:12,color:'#475569',fontWeight:600,textAlign:'right' }}>Avg</div>
                                  <div style={{ flex:1,height:12,background:'#e2e8f0',borderRadius:6,overflow:'hidden' }}>
                                    <div style={{ height:'100%',width:`${(sub.classAverage/sub.total)*100}%`,background:'#f59e0b',borderRadius:6 }} />
                                  </div>
                                  <div style={{ width:40,fontSize:13,fontWeight:700,color:'#d97706' }}>{Math.round(sub.classAverage*10)/10}</div>
                                </div>

                                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                                  <div style={{ width:60,fontSize:12,color:'#475569',fontWeight:600,textAlign:'right' }}>Highest</div>
                                  <div style={{ flex:1,height:12,background:'#e2e8f0',borderRadius:6,overflow:'hidden' }}>
                                    <div style={{ height:'100%',width:`${(sub.highestMarks/sub.total)*100}%`,background:'#10b981',borderRadius:6 }} />
                                  </div>
                                  <div style={{ width:40,fontSize:13,fontWeight:700,color:'#16a34a' }}>{sub.highestMarks}</div>
                                </div>

                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

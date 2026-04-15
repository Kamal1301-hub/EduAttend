import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI, messagesAPI } from '../../api';
import { Spinner, ProgressBar } from '../../components/UI';

export default function InstDashboard() {
  const [dashData, setDashData] = useState([]);
  const [msgLogs, setMsgLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([attendanceAPI.getDashboard(), messagesAPI.getAll()])
      .then(([d, m]) => { setDashData(d.data.data); setMsgLogs(m.data.data.slice(0, 4)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const totalStudents = dashData.reduce((a, b) => a + (b.total_students || 0), 0);
  const totalPresent = dashData.reduce((a, b) => a + (b.present || 0), 0);
  const todayPct = totalStudents > 0 ? Math.round(totalPresent / totalStudents * 100) : null;
  const msgIcons = { test: '📝', ptm: '👨‍👩‍👧', holiday: '🏖️', custom: '📢', absentee: '🚫', credentials: '🔐' };
  const msgBg = { test: 'var(--green-bg)', ptm: 'var(--blue-bg)', holiday: 'var(--amber-bg)', custom: 'var(--purple-bg)', absentee: 'var(--red-bg)', credentials: 'var(--blue-bg)' };

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><h2>Dashboard</h2><p>Today's overview</p></div>
        <button className="btn btn-blue btn-sm" onClick={() => navigate('/attendance')}>Mark Attendance →</button>
      </div>
      <div className="page-content">
        <div className="stats-grid stats-3">
          <div className="stat-card"><div className="stat-val">{totalStudents}</div><div className="stat-lbl">Total Students</div></div>
          <div className="stat-card"><div className="stat-val">{dashData.length}</div><div className="stat-lbl">Active Batches</div></div>
          <div className="stat-card"><div className="stat-val" style={{ color: todayPct !== null ? (todayPct >= 75 ? 'var(--green)' : 'var(--red)') : 'var(--text2)' }}>{todayPct !== null ? `${todayPct}%` : '—'}</div><div className="stat-lbl">Today's Attendance</div></div>
        </div>

        <div className="g2">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Batch Summary — Today</span>
              <button className="btn btn-sm" onClick={() => navigate('/attendance')}>Mark Today</button>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {dashData.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 20 }}>No batches yet</div> :
                dashData.map(b => {
                  const pct = b.total_students > 0 ? Math.round((b.present || 0) / b.total_students * 100) : 0;
                  return (
                    <div key={b.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {b.is_resubmitted ? <span className="badge ba">Resubmitted</span> : b.is_submitted ? <span className="badge bg">Submitted</span> : null}
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{b.total_students} students</span>
                        </div>
                      </div>
                      <ProgressBar value={pct} />
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{b.present || 0}/{b.total_students} present ({pct}%)</div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Message Log</span>
              <button className="btn btn-sm" onClick={() => navigate('/messages')}>Send Message</button>
            </div>
            {msgLogs.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>No messages sent yet</div> :
              <div style={{ padding: '4px 16px' }}>
                {msgLogs.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < msgLogs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: msgBg[m.type] || 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{msgIcons[m.type] || '📩'}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{m.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {m.batch_name || 'All Batches'} · {m.recipients_count} parents · {m.sent_count || 0} sent / {m.failed_count || 0} failed
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

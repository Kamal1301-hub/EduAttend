import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { attendanceAPI, batchesAPI, studentsAPI } from '../../api';
import { Spinner, EmptyState } from '../../components/UI';

export default function InstAttendance() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [attBatch, setAttBatch] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [pending, setPending] = useState({});
  const [saved, setSaved] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResubmitted, setIsResubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attLoading, setAttLoading] = useState(false);

  // Load batches on mount
  useEffect(() => {
    batchesAPI.getAll().then(r => {
      setBatches(r.data.data);
      if (r.data.data.length > 0) setAttBatch(String(r.data.data[0].id));
    }).finally(() => setLoading(false));
  }, []);

  // Load students + attendance when batch or date changes
  const loadAttendance = useCallback(async () => {
    if (!attBatch) return;
    setAttLoading(true);
    setPending({});
    try {
      const [sRes, aRes] = await Promise.all([
        studentsAPI.getAll({ batchId: attBatch }),
        attendanceAPI.get(attBatch, attDate),
      ]);
      setStudents(sRes.data.data);
      setSaved(aRes.data.data.attendance || {});
      setIsSubmitted(aRes.data.data.isSubmitted || false);
      setIsResubmitted(aRes.data.data.isResubmitted || false);
    } catch { toast.error('Failed to load attendance'); }
    finally { setAttLoading(false); }
  }, [attBatch, attDate]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const src = isSubmitted ? saved : pending;
  const P = Object.values(src).filter(v => v === 'P').length;
  const Ab = Object.values(src).filter(v => v === 'A').length;
  const L = Object.values(src).filter(v => v === 'L').length;
  const unmarked = students.length - P - Ab - L;

  const setPend = (sid, val) => setPending(p => ({ ...p, [sid]: val }));
  const markAll = (val) => { const m = {}; students.forEach(s => { m[s.id] = val; }); setPending(m); };
  const clearAll = () => setPending({});

  const startResubmit = () => {
    setPending({ ...saved });
    setIsSubmitted(false);
    setIsResubmitted(false);
  };

  const handleSubmit = async () => {
    if (students.length === 0) return;
    const unmarkedCount = students.filter(s => !pending[s.id]).length;
    if (unmarkedCount > 0 && !window.confirm(`${unmarkedCount} student(s) are not marked. Submit anyway?`)) return;
    setSubmitting(true);
    try {
      const res = await attendanceAPI.submit({ batchId: attBatch, date: attDate, records: pending });
      toast.success(isResubmitted || isSubmitted ? 'Attendance resubmitted!' : 'Attendance submitted!');
      const abs = res.data?.absenteeNotification;
      if (abs?.error) {
        toast.error(`Absentee alerts not sent: ${abs.error}`);
      } else if (abs) {
        toast.success(`Absentee alerts: ${abs.sent} sent, ${abs.failed} failed`);
      }
      await loadAttendance();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div className="topbar"><div><h2>Mark Attendance</h2><p>Record daily attendance</p></div></div>
      <div className="page-content">

        {/* Controls */}
        <div className="panel" style={{ padding: '14px 16px', marginBottom: 14 }}>
          <div className="form-row">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Select Batch</label>
              <select className="form-control" value={attBatch} onChange={e => { setAttBatch(e.target.value); setPending({}); }}>
                {batches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Date</label>
              <input className="form-control" type="date" value={attDate} max={new Date().toISOString().split('T')[0]}
                onChange={e => { setAttDate(e.target.value); setPending({}); }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid stats-3" style={{ marginBottom: 14 }}>
          <div className="stat-card" style={{ padding: '12px 15px' }}><div className="stat-val" style={{ fontSize: 20, color: 'var(--green)' }}>{P}</div><div className="stat-lbl">Present</div></div>
          <div className="stat-card" style={{ padding: '12px 15px' }}><div className="stat-val" style={{ fontSize: 20, color: 'var(--red)' }}>{Ab}</div><div className="stat-lbl">Absent</div></div>
          <div className="stat-card" style={{ padding: '12px 15px' }}><div className="stat-val" style={{ fontSize: 20, color: 'var(--amber)' }}>{L}</div><div className="stat-lbl">Late</div></div>
        </div>

        {/* Submitted banner */}
        {isSubmitted && !isResubmitted && (
          <div style={{ background: 'var(--green-bg)', border: '1.5px solid var(--green-b)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-text)' }}>Attendance submitted for {attDate}</div>
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 2 }}>If a student arrived late, click Resubmit to update.</div>
              </div>
            </div>
            <button className="btn btn-amber btn-sm" onClick={startResubmit}>🔄 Resubmit Attendance</button>
          </div>
        )}

        {isResubmitted && (
          <div style={{ background: 'var(--amber-bg)', border: '1.5px solid var(--amber-b)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-text)' }}>Attendance resubmitted for {attDate}</div>
                <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>Late arrival updates have been saved.</div>
              </div>
            </div>
            <button className="btn btn-amber btn-sm" onClick={startResubmit}>🔄 Edit Again</button>
          </div>
        )}

        {/* Attendance table */}
        {attLoading ? <Spinner /> : students.length === 0 ? <EmptyState icon="👤" message="No students in this batch" /> : (
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Students — {batches.find(b => String(b.id) === attBatch)?.name}</span>
              {!isSubmitted && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-green btn-sm" onClick={() => markAll('P')}>✓ All Present</button>
                  <button className="btn btn-red btn-sm" onClick={() => markAll('A')}>✗ All Absent</button>
                  <button className="btn btn-sm" onClick={clearAll}>Clear</button>
                </div>
              )}
            </div>
            <div className="table-wrap">
              <table className="att-table">
                <thead>
                  <tr><th>#</th><th>Student Name</th><th>Aadhar</th><th>Parent Phone</th><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Late</th></tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const cur = isSubmitted ? saved[s.id] : pending[s.id];
                    const disabled = isSubmitted;
                    return (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text3)', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{s.aadhar || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.parent_phone}</td>
                        {['P', 'A', 'L'].map(val => (
                          <td key={val} style={{ textAlign: 'center' }}>
                            <label className="radio-label" style={{ cursor: disabled ? 'default' : 'pointer' }}>
                              <input type="radio" className={val === 'P' ? 'rp' : val === 'A' ? 'ra' : 'rl'}
                                name={`att_${s.id}`} value={val} checked={cur === val} disabled={disabled}
                                onChange={() => setPend(s.id, val)} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: cur === val ? (val === 'P' ? 'var(--green-text)' : val === 'A' ? 'var(--red-text)' : 'var(--amber-text)') : 'var(--text3)' }}>
                                {val}
                              </span>
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!isSubmitted && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Marked: <strong>{P + Ab + L}/{students.length}</strong>
                  &nbsp;·&nbsp;
                  {unmarked > 0 ? <span style={{ color: 'var(--red-text)' }}>{unmarked} unmarked</span> : <span style={{ color: 'var(--green-text)' }}>All marked ✓</span>}
                </div>
                <button className="btn btn-navy" onClick={handleSubmit} disabled={submitting} style={{ padding: '9px 22px' }}>
                  {submitting ? 'Submitting…' : 'Submit Attendance'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

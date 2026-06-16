import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { messagesAPI, batchesAPI, studentsAPI } from '../../api';
import { Spinner } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

// ─── MESSAGES PAGE ────────────────────────────────────────────
export default function InstMessages() {
  const [logs, setLogs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msgType, setMsgType] = useState('test');
  const [msgBatch, setMsgBatch] = useState('');
  const [msgDate, setMsgDate] = useState('');
  const [msgTime, setMsgTime] = useState('');
  const [msgSub, setMsgSub] = useState('');
  const [msgCustom, setMsgCustom] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [primaryChannel, setPrimaryChannel] = useState('sms');
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([messagesAPI.getAll(), batchesAPI.getAll(), studentsAPI.getAll()])
      .then(([m, b, s]) => { 
        setLogs(m.data.data); 
        setBatches(b.data.data); 
        setStudents(s.data.data);
        // Initially select all students
        setSelectedIds(s.data.data.map(stu => stu.id));
      })
      .finally(() => setLoading(false));
  }, []);

  const TYPES = [
    { id: 'test', icon: '📝', label: 'Upcoming Test', sub: 'Notify about a scheduled test' },
    { id: 'ptm', icon: '👨‍👩‍👧', label: 'PTM / Meeting', sub: 'Schedule parent-teacher meeting' },
    { id: 'holiday', icon: '🏖️', label: 'Holiday Notice', sub: 'Inform about upcoming holidays' },
    { id: 'custom', icon: '📢', label: 'Custom Message', sub: 'Send any custom announcement' },
  ];

  const filteredRecipients = msgBatch ? students.filter(s => String(s.batch_id) === msgBatch) : students;
  const instName = user?.name || 'Institute';

  // Update selected IDs when batch changes
  const handleBatchChange = (id) => {
    setMsgBatch(id);
    const newFiltered = id ? students.filter(s => String(s.batch_id) === id) : students;
    setSelectedIds(newFiltered.map(s => s.id));
  };

  const toggleStudent = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getPreview = (studentName = '{name}') => {
    const d = msgDate || '[Date]', t = msgTime || '[Time]', s = msgSub || (msgType === 'test' ? 'Unit Test' : msgType === 'holiday' ? '[Holiday]' : '');
    const templates = {
      test: `Dear Parent,\n\nThis is to inform you that a *${s}* is scheduled for your ward *${studentName}* on *${d}* at *${t}*.\n\nKindly ensure they are well prepared.\n\nRegards,\n${instName}`,
      ptm: `Dear Parent,\n\nYou are invited to attend the *Parent-Teacher Meeting (PTM)* regarding *${studentName}* on *${d}* at *${t}*.\n\nVenue: ${instName}\n\nYour presence is important.\n\nRegards,\n${instName}`,
      holiday: `Dear Parent,\n\nPlease note the institute will remain *closed on ${d}* for *${studentName}* and all students on account of *${s}*.\n\nClasses will resume as normal thereafter.\n\nRegards,\n${instName}`,
      custom: msgCustom ? msgCustom.replace(/{name}/g, studentName) : 'Type your message below...',
    };
    return templates[msgType];
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) { toast.error('No students selected'); return; }
    const subject = msgSub || msgCustom || TYPES.find(t => t.id === msgType)?.label;
    if (!subject) { toast.error('Please fill in the message details'); return; }
    setSending(true);
    try {
      const r = await messagesAPI.send({ 
        type: msgType, 
        subject, 
        message: getPreview('{name}'), 
        batchId: msgBatch || null, 
        studentIds: selectedIds,
        primaryChannel: primaryChannel
      });
      const sent = r.data?.data?.sent ?? 0;
      const failed = r.data?.data?.failed ?? 0;
      if (failed > 0) toast.success(`Notification attempted: ${sent} sent, ${failed} failed`);
      else toast.success(`Message sent to ${sent} parent${sent !== 1 ? 's' : ''}`);
      const logsRes = await messagesAPI.getAll(); setLogs(logsRes.data.data);
      setMsgSub(''); setMsgCustom(''); setMsgDate(''); setMsgTime('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const msgIcons = { test: '📝', ptm: '👨‍👩‍👧', holiday: '🏖️', custom: '📢', absentee: '🚫', credentials: '🔐' };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div className="topbar"><div><h2>Send Message</h2><p>Send notifications to parents</p></div></div>
      <div className="page-content">
        <div className="g2">
          {/* LEFT: compose */}
          <div>
            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="panel-head"><span className="panel-title">Message Type</span></div>
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TYPES.map(t => (
                  <div key={t.id} onClick={() => setMsgType(t.id)}
                    style={{ border: `1.5px solid ${msgType === t.id ? 'var(--blue)' : 'var(--border)'}`, background: msgType === t.id ? 'var(--blue-bg)' : 'var(--white)', borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{t.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><span className="panel-title">Message Details</span></div>
              <div style={{ padding: 15 }}>
                <div className="form-group">
                  <label>Subject / Topic</label>
                  <input className="form-control" placeholder="e.g. Data Analytics Quiz" value={msgSub} onChange={e => setMsgSub(e.target.value)} />
                </div>
                {msgType !== 'custom' ? (
                  <>
                    <div className="form-row">
                      <div className="form-group"><label>Date</label><input className="form-control" type="date" value={msgDate} onChange={e => setMsgDate(e.target.value)} /></div>
                      <div className="form-group"><label>Time</label><input className="form-control" type="time" value={msgTime} onChange={e => setMsgTime(e.target.value)} /></div>
                    </div>
                    <div className="form-group">
                      <label>{msgType === 'holiday' ? 'Holiday Name' : msgType === 'test' ? 'Subject / Test Name' : 'Additional Note'}</label>
                      <input className="form-control" placeholder={msgType === 'test' ? 'e.g. Mathematics Chapter 5' : msgType === 'holiday' ? 'e.g. Diwali Holiday' : 'Optional'} value={msgSub} onChange={e => setMsgSub(e.target.value)} />
                    </div>
                  </>
                ) : (
                  <div className="form-group"><label>Your Message</label>
                    <textarea className="form-control" rows={5} placeholder="Type your announcement here..." value={msgCustom} onChange={e => setMsgCustom(e.target.value)} style={{ resize: 'vertical', minHeight: 100 }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: preview + recipients */}
          <div>
            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="panel-head">
                <span className="panel-title">Preview</span>
                <span className="badge bb">{filteredRecipients.length} recipients</span>
              </div>
              <div style={{ padding: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{TYPES.find(t => t.id === msgType)?.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{TYPES.find(t => t.id === msgType)?.label}</span>
                </div>
                <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', borderRadius: 8, padding: '13px 15px', fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 100 }}>
                  {getPreview(selectedIds.length > 0 ? students.find(s => s.id === selectedIds[0])?.name : '{name}')}
                </div>
                {selectedIds.length > 0 && (
                  <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic' }}>
                    * Personalized for <b>{selectedIds.length}</b> selected students.
                  </p>
                )}
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="panel-head">
                <span className="panel-title">Choose Recipients</span>
                <span className="badge bb">{selectedIds.length} selected</span>
              </div>
              <div style={{ padding: '0 15px 12px' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Filter by Batch</label>
                <select className="form-control" style={{ fontSize: 12, height: 36 }} value={msgBatch} onChange={e => handleBatchChange(e.target.value)}>
                  <option value="">All Students (All Batches)</option>
                  {batches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
                {filteredRecipients.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>No students in this batch</div> :
                  filteredRecipients.map(s => (
                    <div key={s.id} onClick={() => toggleStudent(s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedIds.includes(s.id) ? 'var(--bg)' : 'transparent', transition: 'background 0.2s' }}>
                      <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => {}} style={{ cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: selectedIds.includes(s.id) ? 'var(--blue-text)' : 'var(--text)' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.parent_name} • {s.batch_name || 'No Batch'}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <button className="btn btn-navy btn-w" style={{ padding: 11, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleSend} disabled={sending}>
              {sending ? 'Sending…' : (
                <>
                  <span>📤 Send via {primaryChannel.toUpperCase()} to {selectedIds.length} Parents</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message history */}
        {logs.length > 0 && (
          <div className="panel" style={{ marginTop: 4 }}>
            <div className="panel-head"><span className="panel-title">Message History</span><span style={{ fontSize: 12, color: 'var(--text3)' }}>{logs.length} sent</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Subject</th><th>Batch</th><th>Recipients</th><th>Delivery</th><th>Date & Time</th></tr></thead>
                <tbody>
          {logs.map(m => (
            <tr key={m.id}>
              <td style={{ fontSize: 16 }}>{msgIcons[m.type] || '📩'}</td>
              <td style={{ fontWeight: 600 }}>{m.subject}</td>
              <td style={{ color: 'var(--text2)' }}>{m.batch_name || 'All Batches'}</td>
              <td><span className="badge bb">{m.recipients_count} parents</span></td>
              <td style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--green-text)', fontWeight: 600 }}>{m.sent_count || 0} sent</span>
                <span style={{ color: 'var(--text3)' }}> · </span>
                <span style={{ color: (m.failed_count || 0) > 0 ? 'var(--red-text)' : 'var(--text3)', fontWeight: 600 }}>{m.failed_count || 0} failed</span>
                {(m.failed_count || 0) > 0 && m.sample_error && (
                  <div style={{ fontSize: 9, color: 'var(--red-text)', marginTop: 4, fontStyle: 'italic', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.sample_error}>
                    ⚠️ {m.sample_error}
                  </div>
                )}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(m.sent_at).toLocaleString('en-IN')}</td>
            </tr>
          ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

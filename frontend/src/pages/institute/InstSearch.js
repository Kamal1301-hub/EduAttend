import React, { useState } from 'react';
import { studentsAPI } from '../../api';
import { Avatar, StreamBadge, ClassBadge, ProgressBar } from '../../components/UI';
import toast from 'react-hot-toast';

export default function InstSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

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
            Search by name, Aadhar number, or parent details
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
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Aadhar</div><div style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.aadhar || '—'}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Batch</div><div>{s.batch_name || '—'}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Present Days</div><div style={{ fontWeight: 700, color: 'var(--green-text)' }}>{att.present || 0}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Parent</div><div style={{ fontWeight: 500 }}>{s.parent_name}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Phone</div><div>{s.parent_phone}</div></div>
                  <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>Absent Days</div><div style={{ fontWeight: 700, color: 'var(--red-text)' }}>{att.absent || 0}</div></div>
                </div>

                {(att.absent > 0) && (
                  <button className="btn btn-blue btn-sm" style={{ marginTop: 12 }}
                    onClick={() => alert(`Notification sent to ${s.parent_name} (${s.parent_phone})\n\nDear ${s.parent_name}, your ward ${s.name} has ${att.absent} absent day(s). Please contact the institute.\n\n[Production: SMS/WhatsApp via MSG91 or Twilio]`)}>
                    📱 Notify Parent
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

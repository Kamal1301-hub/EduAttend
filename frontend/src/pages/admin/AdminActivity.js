import React, { useEffect, useState } from 'react';
import { institutesAPI } from '../../api';
import { Spinner } from '../../components/UI';

export default function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    institutesAPI.getLogs().then(r => setLogs(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div className="topbar"><div><h2>Activity Log</h2><p>All platform actions</p></div></div>
      <div className="page-content">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Full Activity Log</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{logs.length} entries</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date & Time</th><th>Action</th><th>Institute</th><th>By</th></tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{l.action}</td>
                    <td style={{ color: 'var(--text2)' }}>{l.institute_name}</td>
                    <td><span className="badge bb">{l.performed_by}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

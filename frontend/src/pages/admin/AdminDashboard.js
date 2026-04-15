import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { institutesAPI } from '../../api';
import { StatusBadge, PlanBadge, Spinner, EmptyState } from '../../components/UI';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([institutesAPI.getStats(), institutesAPI.getAll(), institutesAPI.getLogs()])
      .then(([s, i, l]) => {
        setStats(s.data.data);
        setInstitutes(i.data.data.slice(0, 5));
        setLogs(l.data.data.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const expired = institutes.filter(i => new Date(i.expiry_date) < new Date()).length;

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><h2>Dashboard</h2><p>Platform-wide overview</p></div>
        <button className="btn btn-blue btn-sm" onClick={() => navigate('/admin/institutes')}>+ Register Institute</button>
      </div>
      <div className="page-content">

        {/* Stats */}
        <div className="stats-grid stats-4">
          <div className="stat-card"><div className="stat-val">{stats?.total || 0}</div><div className="stat-lbl">Total Institutes</div></div>
          <div className="stat-card"><div className="stat-val" style={{ color: 'var(--green)' }}>{stats?.active || 0}</div><div className="stat-lbl">Active</div></div>
          <div className="stat-card"><div className="stat-val" style={{ color: 'var(--red)' }}>{stats?.suspended || 0}</div><div className="stat-lbl">Suspended</div></div>
          <div className="stat-card"><div className="stat-val">{stats?.totalStudents?.toLocaleString() || 0}</div><div className="stat-lbl">Total Students</div></div>
        </div>

        {/* Expiry alert */}
        {expired > 0 && (
          <div className="alert alert-amber" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber-text)' }}>{expired} institute{expired > 1 ? 's' : ''} with expired subscription</div>
              <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 3 }}>Review and renew their plans to restore access.</div>
            </div>
            <button className="btn btn-amber btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/admin/institutes')}>Review →</button>
          </div>
        )}

        <div className="g2">
          {/* Recent Institutes */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Recent Institutes</span>
              <button className="btn btn-sm" onClick={() => navigate('/admin/institutes')}>View All</button>
            </div>
            {institutes.length === 0 ? <EmptyState icon="🏫" message="No institutes registered yet" /> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Institute</th><th>Plan</th><th>Status</th></tr></thead>
                  <tbody>
                    {institutes.map(i => (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{i.city}, {i.state}</div>
                        </td>
                        <td><PlanBadge plan={i.plan} /></td>
                        <td><StatusBadge status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Recent Activity</span>
              <button className="btn btn-sm" onClick={() => navigate('/admin/activity')}>View All</button>
            </div>
            {logs.length === 0 ? <EmptyState icon="📋" message="No activity yet" /> : (
              <div style={{ padding: '4px 16px' }}>
                {logs.map((l, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: l.type === 'create' ? 'var(--green-bg)' : l.type === 'warn' ? 'var(--red-bg)' : 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                      {l.type === 'create' ? '✚' : l.type === 'warn' ? '⚠' : '✎'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{l.action}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{l.institute_name} · {new Date(l.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

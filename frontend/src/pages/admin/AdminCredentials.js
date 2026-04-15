import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { institutesAPI } from '../../api';
import { StatusBadge, Spinner, CredBox, Modal } from '../../components/UI';

export default function AdminCredentials() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState(null);

  useEffect(() => {
    institutesAPI.getAll()
      .then(r => setInstitutes(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleReset = async (inst) => {
    try {
      const res = await institutesAPI.resetPassword(inst.id);
      setResetModal({ name: inst.name, loginId: inst.login_id, password: res.data.newPassword });
      toast.success('Password reset!');
    } catch {
      toast.error('Failed to reset password');
    }
  };

  const copy = (text, btn) => {
    navigator.clipboard.writeText(text).catch(() => {});
    const o = btn.textContent;
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.textContent = o; }, 1500);
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><h2>Credentials</h2><p>View & manage institute login credentials</p></div>
      </div>
      <div className="page-content">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">All Institute Credentials</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Keep these confidential</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Institute</th><th>Login ID</th><th>Status</th><th>Join Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {institutes.map(i => (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{i.city}</div>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: 'var(--bg)', padding: '3px 8px', borderRadius: 4 }}>
                        {i.login_id}
                      </code>
                    </td>
                    <td><StatusBadge status={i.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{i.join_date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={e => copy(i.login_id, e.currentTarget)}>Copy ID</button>
                        <button className="btn btn-sm btn-amber" onClick={() => handleReset(i)}>🔄 Reset Password</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {resetModal && (
        <Modal
          title="New Password Generated"
          onClose={() => setResetModal(null)}
          footer={<button className="btn btn-blue" onClick={() => setResetModal(null)}>Done</button>}
        >
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
            New credentials for <strong>{resetModal.name}</strong>. Share immediately with the institute admin.
          </p>
          <CredBox loginId={resetModal.loginId} password={resetModal.password} />
        </Modal>
      )}
    </div>
  );
}

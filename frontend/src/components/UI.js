import React from 'react';
import { Inbox, Key, Copy, Check } from 'lucide-react';

// ─── BADGE ────────────────────────────────────────────────────
export function Badge({ type, children }) {
  const cls = { green:'bg', red:'br', amber:'ba', blue:'bb', purple:'bp', teal:'bt' };
  return <span className={`badge ${cls[type] || 'bb'}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const map = { Active: 'green', Suspended: 'red', Expired: 'amber' };
  const dots = { Active: 'dg', Suspended: 'dr', Expired: 'da' };
  return (
    <Badge type={map[status] || 'amber'}>
      <span className={`dot ${dots[status] || 'da'}`} />
      {status}
    </Badge>
  );
}

export function PlanBadge({ plan }) {
  const map = { Premium: 'blue', Standard: 'teal', Basic: 'purple' };
  return <Badge type={map[plan] || 'purple'}>{plan}</Badge>;
}

export function StreamBadge({ stream }) {
  if (!stream) return null;
  const map = { NEET: 'green', JEE: 'blue', Board: 'amber', Both: 'teal' };
  return <Badge type={map[stream] || 'purple'}>{stream}</Badge>;
}

export function ClassBadge({ cls }) {
  return <Badge type="teal">Class {cls}</Badge>;
}

// ─── MODAL ────────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-bg" onClick={e => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal" style={wide ? { width: 640 } : {}}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="xbtn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─── SPINNER ─────────────────────────────────────────────────
export function Spinner() {
  return <div className="loading-center"><div className="spinner" /></div>;
}

// ─── AVATAR ──────────────────────────────────────────────────
export function Avatar({ name, size = 36 }) {
  const initials = name?.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2) || '??';
  return (
    <div className="st-av" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────
export function ProgressBar({ value, color }) {
  return (
    <div className="pbar">
      <div className="pfill" style={{ width: `${Math.min(value, 100)}%`, background: color || 'var(--green)' }} />
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────
export function EmptyState({ icon, message, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon || <Inbox size={48} color="#94a3b8" />}</div>
      <p>{message || 'No data found'}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

// ─── FORM CONTROLS ───────────────────────────────────────────
export function FormGroup({ label, children }) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

export function Input({ label, ...props }) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input className="form-control" {...props} />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <select className="form-control" {...props}>{children}</select>
    </div>
  );
}

// ─── CRED BOX ────────────────────────────────────────────────
export function CredBox({ loginId, password }) {
  const [copiedId, setCopiedId] = React.useState(false);
  const [copiedPass, setCopiedPass] = React.useState(false);

  const copy = (text, type) => {
    navigator.clipboard.writeText(text).catch(() => {});
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 1500);
    }
  };

  return (
    <div className="cred-box">
      <div className="cred-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Key size={16} /> Login Credentials — Keep Confidential
      </div>
      <div className="cred-row">
        <span className="cred-label">Login ID</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="cred-val" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{loginId}</span>
          <button className="btn btn-sm" onClick={() => copy(loginId, 'id')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {copiedId ? <Check size={14} /> : <Copy size={14} />} {copiedId ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="cred-row">
        <span className="cred-label">Password</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="cred-val" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{password}</span>
          <button className="btn btn-sm" onClick={() => copy(password, 'pass')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {copiedPass ? <Check size={14} /> : <Copy size={14} />} {copiedPass ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-sm btn-blue" onClick={() => { copy(`Login ID: ${loginId}\nPassword: ${password}`, 'both'); toast.success('Credentials copied'); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Copy size={14} /> Copy Both Credentials
        </button>
      </div>
    </div>
  );
}

// ─── CONFIRM DELETE ──────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-red' : 'btn-blue'}`} onClick={onConfirm}>Confirm</button>
      </>
    }>
      <p style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

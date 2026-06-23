import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  ShieldAlert, Lock, ArrowLeft, 
  Eye, EyeOff, AlertCircle, ShieldCheck, 
  Database, Zap 
} from 'lucide-react';

export default function AdminLogin() {
  const [form, setForm] = useState({ loginId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await adminLogin(form.loginId, form.password);
      toast.success('Welcome, Super Admin!');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:'100vh', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
      display:'flex', flexDirection:'column', 
      background: 'radial-gradient(circle at top right, #1e293b, #0a0f1a)',
      padding: '20px'
    }}>
      <style>{`
        .login-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 500px) {
          .login-card { padding: 30px 20px; border-radius: 20px; }
        }
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60, marginBottom: 20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'#2563eb', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>EA</div>
          <span style={{ fontSize:18, fontWeight:700, color:'#f0f4ff', letterSpacing:-0.5 }}>Edu<span style={{ color:'#93c5fd' }}>Attend</span></span>
        </div>
        
        <button onClick={() => navigate('/login')}
          style={{ padding:'10px 18px', background: 'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#93c5fd', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={16} /> Back to Portal
        </button>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingBottom: 60 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.08em', marginBottom: 16 }}>
            <ShieldAlert size={14} /> SUPER ADMIN ACCESS
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
            System Administration
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
            Secure access to the EduAttend platform backend
          </p>
        </div>

        <div className="login-card">
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={24} className="text-blue-600" /> Admin Sign In
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Enter your administrator credentials to login</div>
          </div>



          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '12px 16px', color: '#b91c1c', fontSize: 13, marginBottom: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handle}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin Login ID</label>
              <input value={form.loginId} onChange={e => setForm(p => ({ ...p, loginId: e.target.value }))} required
                style={{ width: '100%', padding: '14px 16px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 12, color: '#0f172a', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }} />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '14px 48px 14px 16px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 12, color: '#0f172a', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '16px', background: loading ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? 'Signing in...' : <><Lock size={18} /> Sign In to Admin Panel</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
            EduAttend Platform v1.0 • Built for Scale
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px 30px', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} /> Enterprise Security</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Multi-Tenant</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} /> High Availability</div>
        </div>
      </div>
    </div>
  );
}

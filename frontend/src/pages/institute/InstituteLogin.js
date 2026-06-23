import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Lock, School, GraduationCap, Eye, EyeOff, 
  ArrowLeft, AlertCircle, ShieldCheck, 
  Cloud, UserCheck 
} from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode]       = useState('portal');    // 'portal' | 'admin'
  const [tab, setTab]         = useState('institute'); // 'institute' | 'student'
  const [form, setForm]       = useState({ loginId:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPass, setShowPass] = useState(false);

  const { adminLogin, instituteLogin, studentLogin } = useAuth();
  const navigate = useNavigate();

  const switchMode = (m) => { setMode(m); setError(''); setForm({ loginId:'', password:'' }); setShowPass(false); };
  const switchTab  = (t) => { setTab(t);  setError(''); setForm({ loginId:'', password:'' }); setShowPass(false); };

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'admin') {
        await adminLogin(form.loginId, form.password);
        toast.success('Welcome, Admin!');
        navigate('/admin/dashboard');
      } else if (tab === 'institute') {
        await instituteLogin(form.loginId, form.password);
        toast.success('Welcome!');
        navigate('/dashboard');
      } else {
        const user = await studentLogin(form.loginId, form.password);
        toast.success('Welcome!');
        navigate(user.mustChange ? '/student/change-password' : '/student');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };



  return (
    <div style={{
      minHeight:'100vh', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
      display:'flex', flexDirection:'column', 
      background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
      padding: '20px'
    }}>
      <style>{`
        .login-card {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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
        
        <button onClick={() => switchMode(mode === 'admin' ? 'portal' : 'admin')}
          style={{ padding:'10px 18px', background: 'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#93c5fd', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
          {mode === 'admin' ? <><ArrowLeft size={16} /> Back to Portal</> : <><Lock size={16} /> Admin Login</>}
        </button>
      </div>

      {/* ── CENTERED CONTENT ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingBottom: 60 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
            {mode === 'admin' ? 'Platform Administration' : 'Smart Attendance Portal'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
            {mode === 'admin' 
              ? 'Manage institutes and platform settings' 
              : 'A complete solution for tracking attendance and academic results.'}
          </p>
        </div>

        <div className="login-card">
          {/* Heading */}
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              {mode === 'admin' ? <><Lock size={24} className="text-blue-600" /> Admin Sign In</> : tab === 'institute' ? <><School size={24} /> Institute Login</> : <><GraduationCap size={24} /> Student Login</>}
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {mode === 'admin' ? 'Enter your admin credentials to continue' : 'Sign in to access your dashboard'}
            </div>
          </div>

          {/* ── TAB TOGGLE ── */}
          {mode === 'portal' && (
            <div style={{ background: '#f1f5f9', borderRadius: 14, padding: 4, display: 'flex', marginBottom: 24, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 4, bottom: 4,
                left: tab === 'institute' ? 4 : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
                background: '#fff', borderRadius: 11,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'left 0.25s cubic-bezier(.4,0,.2,1)',
              }} />
              <button onClick={() => switchTab('institute')}
                style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: tab === 'institute' ? '#0f172a' : '#64748b', borderRadius: 11, zIndex: 1, position: 'relative', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <School size={18} /> Institute
              </button>
              <button onClick={() => switchTab('student')}
                style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: tab === 'student' ? '#0f172a' : '#64748b', borderRadius: 11, zIndex: 1, position: 'relative', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <GraduationCap size={18} /> Student
              </button>
            </div>
          )}



          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '12px 16px', color: '#b91c1c', fontSize: 13, marginBottom: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handle}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {mode === 'admin' ? 'Admin ID' : tab === 'institute' ? 'Login ID' : 'Student ID'}
              </label>
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
              style={{ width: '100%', padding: '16px', background: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? 'Signing in...' : <><Lock size={18} /> Sign In to Portal</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
            {mode === 'admin'
              ? 'Institutional platform administration.'
              : tab === 'institute'
                ? 'Forgot credentials? Contact support.'
                : 'Need help? Contact your institute office.'}
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px 30px', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} /> Secure AES-256</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Cloud size={14} /> Cloud Sync</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserCheck size={14} /> Role Based</div>
        </div>
      </div>
    </div>
  );
}

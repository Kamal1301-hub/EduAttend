import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const [form, setForm]       = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const { user, logout }      = useAuth();
  const navigate              = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.newPassword === '123456') { setError('New password cannot be the default password (123456)'); return; }
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/students/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      // Update user in localStorage so mustChange flag is cleared
      const savedUser = JSON.parse(localStorage.getItem('ea_user') || '{}');
      savedUser.mustChange = false;
      localStorage.setItem('ea_user', JSON.stringify(savedUser));
      toast.success('Password changed successfully! Welcome.');
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const fi = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const inputStyle = {
    width:'100%', padding:'11px 44px 11px 13px', background:'#f8fafc',
    border:'1.5px solid #e2e8f0', borderRadius:9, color:'#0f172a',
    fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'all 0.2s',
  };
  const onFocus = e => { e.target.style.borderColor='#2563eb'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)'; };
  const onBlur  = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.background='#f8fafc'; e.target.style.boxShadow='none'; };

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", display:'flex', flexDirection:'column' }}>
      {/* Topbar */}
      <div style={{ background:'#0f2040', padding:'0 20px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:30, height:30, background:'#2563eb', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>EA</div>
          <span style={{ fontSize:15, fontWeight:700, color:'#f0f4ff', letterSpacing:-0.3 }}>Edu<span style={{ color:'#93c5fd' }}>Attend</span></span>
        </div>
        <button onClick={handleLogout}
          style={{ padding:'6px 13px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontSize:12 }}>
          Logout
        </button>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Alert banner */}
          <div style={{ background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:12, padding:'14px 18px', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
            <span style={{ fontSize:22, lineHeight:1 }}>🔒</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#b45309', marginBottom:4 }}>Password Change Required</div>
              <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
                You're logged in with the default password <code style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:700, background:'#fef3c7', padding:'1px 5px', borderRadius:4 }}>123456</code>.
                Please set a new password to continue.
              </div>
            </div>
          </div>

          {/* Card */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'28px 28px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Set New Password</div>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:22 }}>
              Hello, <strong style={{ color:'#0f172a' }}>{user?.name}</strong>. Choose a strong password.
            </div>

            {error && (
              <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:9, padding:'10px 14px', color:'#b91c1c', fontSize:12, marginBottom:16, fontWeight:500 }}>
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handle}>
              {/* Current password */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 }}>
                  Current Password (Default: 123456)
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showCur?'text':'password'} value={form.currentPassword} onChange={fi('currentPassword')} required
                    placeholder="Enter current password" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={()=>setShowCur(p=>!p)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#94a3b8' }}>
                    {showCur?'🙈':'👁'}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 }}>
                  New Password
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showNew?'text':'password'} value={form.newPassword} onChange={fi('newPassword')} required
                    placeholder="Min 6 characters" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={()=>setShowNew(p=>!p)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#94a3b8' }}>
                    {showNew?'🙈':'👁'}
                  </button>
                </div>
                {/* Strength indicator */}
                {form.newPassword.length > 0 && (
                  <div style={{ marginTop:6, display:'flex', gap:4, alignItems:'center' }}>
                    {[1,2,3,4].map(i => {
                      const strength = form.newPassword.length >= 8 && /[A-Z]/.test(form.newPassword) && /[0-9]/.test(form.newPassword) && /[^A-Za-z0-9]/.test(form.newPassword) ? 4
                        : form.newPassword.length >= 8 && (/[A-Z]/.test(form.newPassword) || /[0-9]/.test(form.newPassword)) ? 3
                        : form.newPassword.length >= 6 ? 2 : 1;
                      return <div key={i} style={{ height:4, flex:1, borderRadius:2, background: i<=strength ? (strength>=4?'#16a34a':strength>=3?'#2563eb':strength>=2?'#d97706':'#dc2626') : '#e2e8f0', transition:'background 0.2s' }} />;
                    })}
                    <span style={{ fontSize:11, color:'#64748b', marginLeft:4, whiteSpace:'nowrap' }}>
                      {form.newPassword.length<6?'Too short':form.newPassword.length<8?'Fair':'Good'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div style={{ marginBottom:22 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 }}>
                  Confirm New Password
                </label>
                <input type="password" value={form.confirm} onChange={fi('confirm')} required
                  placeholder="Re-enter new password"
                  style={{ ...inputStyle, padding:'11px 13px', borderColor: form.confirm && form.confirm!==form.newPassword ? '#dc2626' : '#e2e8f0' }}
                  onFocus={onFocus} onBlur={onBlur} />
                {form.confirm && form.confirm !== form.newPassword && (
                  <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>⚠ Passwords do not match</div>
                )}
              </div>

              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'13px', background:loading?'#94a3b8':'#0f2040', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit' }}>
                {loading ? 'Changing Password…' : 'Set New Password & Continue →'}
              </button>
            </form>
          </div>

          <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#94a3b8' }}>
            Contact your institute if you have trouble logging in.
          </div>
        </div>
      </div>
    </div>
  );
}

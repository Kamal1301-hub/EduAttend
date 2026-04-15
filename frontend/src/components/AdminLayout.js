import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, School, Key, 
  ClipboardList, Settings, LogOut, 
  UserCircle 
} from 'lucide-react';

const NAV = [
  { to:'/admin/dashboard',   icon:LayoutDashboard, label:'Dashboard'   },
  { to:'/admin/institutes',  icon:School,          label:'Institutes'   },
  { to:'/admin/credentials', icon:Key,             label:'Credentials'  },
  { to:'/admin/activity',    icon:ClipboardList,    label:'Activity Log' },
  { to:'/admin/settings',    icon:Settings,         label:'Settings'     },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };
  const close = () => setOpen(false);

  return (
    <div className="shell">
      <button className="sb-toggle" onClick={() => setOpen(o=>!o)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>
      <div className={`sb-overlay ${open ? 'show' : ''}`} onClick={close} />

      <div className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sb-brand">
          <div className="sb-brand-row">
            <div className="sb-ic">EA</div>
            <div><div className="sb-name">Edu<span>Attend</span></div><div className="sb-sub">Platform Console</div></div>
          </div>
          <div className="sb-badge">SUPER ADMIN</div>
        </div>
        <nav className="sb-nav">
          <div className="sb-section">Main</div>
          {NAV.map(n=>(
            <NavLink key={n.to} to={n.to} onClick={close}
              className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <span className="nav-icon"><n.icon size={18} /></span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="sb-av-row">
            <div className="sb-av"><UserCircle size={20} color="#94a3b8" /></div>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:'#e2e8f0' }}>{user?.name}</div>
              <div style={{ fontSize:11,color:'#64748b' }}>Platform Owner</div>
            </div>
          </div>
          <button className="btn btn-sm"
            style={{ width:'100%',justifyContent:'center',background:'transparent',border:'1px solid rgba(255,255,255,0.12)',color:'#94a3b8', gap: 8 }}
            onClick={handleLogout}><LogOut size={14} /> Logout</button>
        </div>
      </div>

      <div className="main-area"><Outlet /></div>
    </div>
  );
}

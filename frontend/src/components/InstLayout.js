import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  BarChart3, FolderOpen, User, 
  CheckCircle, FileEdit, Send, 
  Search, LogOut 
} from 'lucide-react';

const NAV = [
  { to:'/dashboard',  icon:BarChart3,  label:'Dashboard'     },
  { to:'/batches',    icon:FolderOpen, label:'Batches'        },
  { to:'/students',   icon:User,       label:'Students'       },
  { to:'/attendance', icon:CheckCircle, label:'Attendance'     },
  { to:'/tests',      icon:FileEdit,    label:'Tests & Results'},
  { to:'/messages',   icon:Send,        label:'Send Message'   },
  { to:'/search',     icon:Search,      label:'Search'         },
];

export default function InstLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };
  const initials = user?.name?.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'IN';
  const close = () => setOpen(false);

  return (
    <div className="shell">
      {/* Mobile hamburger */}
      <button className="sb-toggle" onClick={() => setOpen(o=>!o)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      {/* Overlay for mobile */}
      <div className={`sb-overlay ${open ? 'show' : ''}`} onClick={close} />

      {/* Sidebar */}
      <div className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sb-brand">
          <div className="sb-brand-row">
            <div className="sb-ic">EA</div>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:'#e2e8f0',lineHeight:1.3 }}>
                {user?.name?.length>22?user.name.slice(0,20)+'…':user?.name}
              </div>
              <div style={{ fontSize:11,color:'#64748b',fontFamily:'JetBrains Mono,monospace',marginTop:1 }}>{user?.code}</div>
            </div>
          </div>
          <div className="sb-badge">{user?.plan||'Standard'}</div>
        </div>
        <nav className="sb-nav">
          <div className="sb-section">Navigation</div>
          {NAV.map(n=>(
            <NavLink key={n.to} to={n.to} onClick={close}
              className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <span className="nav-icon"><n.icon size={18} /></span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="sb-av-row">
            <div className="sb-av">{initials}</div>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:'#e2e8f0' }}>{user?.name?.split(' ')[0]}</div>
              <div style={{ fontSize:11,color:'#64748b' }}>{user?.city}</div>
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

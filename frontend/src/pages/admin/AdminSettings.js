import React from 'react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  return (
    <div className="fade-in">
      <div className="topbar"><div><h2>Settings</h2><p>Platform configuration</p></div></div>
      <div className="page-content">
        <div className="g2">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">Admin Account</span></div>
            <div style={{ padding: 18 }}>
              <div className="form-group"><label>Admin Name</label><input className="form-control" defaultValue="Super Admin" /></div>
              <div className="form-group"><label>Email</label><input className="form-control" type="email" defaultValue="superadmin@eduattend.in" /></div>
              <div className="form-group"><label>New Password</label><input className="form-control" type="password" placeholder="Leave blank to keep current" /></div>
              <button className="btn btn-blue" onClick={() => toast.success('Settings saved!')}>Save Changes</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">Platform Settings</span></div>
            <div style={{ padding: 18 }}>
              <div className="form-group"><label>Platform Name</label><input className="form-control" defaultValue="EduAttend" /></div>
              <div className="form-group"><label>Support Email</label><input className="form-control" type="email" defaultValue="support@eduattend.in" /></div>
              <div className="form-group"><label>Default Plan</label>
                <select className="form-control"><option>Basic</option><option>Standard</option><option>Premium</option></select>
              </div>
              <div className="form-group"><label>Default Duration</label>
                <select className="form-control"><option value="12">1 Year</option><option value="6">6 Months</option></select>
              </div>
              <button className="btn btn-blue" onClick={() => toast.success('Platform settings saved!')}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

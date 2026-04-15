import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import AdminLogin      from './pages/admin/AdminLogin';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminInstitutes from './pages/admin/AdminInstitutes';
import AdminCredentials from './pages/admin/AdminCredentials';
import AdminActivity   from './pages/admin/AdminActivity';
import AdminSettings   from './pages/admin/AdminSettings';
import AdminLayout     from './components/AdminLayout';

import LoginPage      from './pages/institute/InstituteLogin';
import InstDashboard  from './pages/institute/InstDashboard';
import InstBatches    from './pages/institute/InstBatches';
import InstStudents   from './pages/institute/InstStudents';
import InstAttendance from './pages/institute/InstAttendance';
import InstMessages   from './pages/institute/InstMessages';
import InstSearch     from './pages/institute/InstSearch';
import InstTests      from './pages/institute/InstTests';
import InstLayout     from './components/InstLayout';

import StudentPortal   from './pages/student/StudentPortal';
import ChangePassword  from './pages/student/ChangePassword';

import './index.css';

function Guard({ role, redirect, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop:80 }} />;
  if (!user || user.role !== role) return <Navigate to={redirect} replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'superadmin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'institute')  return <Navigate to="/dashboard"        replace />;
  if (user?.role === 'student')    return <Navigate to="/student"          replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" toastOptions={{ duration:2500, style:{ fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:'13px' } }} />
        <Routes>
          <Route path="/"   element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Super Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Guard role="superadmin" redirect="/login"><AdminLayout /></Guard>}>
            <Route index             element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard"  element={<AdminDashboard />} />
            <Route path="institutes" element={<AdminInstitutes />} />
            <Route path="credentials"element={<AdminCredentials />} />
            <Route path="activity"   element={<AdminActivity />} />
            <Route path="settings"   element={<AdminSettings />} />
          </Route>

          {/* Institute */}
          <Route path="/" element={<Guard role="institute" redirect="/login"><InstLayout /></Guard>}>
            <Route path="dashboard"  element={<InstDashboard />} />
            <Route path="batches"    element={<InstBatches />} />
            <Route path="students"   element={<InstStudents />} />
            <Route path="attendance" element={<InstAttendance />} />
            <Route path="tests"      element={<InstTests />} />
            <Route path="messages"   element={<InstMessages />} />
            <Route path="search"     element={<InstSearch />} />
          </Route>

          {/* Student */}
          <Route path="/student"                 element={<Guard role="student" redirect="/login"><StudentPortal /></Guard>} />
          <Route path="/student/change-password" element={<Guard role="student" redirect="/login"><ChangePassword /></Guard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

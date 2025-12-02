import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ScoreEntry } from './pages/ScoreEntry';
import { ReportGenerator } from './pages/ReportGenerator';
import { AdminPanel } from './pages/AdminPanel';
import { User, UserRole } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for "Session"
    const stored = localStorage.getItem('cdss_current_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('cdss_current_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cdss_current_user');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-800">Loading CDSS System...</div>;

  return (
    <Router>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            
            <Route path="/scores" element={<ScoreEntry user={user} />} />
            
            <Route path="/reports" element={
              (user.role === UserRole.FORM_MASTER || user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER) 
              ? <ReportGenerator user={user} /> 
              : <Navigate to="/" />
            } />
            
            <Route path="/admin" element={
              (user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER || user.role === UserRole.VP_ACADEMICS || user.role === UserRole.VP_ADMIN) 
              ? <AdminPanel user={user} initialTab="users" /> 
              : <Navigate to="/" />
            } />

             <Route path="/logs" element={
              (user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER || user.role === UserRole.VP_ACADEMICS || user.role === UserRole.VP_ADMIN) 
              ? <AdminPanel user={user} initialTab="logs" /> 
              : <Navigate to="/" />
            } />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      )}
    </Router>
  );
}
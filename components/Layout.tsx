import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const settings = db.getSettings();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => location.pathname === path ? 'bg-green-800 text-white' : 'text-green-100 hover:bg-green-800 hover:text-white';

  const NavItem = ({ to, icon, label }: { to: string; icon: string; label: string }) => (
    <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(to)}`}>
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-xl flex flex-col`}>
        <div className="p-6 border-b border-green-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-full p-1" />
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">CDSS DAURA</h1>
              <p className="text-xs text-green-300 opacity-80">Report System</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white">✕</button>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <NavItem to="/" icon="📊" label="Dashboard" />
          
          {(user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER || user.role === UserRole.VP_ACADEMICS || user.role === UserRole.VP_ADMIN) && (
            <>
              <NavItem to="/admin" icon="🛡️" label="Admin Control" />
              <NavItem to="/logs" icon="📜" label="Audit Logs" />
            </>
          )}

          {/* All users can access Score Entry (either to edit assignments or view all as supervisor) */}
          <NavItem to="/scores" icon="📝" label="Score Entry" />

          {(user.role === UserRole.FORM_MASTER || user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER) && (
            <NavItem to="/reports" icon="🖨️" label="Report Cards" />
          )}
        </nav>

        <div className="p-4 border-t border-green-800 bg-green-900">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-lg font-bold border-2 border-green-600">
                    {user.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
                    <p className="text-xs text-green-300 truncate">{user.role.replace('_', ' ')}</p>
                </div>
            </div>
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded bg-red-800 text-white text-sm hover:bg-red-700 transition-colors shadow-sm"
            >
                <span>Logout</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-40">
            <div className="flex items-center space-x-3">
                 {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                )}
                <h1 className="text-lg font-bold text-gray-800">CDSS DAURA</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 focus:outline-none">
                <span className="text-2xl">☰</span>
            </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
            {children}
        </main>
      </div>
    </div>
  );
};
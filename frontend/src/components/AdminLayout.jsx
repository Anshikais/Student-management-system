import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CheckSquare, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck 
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Assignments', path: '/admin/assignments', icon: BookOpen },
    { name: 'Manage Groups', path: '/admin/groups', icon: Users },
    { name: 'Submission Tracking', path: '/admin/submissions', icon: CheckSquare },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">Joineazy</span>
            <span className="block text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Professor Portal</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold flex items-center justify-center text-sm border border-indigo-500/30 shrink-0">
              {user?.name?.charAt(0) || 'P'}
            </div>
            <div className="truncate flex-1">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-slate-400 truncate">Administrator</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-slate-900 text-white border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-white">Joineazy Admin</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Dropdown Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Dynamic Page Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { Bus, LogOut, User, Sparkles, Navigation, Layers, Shield } from 'lucide-react';

export const Navbar = ({ activeView, setActiveView }) => {
  const { user, logout, quickDemoLogin } = useAuth();

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CampusMove</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30">
                  AI PHASE 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Intelligent Student Transport & Route Agent</p>
            </div>
          </div>

          {/* Center Role/View Navigation if Admin/Multi-role */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => quickDemoLogin('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                user?.role === 'student' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Student View
            </button>
            <button
              onClick={() => quickDemoLogin('driver')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                user?.role === 'driver' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Driver View
            </button>
            <button
              onClick={() => quickDemoLogin('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                user?.role === 'admin' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Admin Panel
            </button>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-200">{user?.name || 'Guest User'}</p>
              <div className="mt-0.5">
                <RoleBadge role={user?.role} />
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { StudentHome } from './pages/StudentHome';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/Navbar';
import { Bus, Heart } from 'lucide-react';

export function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeViewOverride, setActiveViewOverride] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-bounce shadow-lg shadow-blue-500/30 mb-4">
          <Bus className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Initializing CampusMove AI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Active view defaults to user's assigned role or can be toggled in nav
  const currentView = activeViewOverride || user?.role || 'student';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      <div>
        <Navbar activeView={currentView} setActiveView={setActiveViewOverride} />

        <main className="pb-12">
          {currentView === 'admin' && <AdminDashboard />}
          {currentView === 'driver' && <DriverDashboard />}
          {currentView === 'student' && <StudentHome />}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">CampusMove AI</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
              Phase 1 Foundation
            </span>
          </div>
          <p className="flex items-center gap-1 text-slate-500">
            Intelligent Student Transport & Route Agent Platform
          </p>
          <div className="text-slate-400">
            GreenTech University • OpenStreetMap / Leaflet
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

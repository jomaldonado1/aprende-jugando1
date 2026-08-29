import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminPanel from './pages/AdminPanel';
import api from './api/axios';

// Ping silencioso al backend cada 10 min para que Render no se duerma
function useKeepAlive() {
  useEffect(() => {
    const ping = () => {
      api.get('/').catch(() => {}); // silencioso, no importa si falla
    };
    ping(); // ping inmediato al cargar
    const interval = setInterval(ping, 10 * 60 * 1000); // cada 10 min
    return () => clearInterval(interval);
  }, []);
}

function MainRouter() {
  const { user, loading } = useAuth();
  useKeepAlive();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando la plataforma...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (user.role === 'admin') {
    return <AdminPanel />;
  }

  return <StudentDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}

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
  const { user, loading, logout } = useAuth();
  const [showSlowNotice, setShowSlowNotice] = React.useState(false);
  useKeepAlive();

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowSlowNotice(true), 4000);
    } else {
      setShowSlowNotice(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const path = window.location.pathname;
  const matchDuel = path.match(/\/duel\/([A-Za-z0-9]+)/);
  const initialDuelCode = matchDuel ? matchDuel[1].toUpperCase() : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-200">Cargando la plataforma...</p>
            {showSlowNotice && (
              <p className="text-xs text-indigo-300 animate-pulse">
                🌙 Despertando servidor en Render (puede tomar 15-30 seg)...
              </p>
            )}
          </div>
          {showSlowNotice && (
            <button
              onClick={() => logout()}
              className="mt-2 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              Ir a Inicio de Sesión
            </button>
          )}
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

  return <StudentDashboard initialDuelCode={initialDuelCode} />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}

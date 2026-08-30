import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  Gamepad2, User, Lock, Mail, ArrowRight, Sparkles, 
  HelpCircle, KeyRound, CheckCircle, AlertTriangle, ArrowLeft,
  Eye, EyeOff
} from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [viewMode, setViewMode] = useState('login'); // 'login' | 'register' | 'forgot_step1' | 'forgot_step2' | 'forgot_success'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secretQuestion, setSecretQuestion] = useState('¿Nombre de tu primera mascota?');
  const [customQuestion, setCustomQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');

  // Password Recovery states
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [fetchedQuestion, setFetchedQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowServer, setSlowServer] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    setSlowServer(false);
    const slowTimer = setTimeout(() => setSlowServer(true), 5000);

    try {
      if (viewMode === 'register') {
        const finalQuestion = secretQuestion === 'otro' ? customQuestion : secretQuestion;
        await register(email, password, finalQuestion, secretAnswer);
      } else {
        await login(email, password);
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || !err.response) {
        setError('El servidor tardó demasiado en responder. Es normal la primera vez (el servidor gratuito se despierta en ~30-60s). Intenta de nuevo en un momento.');
      } else if (err.response?.status === 400 && (err.response?.data?.detail?.includes('registrado') || err.response?.data?.detail?.includes('uso') || err.response?.data?.detail?.includes('correo'))) {
        setError('Este correo ya está en uso, intenta iniciar sesión.');
      } else {
        setError(
          err.response?.data?.detail || 'Ocurrió un error al procesar la solicitud.'
        );
      }
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowServer(false);
    }
  };

  const handleFetchSecurityQuestion = async (e) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/api/auth/security-question/${encodeURIComponent(recoveryEmail.trim())}`);
      setFetchedQuestion(res.data.secret_question);
      setViewMode('forgot_step2');
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || !err.response) {
        setError('No se pudo conectar al servidor backend.');
      } else {
        setError(err.response?.data?.detail || 'No se pudo obtener la pregunta de seguridad.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!recoveryAnswer.trim() || !newPassword.trim()) return;

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: recoveryEmail.trim(),
        secret_answer: recoveryAnswer.trim(),
        new_password: newPassword
      });
      setSuccessMsg(res.data.detail || '¡Contraseña actualizada exitosamente!');
      setViewMode('forgot_success');
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || !err.response) {
        setError('No se pudo conectar al servidor backend.');
      } else {
        setError(err.response?.data?.detail || 'Error al restablecer la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || !err.response) {
        setError('No se pudo conectar al servidor backend. Si estás en producción, verifica la variable VITE_API_URL.');
      } else {
        setError(err.response?.data?.detail || 'Error al iniciar sesión con cuenta demo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Aprende <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Jugando</span>
          </h1>
          <p className="text-slate-400 text-sm">Plataforma Educativa Gamificada</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-slate-700/50">
          
          {/* Main Auth Tabs (Login / Register) */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setViewMode('login'); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('register'); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Registrarse
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* VISTAS FORMULARES */}
          
          {/* 1. LOGIN & REGISTER FORMS */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudiante@test.com"
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Contraseña</label>
                  {viewMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setViewMode('forgot_step1'); setError(''); setRecoveryEmail(email); }}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CAMPOS ADICIONALES PARA REGISTRO (Pregunta y Respuesta Secreta) */}
              {viewMode === 'register' && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Pregunta de Seguridad</label>
                    <div className="relative">
                      <HelpCircle className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <select
                        value={secretQuestion}
                        onChange={(e) => setSecretQuestion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="¿Nombre de tu primera mascota?">¿Nombre de tu primera mascota?</option>
                        <option value="¿Ciudad donde naciste?">¿Ciudad donde naciste?</option>
                        <option value="¿Nombre de tu escuela primaria?">¿Nombre de tu escuela primaria?</option>
                        <option value="¿Tu libro o película favorita?">¿Tu libro o película favorita?</option>
                        <option value="otro">Escribir pregunta personalizada...</option>
                      </select>
                    </div>
                  </div>

                  {secretQuestion === 'otro' && (
                    <div>
                      <input
                        type="text"
                        required
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="Escribe tu pregunta de seguridad personalizada..."
                        className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Respuesta Secreta</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={secretAnswer}
                        onChange={(e) => setSecretAnswer(e.target.value)}
                        placeholder="Tu respuesta secreta (ej. Firulais)"
                        className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Sirve para recuperar tu acceso si olvidas la clave.</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    {slowServer ? '🌙 Despertando servidor... (30-60s)' : 'Verificando...'}
                  </span>
                ) : (
                  <>
                    <span>{viewMode === 'register' ? 'Crear Cuenta' : 'Entrar a la Plataforma'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. FORGOT PASSWORD STEP 1: PASO 1 - SOLICITAR EMAIL */}
          {viewMode === 'forgot_step1' && (
            <form onSubmit={handleFetchSecurityQuestion} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                  Recuperar Contraseña
                </h3>
                <button
                  type="button"
                  onClick={() => { setViewMode('login'); setError(''); }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">Ingresa tu correo para consultar tu pregunta de seguridad.</p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !recoveryEmail.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40"
              >
                {loading ? 'Consultando...' : 'Obtener Pregunta Secreta'}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD STEP 2: PASO 2 - RESPONDER Y NUEVA CLAVE */}
          {viewMode === 'forgot_step2' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                  Pregunta Secreta
                </h3>
                <button
                  type="button"
                  onClick={() => { setViewMode('forgot_step1'); setError(''); }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Cambiar Email
                </button>
              </div>

              <div className="bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-500/30 text-xs">
                <span className="font-bold text-indigo-300 block mb-0.5">Pregunta de Seguridad:</span>
                <p className="text-white font-medium">{fetchedQuestion}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Respuesta Secreta</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    placeholder="Escribe tu respuesta secreta..."
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva clave..."
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !recoveryAnswer.trim() || !newPassword.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40"
              >
                {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
              </button>
            </form>
          )}

          {/* 4. FORGOT PASSWORD SUCCESS STEP */}
          {viewMode === 'forgot_success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white">¡Contraseña Actualizada!</h3>
                <p className="text-xs text-slate-300 mt-1">{successMsg}</p>
              </div>

              <button
                type="button"
                onClick={() => { setViewMode('login'); setError(''); setSuccessMsg(''); }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Iniciar Sesión con Nueva Contraseña
              </button>
            </div>
          )}

          {/* Quick Demo Login (Estudiante Demo Únicamente) */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-400 text-center mb-3 font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Acceso Rápido Demo
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@test.com', 'admin123')}
                  className="w-full py-2.5 px-3 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/40 rounded-xl text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  Administrador Demo (admin@test.com)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('estudiante@test.com', 'estudiante123')}
                  className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  Estudiante Demo (estudiante@test.com)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

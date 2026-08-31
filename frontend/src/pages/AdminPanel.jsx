import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  ShieldCheck, Users, BookOpen, Trophy, CheckCircle, 
  LogOut, Sparkles, Activity, Edit3, Search, X, Save, 
  AlertTriangle, RefreshCw, FileText, Globe, Plus, UploadCloud, Send, Trash2
} from 'lucide-react';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeView, setActiveView] = useState('users'); // 'users' | 'notes' | 'blocks' | 'questions'
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');

  // Listas de datos por vista
  const [usersList, setUsersList] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [attemptsList, setAttemptsList] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Filtros de búsqueda para preguntas
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal para editar pregunta
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal para Crear Juego / Tema como Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState('notes'); // 'notes' | 'topic'
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [isFreeToggle, setIsFreeToggle] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState('');
  const [extractingFile, setExtractingFile] = useState(false);
  const fileInputRef = useRef(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No tienes permisos para acceder al Panel de Administración.');
    }
  };

  const fetchViewData = async (view) => {
    setTableLoading(true);
    try {
      if (view === 'users') {
        const res = await api.get('/api/admin/users');
        setUsersList(res.data);
      } else if (view === 'notes') {
        const res = await api.get('/api/admin/notes');
        setNotesList(res.data);
      } else if (view === 'blocks') {
        const res = await api.get('/api/admin/attempts');
        setAttemptsList(res.data);
      } else if (view === 'questions') {
        await fetchQuestions();
      }
    } catch (err) {
      console.error(`Error al cargar datos de la vista ${view}:`, err);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (filterType) params.type = filterType;
      const res = await api.get('/api/admin/questions', { params });
      setQuestions(res.data);
    } catch (err) {
      console.error('Error al cargar preguntas:', err);
    }
  };

  const handleToggleFree = async (noteId) => {
    try {
      const res = await api.put(`/api/admin/notes/${noteId}/toggle-free`);
      setNotesList((prev) =>
        prev.map((n) => (n.id === noteId ? res.data : n))
      );
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cambiar la visibilidad del juego');
    }
  };

  const handleDeleteNote = async (noteId, noteTitle) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente el tema "${noteTitle}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/admin/notes/${noteId}`);
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
      await fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el tema');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setNewTitle(cleanName);
    }

    setExtractingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/notes/extract-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewContent(res.data.extracted_text);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al extraer texto del archivo');
    } finally {
      setExtractingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAdminGenerateGame = async (e) => {
    e.preventDefault();

    let titleToSend = '';
    let contentToSend = '';

    if (createMode === 'notes') {
      if (!newTitle.trim() || !newContent.trim()) return;
      titleToSend = newTitle.trim();
      contentToSend = newContent.trim();
    } else {
      if (!topicQuery.trim()) return;
      titleToSend = topicQuery.trim();
      contentToSend = `Genera un juego de estudio exhaustivo y detallado sobre el siguiente tema: ${topicQuery.trim()}. Incluye conceptos clave, contexto, definiciones esenciales, aplicaciones prácticas y ejemplos representativos para dominar la materia.`;
    }

    setGenerating(true);
    setGenerateStep('Analizando tema de estudio como Administrador...');

    try {
      setTimeout(() => setGenerateStep('Invocando a Gemini AI...'), 1200);
      setTimeout(() => setGenerateStep('Generando 5 niveles y 25 preguntas...'), 2800);

      await api.post('/api/notes/generate', {
        title: titleToSend,
        content: contentToSend,
        is_free: isFreeToggle
      });

      setNewTitle('');
      setNewContent('');
      setTopicQuery('');
      setShowCreateModal(false);
      await fetchStats();
      await fetchViewData('notes');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al generar el juego con Gemini AI');
    } finally {
      setGenerating(false);
      setGenerateStep('');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStats();
      await fetchViewData(activeView);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchViewData(activeView);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'questions') {
      const timer = setTimeout(() => {
        fetchQuestions();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, filterType]);

  const handleOpenEditModal = (q) => {
    setEditingQuestion(q);
    setEditPrompt(q.prompt);
    setEditOptions(q.options_json);
    setEditCorrectAnswer(q.correct_answer);
    setEditExplanation(q.explanation || '');
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setSaving(true);
    try {
      await api.put(`/api/admin/questions/${editingQuestion.id}`, {
        prompt: editPrompt,
        options_json: editOptions,
        correct_answer: editCorrectAnswer,
        explanation: editExplanation
      });
      setEditingQuestion(null);
      await fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al actualizar la pregunta');
    } finally {
      setSaving(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'multiple_choice':
        return { label: 'Opción Múltiple', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'cloze':
        return { label: 'Completar Espacio', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'open_ended':
        return { label: 'Desarrollo Conceptual', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'examples':
        return { label: 'Caso / Ejemplo', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'trick_question':
        return { label: 'Pregunta Capciosa', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      default:
        return { label: type, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-tight">Panel de Administración</h1>
            <p className="text-xs text-slate-400">Auditoría Dinámica y Edición de Contenido Gamificado</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">{user?.email}</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-md font-bold uppercase text-[10px]">
              ADMIN
            </span>
          </div>

          <button
            onClick={logout}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-800 cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {error ? (
          <div className="glass-panel p-8 rounded-3xl text-center border border-rose-500/30 text-rose-300">
            <p className="font-bold text-lg">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando métricas de administración...</p>
          </div>
        ) : (
          <>
            {/* Interactive System Metrics Grid (Navigation Tabs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Usuarios Totales */}
              <button
                type="button"
                onClick={() => setActiveView('users')}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                  activeView === 'users'
                    ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/50 shadow-xl shadow-purple-500/20'
                    : 'glass-card border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className={`p-3 rounded-xl border transition-all ${
                  activeView === 'users'
                    ? 'bg-purple-500 text-white border-purple-400'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-extrabold tracking-wider">Usuarios Totales</p>
                  <h3 className="text-2xl font-black text-white mt-0.5">{stats?.total_users || 0}</h3>
                </div>
              </button>

              {/* Card 2: Apuntes Procesados */}
              <button
                type="button"
                onClick={() => setActiveView('notes')}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                  activeView === 'notes'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-500/20'
                    : 'glass-card border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className={`p-3 rounded-xl border transition-all ${
                  activeView === 'notes'
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-extrabold tracking-wider">Apuntes Procesados</p>
                  <h3 className="text-2xl font-black text-white mt-0.5">{stats?.total_notes || 0}</h3>
                </div>
              </button>

              {/* Card 3: Bloques Jugados */}
              <button
                type="button"
                onClick={() => setActiveView('blocks')}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                  activeView === 'blocks'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-500/20'
                    : 'glass-card border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className={`p-3 rounded-xl border transition-all ${
                  activeView === 'blocks'
                    ? 'bg-indigo-500 text-white border-indigo-400'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-extrabold tracking-wider">Bloques Jugados</p>
                  <h3 className="text-2xl font-black text-white mt-0.5">{stats?.total_attempts || 0}</h3>
                </div>
              </button>

              {/* Card 4: Preguntas Registradas */}
              <button
                type="button"
                onClick={() => setActiveView('questions')}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                  activeView === 'questions'
                    ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/50 shadow-xl shadow-amber-500/20'
                    : 'glass-card border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className={`p-3 rounded-xl border transition-all ${
                  activeView === 'questions'
                    ? 'bg-amber-500 text-white border-amber-400'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-extrabold tracking-wider">Preguntas Registradas</p>
                  <h3 className="text-2xl font-black text-white mt-0.5">{stats?.total_questions || 0}</h3>
                </div>
              </button>
            </div>

            {/* DYNAMIC DATA TABLE PANEL */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              
              {/* Header section based on active view */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  {activeView === 'users' && (
                    <>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        Directorio de Usuarios Registrados
                      </h3>
                      <p className="text-xs text-slate-400">Listado general de estudiantes y administradores en la plataforma.</p>
                    </>
                  )}

                  {activeView === 'notes' && (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-emerald-400" />
                          Registro de Apuntes e Historias Generadas
                        </h3>
                        <p className="text-xs text-slate-400">Detalle de notas cargadas por archivo o creadas por tema libre con Gemini AI.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Crear Juego / Demo (IA)
                      </button>
                    </div>
                  )}

                  {activeView === 'blocks' && (
                    <>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-indigo-400" />
                        Historial de Intentos y Avance de Niveles
                      </h3>
                      <p className="text-xs text-slate-400">Auditoría en tiempo real de calificaciones y resultados en cuestionarios gamificados.</p>
                    </>
                  )}

                  {activeView === 'questions' && (
                    <>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-amber-400" />
                        Gestor y Editor de Preguntas con IA
                      </h3>
                      <p className="text-xs text-slate-400">Filtra, audita y modifica cualquier consigna o respuesta en tiempo real.</p>
                    </>
                  )}
                </div>

                {/* Filters (only for questions view) */}
                {activeView === 'questions' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por consigna..."
                        className="bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48 sm:w-64"
                      />
                    </div>

                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Todos los tipos</option>
                      <option value="multiple_choice">Opción Múltiple</option>
                      <option value="cloze">Completar Espacio</option>
                      <option value="open_ended">Desarrollo Conceptual</option>
                      <option value="examples">Caso / Ejemplo</option>
                      <option value="trick_question">Pregunta Capciosa</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Table Body Renderer */}
              {tableLoading ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p className="text-xs text-slate-400">Cargando registros de {activeView}...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  {/* VISTA 1: USERS */}
                  {activeView === 'users' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">ID</th>
                          <th className="p-3">Correo Electrónico</th>
                          <th className="p-3">Rol</th>
                          <th className="p-3 text-center">Apuntes Generados</th>
                          <th className="p-3 text-center">Intentos Jugados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">No hay usuarios registrados.</td>
                          </tr>
                        ) : (
                          usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-900/50 transition-all">
                              <td className="p-3 font-mono text-slate-500">#{u.id}</td>
                              <td className="p-3 font-semibold text-white">{u.email}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono">{u.notes_count}</td>
                              <td className="p-3 text-center font-mono">{u.attempts_count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* VISTA 2: NOTES */}
                  {activeView === 'notes' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">ID</th>
                          <th className="p-3">Título del Apunte</th>
                          <th className="p-3">Creador</th>
                          <th className="p-3">Modalidad / Origen</th>
                          <th className="p-3 text-center">Acceso Público</th>
                          <th className="p-3 text-center">Niveles</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3 text-right">Acción Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {notesList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500">No hay apuntes o temas procesados.</td>
                          </tr>
                        ) : (
                          notesList.map((n) => (
                            <tr key={n.id} className="hover:bg-slate-900/50 transition-all">
                              <td className="p-3 font-mono text-slate-500">#{n.id}</td>
                              <td className="p-3 font-bold text-white max-w-xs truncate">{n.title}</td>
                              <td className="p-3 text-slate-300">{n.user_email}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                  n.origin_type.includes('IA')
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}>
                                  {n.origin_type}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                  n.is_free
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {n.is_free ? '✨ Demo Gratuita' : '🔒 Privado'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-emerald-400">{n.blocks_count} Niveles</td>
                              <td className="p-3 text-slate-400 text-[11px]">{formatDate(n.created_at)}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFree(n.id)}
                                    className={`py-1.5 px-3 font-bold rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                      n.is_free
                                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                                    }`}
                                  >
                                    {n.is_free ? '🔒 Hacer Privado' : '⭐ Marcar Gratuito'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(n.id, n.title)}
                                    className="py-1.5 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold rounded-xl border border-rose-500/30 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* VISTA 3: BLOCKS (ATTEMPTS) */}
                  {activeView === 'blocks' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">ID Intento</th>
                          <th className="p-3">Estudiante</th>
                          <th className="p-3">Apunte / Juego</th>
                          <th className="p-3 text-center">Nivel</th>
                          <th className="p-3 text-center">Calificación</th>
                          <th className="p-3 text-center">Resultado</th>
                          <th className="p-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {attemptsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">No se registran intentos de juegos completados.</td>
                          </tr>
                        ) : (
                          attemptsList.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-900/50 transition-all">
                              <td className="p-3 font-mono text-slate-500">#{a.id}</td>
                              <td className="p-3 font-semibold text-white">{a.user_email}</td>
                              <td className="p-3 text-slate-300 max-w-xs truncate">{a.note_title}</td>
                              <td className="p-3 text-center font-bold text-indigo-300">Nivel {a.level}</td>
                              <td className="p-3 text-center font-mono font-bold text-white text-sm">{a.score}%</td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                  a.is_passed
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                }`}>
                                  {a.is_passed ? 'Superado' : 'A Revisar'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">{formatDate(a.created_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* VISTA 4: QUESTIONS */}
                  {activeView === 'questions' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">ID</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Enunciado / Pregunta</th>
                          <th className="p-3">Respuesta Esperada</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {questions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              No se encontraron preguntas que coincidan con los filtros.
                            </td>
                          </tr>
                        ) : (
                          questions.map((q) => {
                            const badge = getTypeBadge(q.type);
                            return (
                              <tr key={q.id} className="hover:bg-slate-900/50 transition-all">
                                <td className="p-3 font-mono text-slate-500">#{q.id}</td>
                                <td className="p-3">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-white max-w-xs truncate">{q.prompt}</td>
                                <td className="p-3 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                                  {q.correct_answer}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleOpenEditModal(q)}
                                    className="py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold rounded-xl border border-amber-500/30 text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Editar
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MODAL: EDITAR PREGUNTA */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingQuestion(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              Editar Pregunta #{editingQuestion.id}
            </h3>
            <p className="text-xs text-slate-400 mb-6">Modifica la consigna o la respuesta esperada directamente en la BD.</p>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Consigna / Enunciado</label>
                <textarea
                  rows={3}
                  required
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {editingQuestion.type === 'multiple_choice' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Opciones JSON</label>
                  <textarea
                    rows={3}
                    value={editOptions}
                    onChange={(e) => setEditOptions(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Respuesta Correcta / Esperada</label>
                <textarea
                  rows={2}
                  required
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Explicación Didáctica</label>
                <textarea
                  rows={2}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Cambios en la BD'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: CREAR NUEVO JUEGO / TEMA COMO ADMIN */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-bold text-white">Crear Juego Educativo (Admin)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Genera lecciones completas con Gemini AI y publícalas como demos gratuitas para todos los estudiantes.
            </p>

            {/* Modalidad Selector Tabs */}
            <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => setCreateMode('notes')}
                disabled={generating || extractingFile}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  createMode === 'notes'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-300" />
                <span>📚 Subir apuntes</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateMode('topic')}
                disabled={generating || extractingFile}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  createMode === 'topic'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Globe className="w-4 h-4 text-purple-300" />
                <span>🌍 Tema libre a elección</span>
              </button>
            </div>

            {/* Toggle de Marca Gratuita */}
            <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">✨ Publicar como Demo Gratuita</span>
                  <span className="text-[11px] text-slate-400">Permite que cualquier estudiante juegue sin gastar créditos.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isFreeToggle}
                onChange={(e) => setIsFreeToggle(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
              />
            </div>

            {/* Input Oculto de Archivo */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            <form onSubmit={handleAdminGenerateGame} className="space-y-4">
              {createMode === 'notes' && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">Título del Apunte</label>
                      <input
                        type="text"
                        required={createMode === 'notes'}
                        disabled={generating || extractingFile}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ej: Biología - La Célula y su Estructura"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="sm:self-end">
                      <button
                        type="button"
                        disabled={generating || extractingFile}
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <UploadCloud className="w-4 h-4 text-indigo-400" />
                        {extractingFile ? 'Leyendo...' : 'Subir Archivo (.pdf, .docx, .txt)'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contenido de Estudio</label>
                    <textarea
                      required={createMode === 'notes'}
                      rows={5}
                      disabled={generating || extractingFile}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Pega aquí el texto de estudio..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                </>
              )}

              {createMode === 'topic' && (
                <div className="space-y-3 py-1">
                  <label className="block text-xs font-bold text-slate-300">¿Qué tema deseas generar para los alumnos?</label>
                  <input
                    type="text"
                    required={createMode === 'topic'}
                    disabled={generating}
                    value={topicQuery}
                    onChange={(e) => setTopicQuery(e.target.value)}
                    placeholder="Ej: Revolución Industrial, Física Cuántica Básica, Tabla Periódica..."
                    className="w-full bg-slate-900 border-2 border-indigo-500/50 rounded-2xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-xl shadow-indigo-500/10"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  generating || (createMode === 'notes'
                    ? extractingFile || !newTitle.trim() || !newContent.trim()
                    : !topicQuery.trim())
                }
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                Generar e Insertar Juego en la BD
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP DINÁMICO ENTRETENIDO DE GENERACIÓN CON GEMINI AI */}
      {generating && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-8 border border-indigo-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <div className="relative z-10 space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 border-r-purple-500 animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 rounded-full border-4 border-purple-500/20 border-b-purple-400 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                <Sparkles className="w-10 h-10 text-amber-400 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">Diseñando Juego de Estudio</h3>
                <p className="text-sm font-bold text-indigo-300 animate-pulse px-2 leading-relaxed min-h-[44px] flex items-center justify-center">
                  ✨ {generateStep || 'Invocando a Gemini AI...'}
                </p>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>5 Niveles Progresivos</span>
                  <span className="text-purple-400">25 Preguntas</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 h-full rounded-full animate-pulse" style={{ width: '85%' }} />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                🧠 Estructurando: Opción Múltiple, Completar, Desarrollo Conceptual, Ejemplo Práctico y Pregunta Capciosa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


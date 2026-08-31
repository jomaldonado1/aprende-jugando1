import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PricingCards from '../components/PricingCards';
import QuizWizard from '../components/QuizWizard';
import TopicLeaderboardModal from '../components/TopicLeaderboardModal';
import DuelLobbyView from './DuelLobbyView';
import DuelResultView from './DuelResultView';
import { 
  Trophy, BookOpen, CheckCircle, Lock, Play, Plus, 
  LogOut, Sparkles, Award, Star, RefreshCw, X, ChevronRight,
  Brain, FileText, HelpCircle, AlertTriangle, Lightbulb, Edit3, Send, MessageSquare, UploadCloud, Eye, EyeOff, Globe, Zap, Crown,
  Swords, Medal
} from 'lucide-react';

export default function StudentDashboard({ initialDuelCode }) {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Quiz states
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  // Leaderboard modal
  const [leaderboardNote, setLeaderboardNote] = useState(null);
  // Duel modal
  const [duelNote, setDuelNote] = useState(null);
  const [duelResult, setDuelResult] = useState(null);

  useEffect(() => {
    if (initialDuelCode) {
      setDuelNote({ id: null, title: 'Duelo por enlace', share_code: initialDuelCode });
    }
  }, [initialDuelCode]);

  // AI Generator Form States
  const [showAddNote, setShowAddNote] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [createMode, setCreateMode] = useState('notes'); // 'notes' | 'topic'
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState('');
  
  // File Upload State & Ref
  const [extractingFile, setExtractingFile] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, attemptsRes] = await Promise.all([
        api.get('/api/notes'),
        api.get('/api/attempts')
      ]);
      setNotes(notesRes.data);
      setAttempts(attemptsRes.data);
      if (notesRes.data.length > 0 && !selectedNote) {
        setSelectedNote(notesRes.data[0]);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Si el título está vacío, sugerir el nombre del archivo sin extensión
    if (!newTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setNewTitle(cleanName);
    }

    setExtractingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/notes/extract-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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

  const handleGenerateGame = async (e) => {
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
    setGenerateStep('Analizando tema de estudio...');

    try {
      setTimeout(() => setGenerateStep('Invocando a Gemini AI...'), 1200);
      setTimeout(() => setGenerateStep('Generando 5 niveles y 25 preguntas gamificadas...'), 2800);

      const res = await api.post('/api/notes/generate', {
        title: titleToSend,
        content: contentToSend
      });

      setNewTitle('');
      setNewContent('');
      setTopicQuery('');
      setShowAddNote(false);
      await fetchData();
      setSelectedNote(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al generar el juego con Gemini AI');
    } finally {
      setGenerating(false);
      setGenerateStep('');
    }
  };

  const handleStartQuiz = (block) => {
    if (!block.is_unlocked) return;
    setSelectedBlock(block);
    setQuizResult(null);
  };

  const handleQuizComplete = async (result) => {
    setQuizResult(result);
    await fetchData();
    if (selectedNote) {
      const updatedBlocks = await api.get(`/api/notes/${selectedNote.id}/blocks`);
      setSelectedNote({ ...selectedNote, blocks: updatedBlocks.data });
    }
  };



  const completedBlocksCount = notes.reduce(
    (acc, note) => acc + (note.blocks?.filter((b) => b.is_completed).length || 0), 0
  );
  const totalBlocksCount = notes.reduce(
    (acc, note) => acc + (note.blocks?.length || 0), 0
  );

  const getQuestionTypeBadge = (type) => {
    switch (type) {
      case 'multiple_choice':
        return { label: 'Opción Múltiple', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: CheckCircle };
      case 'cloze':
        return { label: 'Completar Espacio', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Edit3 };
      case 'open_ended':
        return { label: 'Desarrollo Conceptual', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: Brain };
      case 'examples':
        return { label: 'Caso / Ejemplo Práctico', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Lightbulb };
      case 'trick_question':
        return { label: 'Pregunta Capciosa', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: AlertTriangle };
      default:
        return { label: 'Pregunta', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: HelpCircle };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-tight">Aprende Jugando</h1>
            <p className="text-xs text-slate-400">Plataforma Educativa Gamificada con Gemini AI</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">{user?.email}</span>
            <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border ${
              user?.plan_type === 'free'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            }`}>
              Plan {user?.plan_type || 'free'} ({user?.credits || 0} Créditos)
            </span>
            {user?.plan_type === 'free' && user?.role !== 'admin' && (
              <button
                onClick={() => setShowPricingModal(true)}
                className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white rounded-md font-extrabold text-[10px] shadow-sm cursor-pointer transition-all"
              >
                ⭐ Ver Planes Premium
              </button>
            )}
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
        
        {/* Gamified Header Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Niveles Desbloqueados</p>
              <h3 className="text-2xl font-black text-white mt-0.5">
                {completedBlocksCount} <span className="text-sm font-normal text-slate-500">/ {totalBlocksCount}</span>
              </h3>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Experiencia Acumulada</p>
              <h3 className="text-2xl font-black text-white mt-0.5">
                {completedBlocksCount * 250} <span className="text-xs font-semibold text-indigo-400">XP</span>
              </h3>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Star className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Pruebas Evaluadas</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{attempts.length}</h3>
            </div>
          </div>
        </div>

        {/* Section Header & Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-indigo-400" />
              Tus Juegos de Estudio Gamificados
            </h2>
            <p className="text-xs text-slate-400">Pega o sube un apunte (PDF, DOCX, TXT) y deja que Gemini AI genere tus 5 niveles de juego.</p>
          </div>

          <button
            onClick={() => setShowAddNote(true)}
            className="py-3 px-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Generar Juego con Gemini AI
          </button>
        </div>

        {/* Layout Column: Notes Selector & Level Roadmap */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando tus lecciones y mapa de avance...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800 space-y-4">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No tienes apuntes de estudio generados</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Haz clic en el botón superior para subir un archivo o pegar tu texto de estudio y crear automáticamente tus 5 niveles con 25 preguntas estructuradas.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar: Notes Navigation */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Tus Apuntes</h3>
              <div className="space-y-2">
                {notes.map((note) => {
                  const isDemo = note.is_free || ["Segunda Guerra Mundial", "Sistema Digestivo", "Teorema de Tales"].includes(note.title);
                  return (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedNote?.id === note.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm truncate pr-2">{note.title}</h4>
                        <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <p className="text-[11px] text-slate-500">
                          {note.blocks?.filter((b) => b.is_completed).length || 0} / {note.blocks?.length || 5} Niveles
                        </p>
                        {isDemo && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Demo Gratuita
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Section: Gamified Level Roadmap */}
            {selectedNote && (
              <div className="lg:col-span-3 space-y-6">
                <div className="glass-panel rounded-3xl p-6 border border-slate-800">
                  <div className="mb-6 pb-4 border-b border-slate-800">
                    <span className="text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/30">
                      Modulo Activo
                    </span>
                    <h3 className="text-2xl font-black text-white mt-2">{selectedNote.title}</h3>
                    <div className="mt-3 max-h-52 overflow-y-auto p-4 bg-slate-900/90 rounded-2xl border border-slate-800/90 shadow-inner">
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                        {selectedNote.content}
                      </p>
                    </div>
                  </div>

                  {/* Level Roadmap Grid */}
                  <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Mapa de Niveles y Desafíos
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {selectedNote.blocks?.map((block) => {
                      const isUnlocked = block.is_unlocked;
                      const isCompleted = block.is_completed;

                      return (
                        <div
                          key={block.id}
                          className={`p-4 rounded-2xl border flex flex-col justify-between relative overflow-hidden transition-all ${
                            isCompleted
                              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                              : isUnlocked
                              ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                              : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-black text-white bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                NIVEL {block.level}
                              </span>

                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : isUnlocked ? (
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Lock className="w-4 h-4 text-slate-500" />
                              )}
                            </div>

                            <p className="text-[11px] font-medium text-slate-300 mb-4">
                              {block.questions?.length || 5} preguntas estructuradas
                            </p>
                          </div>

                          <div className="space-y-2">
                            <button
                              onClick={() => handleStartQuiz(block)}
                              disabled={!isUnlocked}
                              className={`w-full py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                  : isUnlocked
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {isCompleted ? (
                                'Repasar'
                              ) : isUnlocked ? (
                                <><Play className="w-3 h-3 fill-current" />Jugar</>
                              ) : (
                                'Bloqueado'
                              )}
                            </button>

                            {/* Botones de Ranking y Duelo */}
                            {isUnlocked && (
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => setLeaderboardNote(selectedNote)}
                                  className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                >
                                  <Trophy className="w-3 h-3" /> Ranking
                                </button>
                                <button
                                  onClick={() => setDuelNote(selectedNote)}
                                  className="py-1.5 px-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                >
                                  <Swords className="w-3 h-3" /> Duelo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: QUIZ WIZARD (nuevo modo paso a paso) */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBlock(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-md uppercase border border-indigo-500/30">
                Nivel {selectedBlock.level}
              </span>
              <h3 className="text-xl font-black text-white">Desafío de Estudio Gamificado</h3>
            </div>

            <QuizWizard
              block={selectedBlock}
              noteId={selectedNote?.id}
              onClose={() => setSelectedBlock(null)}
              onComplete={handleQuizComplete}
            />
          </div>
        </div>
      )}

      {/* MODAL: FORMULARIO GENERADOR CON GEMINI AI Y SUBIDA DE ARCHIVOS */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => !generating && !extractingFile && setShowAddNote(false)}
              disabled={generating || extractingFile}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-bold text-white">Generar Juego con Gemini AI</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Elige cómo deseas crear tu juego de estudio pedagógico en 5 niveles.
            </p>

            {/* DEMO-WALL OVERLAY PARA USUARIOS GRATUITOS */}
            {user?.plan_type === 'free' && user?.role !== 'admin' && (user?.credits || 0) <= 0 && (
              <div className="absolute inset-x-0 bottom-0 top-16 z-30 bg-slate-950/90 backdrop-blur-md rounded-b-3xl flex flex-col items-center justify-center p-6 text-center border-t border-slate-800 space-y-4">
                <div className="p-4 bg-amber-500/10 text-amber-400 rounded-3xl border border-amber-500/20 shadow-xl animate-pulse">
                  <Lock className="w-10 h-10" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="text-lg font-black text-white">Generación de Juegos IA Bloqueada</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Los usuarios del <strong>Plan Gratuito</strong> pueden jugar de forma ilimitada las 3 Demos Gratuita. Para crear juegos con tus propios apuntes o temas, sube a un plan Premium.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="py-3 px-6 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xl shadow-purple-500/30 transition-all cursor-pointer transform hover:scale-105"
                >
                  ⭐ Desbloquear Generación IA
                </button>
              </div>
            )}

            {/* Modalidad Selector Tabs */}
            <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6">
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
                <span>📚 Subir mis apuntes</span>
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
                <span>🌍 Explorar un tema a elección</span>
              </button>
            </div>

            {/* Input Oculto de Archivo */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            <form onSubmit={handleGenerateGame} className="space-y-4">
              {/* OPCIÓN A: SUBIR MIS APUNTES */}
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
                        placeholder="Ej: Historia Universal - Segunda Guerra Mundial"
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
                        {extractingFile ? 'Leyendo File...' : 'Subir Archivo (.pdf, .docx, .txt)'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-300">Contenido / Notas de Estudio</label>
                      {extractingFile && (
                        <span className="text-[11px] text-indigo-400 font-bold animate-pulse flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Extrayendo texto...
                        </span>
                      )}
                    </div>
                    <textarea
                      required={createMode === 'notes'}
                      rows={6}
                      disabled={generating || extractingFile}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Pega aquí todo el texto de estudio o sube un archivo con el botón de arriba..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                </>
              )}

              {/* OPCIÓN B: EXPLORAR TEMA LIBRE */}
              {createMode === 'topic' && (
                <div className="space-y-3 py-2">
                  <label className="block text-xs font-bold text-slate-300">¿Qué tema te gustaría aprender hoy?</label>
                  <div className="relative">
                    <input
                      type="text"
                      required={createMode === 'topic'}
                      disabled={generating}
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      placeholder="Ej: La Segunda Guerra Mundial, El Teorema de Pitágoras, Fotosíntesis..."
                      className="w-full bg-slate-900 border-2 border-indigo-500/50 rounded-2xl py-3.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-xl shadow-indigo-500/10 leading-relaxed font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Gemini AI investigará y estructurará automáticamente los 5 niveles pedagógicos para ti.
                  </p>
                </div>
              )}

                <button
                  type="submit"
                  disabled={
                    generating || (createMode === 'notes'
                      ? extractingFile || !newTitle.trim() || !newContent.trim()
                      : !topicQuery.trim())
                  }
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  Generar Juego de Estudio
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
                <h3 className="text-2xl font-black text-white tracking-tight">Diseñando tu Juego de Estudio</h3>
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

      {/* MODAL DE SUSCRIPCIONES Y PRICING SAAS */}
      {showPricingModal && (
        <PricingCards onClose={() => setShowPricingModal(false)} />
      )}

      {/* MODAL: LEADERBOARD GLOBAL DEL TEMA */}
      {leaderboardNote && (
        <TopicLeaderboardModal
          noteId={leaderboardNote.id}
          noteTitle={leaderboardNote.title}
          onClose={() => setLeaderboardNote(null)}
        />
      )}

      {/* MODAL: DUELO / DESAFÍO */}
      {duelNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => { setDuelNote(null); setDuelResult(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {duelResult ? (
              <DuelResultView
                myResult={duelResult}
                matchData={null}
                onBack={() => { setDuelNote(null); setDuelResult(null); }}
              />
            ) : (
              <DuelLobbyView
                initialCode={duelNote.share_code || initialDuelCode}
                noteId={duelNote.id}
                noteTitle={duelNote.title}
                onBack={() => setDuelNote(null)}
                onDuelComplete={(result) => setDuelResult(result)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

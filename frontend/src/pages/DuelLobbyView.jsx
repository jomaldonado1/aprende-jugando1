import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import QuizWizard from '../components/QuizWizard';
import {
  Swords, Copy, Check, Play, ArrowLeft, Trophy,
  Users, Clock, BookOpen, Sparkles, RefreshCw, X
} from 'lucide-react';

export default function DuelLobbyView({ initialCode, noteId, noteTitle, onBack, onDuelComplete }) {
  // Mode: 'create' | 'join' | 'playing' | 'done'
  const [mode, setMode] = useState(initialCode ? 'join' : 'create');
  const [matchData, setMatchData] = useState(null);
  const [fakeBlock, setFakeBlock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState(initialCode || '');

  // Crear duelo
  const handleCreate = async () => {
    if (!noteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/matches/create', { note_id: noteId });
      setMatchData(res.data);
      setMode('lobby_creator');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el duelo.');
    } finally {
      setLoading(false);
    }
  };

  // Unirse a duelo por código
  const handleJoin = async (code) => {
    const c = (code || joinCode).trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/matches/${c}`);
      setMatchData(res.data);
      // Construir bloque fake con las preguntas del duelo
      if (res.data.questions?.length > 0) {
        setFakeBlock({
          id: null,  // No se enviará a /quiz/submit sino a /matches/{code}/submit
          level: 1,
          questions: res.data.questions,
          match_code: c
        });
      }
      setMode('lobby_joiner');
    } catch (err) {
      setError(err.response?.data?.detail || 'Código de duelo inválido o no encontrado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) handleJoin(initialCode);
  }, [initialCode]);

  const handleCopy = () => {
    const link = matchData?.share_link || window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleStartPlaying = async () => {
    if (!matchData) return;
    setLoading(true);
    setError(null);
    try {
      let fullData = matchData;
      if (!fullData.questions || fullData.questions.length === 0) {
        const res = await api.get(`/api/matches/${matchData.share_code}`);
        fullData = res.data;
        setMatchData(fullData);
      }
      setFakeBlock({
        id: null,
        level: 1,
        questions: fullData.questions || [],
        match_code: fullData.share_code
      });
      setMode('playing');
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar las preguntas del duelo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuelResult = async (result) => {
    // Submit result to matches endpoint
    try {
      const correctCount = result.details?.filter(d => d.is_correct).length || 0;
      const total = result.details?.length || 1;
      const accuracy = Math.round((correctCount / total) * 100);
      const timeSpent = fakeBlock?.questions?.length * 30; // approx

      await api.post(`/api/matches/${fakeBlock.match_code}/submit`, {
        score_total: result.score,
        time_spent_seconds: timeSpent,
        accuracy_percentage: accuracy
      });
    } catch (e) {
      console.warn('Could not submit duel result:', e);
    }
    if (onDuelComplete) onDuelComplete(result, matchData);
    else setMode('done');
  };

  // ── MODO CREAR ────────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-black text-white text-lg flex items-center gap-2">
              <Swords className="w-5 h-5 text-indigo-400" /> Crear Duelo
            </h3>
            <p className="text-xs text-slate-400">{noteTitle}</p>
          </div>
        </div>

        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Al crear un duelo, generarás un <strong className="text-indigo-300">código único</strong> para compartir con tus amigos. 
            Ambos jugarán las mismas preguntas del <strong className="text-indigo-300">Nivel 1</strong> de este tema y compararán resultados.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
            {[['⚡', 'Mismo set de preguntas'], ['🏆', 'Ranking en tiempo real'], ['🔗', 'Link compartible']].map(([icon, label]) => (
              <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-2">
                <div className="text-lg mb-1">{icon}</div>
                <p className="text-[10px]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">{error}</p>}

        <div className="space-y-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
            Generar Código de Duelo
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
            <div className="relative text-center"><span className="bg-slate-950 px-3 text-xs text-slate-500">¿Ya tienes un código?</span></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Ingresa código (ej. ABC123)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
              maxLength={8}
            />
            <button
              onClick={() => handleJoin(joinCode)}
              disabled={loading || !joinCode.trim()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40"
            >
              Unirse
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LOBBY CREADOR (código generado) ───────────────────────────────────────
  if (mode === 'lobby_creator' && matchData) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-white">¡Duelo Creado! ⚔️</h3>
            <p className="text-xs text-slate-400">{matchData.note_title}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 text-center space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Código del Duelo</p>
          <p className="text-4xl font-black text-white tracking-[0.3em]">{matchData.share_code}</p>
          <button
            onClick={handleCopy}
            className="w-full py-2.5 bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {copied ? <><Check className="w-4 h-4 text-emerald-400" /> Link copiado!</> : <><Copy className="w-4 h-4" /> Copiar Link para Amigos</>}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Comparte el código o el link. Cuando tu amigo entre, ambos jugarán las mismas preguntas.
        </p>

        <button
          onClick={handleStartPlaying}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" /> Jugar Primero
        </button>
      </div>
    );
  }

  // ── LOBBY RETADOR (aceptar desafío) ───────────────────────────────────────
  if (mode === 'lobby_joiner' && matchData) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-white">¡Te desafiaron! ⚔️</h3>
            <p className="text-xs text-slate-400">Código: <span className="font-bold text-white tracking-widest">{matchData.share_code}</span></p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Tema: <strong className="text-white">{matchData.note_title}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Creado por: <strong className="text-white">{matchData.creator_email}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span><strong className="text-white">{matchData.questions?.length || 5} preguntas</strong> del Nivel 1</span>
          </div>
        </div>

        {matchData.leaderboard?.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] uppercase font-bold text-slate-500">Resultados anteriores</p>
            {matchData.leaderboard.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{p.player_name}</span>
                <span className="font-bold text-white">{p.score_total}%</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleStartPlaying}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          <Swords className="w-4 h-4" /> ¡Aceptar Desafío y Jugar!
        </button>
      </div>
    );
  }

  // ── MODO JUGANDO ──────────────────────────────────────────────────────────
  if (mode === 'playing' && fakeBlock) {
    return (
      <QuizWizard
        block={fakeBlock}
        noteId={matchData?.note_id}
        onClose={() => setMode('lobby_joiner')}
        onComplete={handleDuelResult}
      />
    );
  }

  // ── MODO DONE ─────────────────────────────────────────────────────────────
  if (mode === 'done') {
    return (
      <div className="py-8 text-center space-y-4">
        <Trophy className="w-14 h-14 text-amber-400 mx-auto" />
        <h3 className="text-xl font-black text-white">¡Duelo completado!</h3>
        <p className="text-xs text-slate-400">Tu puntaje fue registrado en el ranking.</p>
        <button onClick={onBack} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer">
          Volver al Mapa
        </button>
      </div>
    );
  }

  return null;
}

import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Trophy, X, Clock, Target, RefreshCw, Medal } from 'lucide-react';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function TopicLeaderboardModal({ noteId, noteTitle, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/games/${noteId}/leaderboard`);
      setData(res.data);
    } catch (err) {
      setError('No se pudo cargar el ranking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [noteId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-slate-700 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">Ranking Global del Tema</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{noteTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaderboard}
              className="p-2 text-slate-400 hover:text-indigo-300 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Cargando ranking...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-rose-400">{error}</p>
            <button onClick={fetchLeaderboard} className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
              Reintentar
            </button>
          </div>
        ) : data?.entries?.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Aún no hay duelos completados</p>
              <p className="text-xs text-slate-400 mt-1">¡Sé el primero en crear un duelo para este tema!</p>
            </div>
          </div>
        ) : (
          <>
            {/* Podio Top 3 */}
            {data.entries.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-5">
                {/* 2do lugar */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">🥈</span>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                    <p className="text-xs font-bold text-white truncate">{data.entries[1]?.player_name}</p>
                    <p className="text-sm font-black text-slate-300">{data.entries[1]?.score}%</p>
                  </div>
                  <div className="h-12 w-full bg-slate-800/60 rounded-t-lg" />
                </div>

                {/* 1er lugar */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl animate-bounce">🥇</span>
                  <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-2 text-center min-w-[90px] shadow-lg shadow-amber-500/10">
                    <p className="text-xs font-bold text-amber-200 truncate">{data.entries[0]?.player_name}</p>
                    <p className="text-lg font-black text-amber-300">{data.entries[0]?.score}%</p>
                  </div>
                  <div className="h-20 w-full bg-amber-500/10 border-t border-amber-500/20 rounded-t-lg" />
                </div>

                {/* 3er lugar */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">🥉</span>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                    <p className="text-xs font-bold text-white truncate">{data.entries[2]?.player_name}</p>
                    <p className="text-sm font-black text-slate-300">{data.entries[2]?.score}%</p>
                  </div>
                  <div className="h-8 w-full bg-slate-800/60 rounded-t-lg" />
                </div>
              </div>
            )}

            {/* Tabla completa */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {data.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                    idx === 0
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : idx === 1
                      ? 'bg-slate-800/60 border-slate-700'
                      : idx === 2
                      ? 'bg-orange-950/10 border-orange-500/20'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <span className="w-7 text-center font-black text-sm">
                    {MEDAL[entry.rank] || `#${entry.rank}`}
                  </span>
                  <span className="flex-1 font-bold text-white truncate">{entry.player_name}</span>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-indigo-400" />
                      <span className="font-bold text-white">{entry.score}%</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      {formatTime(entry.time_spent_seconds)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {entry.accuracy_percentage}% acc
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

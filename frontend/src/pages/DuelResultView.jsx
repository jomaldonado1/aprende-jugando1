import React from 'react';
import { Trophy, Clock, Target, Swords, Crown, Star, CheckCircle, X } from 'lucide-react';

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function DuelResultView({ myResult, opponentResult, matchData, onBack }) {
  // myResult y opponentResult: { player_name, score_total, accuracy_percentage, time_spent_seconds }
  const myScore = myResult?.score_total ?? myResult?.score ?? 0;
  const opponentScore = opponentResult?.score_total ?? 0;

  const iWon = opponentResult ? myScore > opponentScore : true;
  const isDraw = opponentResult && myScore === opponentScore;

  const participants = [
    { ...myResult, label: 'Tú', isMe: true },
    ...(opponentResult ? [{ ...opponentResult, label: opponentResult.player_name, isMe: false }] : [])
  ].sort((a, b) => (b.score_total ?? b.score ?? 0) - (a.score_total ?? a.score ?? 0));

  return (
    <div className="space-y-6">
      {/* Resultado principal */}
      <div className="text-center space-y-2">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 ${
          isDraw
            ? 'bg-amber-500/20 border-amber-500/40 shadow-xl shadow-amber-500/20'
            : iWon
            ? 'bg-emerald-500/20 border-emerald-500/40 shadow-xl shadow-emerald-500/20'
            : 'bg-rose-500/20 border-rose-500/40'
        }`}>
          {isDraw
            ? <Star className="w-10 h-10 text-amber-400" />
            : iWon
            ? <Crown className="w-10 h-10 text-amber-400 animate-bounce" />
            : <Swords className="w-10 h-10 text-rose-400" />
          }
        </div>

        <div>
          <h3 className="text-2xl font-black text-white">
            {isDraw ? '¡Empate! 🤝' : iWon ? '¡Ganaste el Duelo! 🏆' : '¡Buen intento! 💪'}
          </h3>
          {matchData && (
            <p className="text-xs text-slate-400 mt-1">{matchData.note_title}</p>
          )}
        </div>
      </div>

      {/* Comparación podio */}
      <div className="grid grid-cols-1 gap-3">
        {participants.map((p, idx) => {
          const score = p.score_total ?? p.score ?? 0;
          const isWinner = idx === 0 && !isDraw;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${
                isWinner
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : p.isMe
                  ? 'bg-indigo-950/20 border-indigo-500/30'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isWinner && <span className="text-lg">🏆</span>}
                  <span className={`text-sm font-black ${isWinner ? 'text-amber-300' : 'text-white'}`}>
                    {p.label} {p.isMe && !isWinner && <span className="text-xs text-slate-400 font-normal">(tú)</span>}
                  </span>
                </div>
                <span className={`text-2xl font-black ${isWinner ? 'text-amber-300' : 'text-white'}`}>
                  {Math.round(score)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/60 rounded-xl p-2 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase">Precisión</p>
                    <p className="text-xs font-bold text-white">{p.accuracy_percentage ?? Math.round(score)}%</p>
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase">Tiempo</p>
                    <p className="text-xs font-bold text-white">{formatTime(p.time_spent_seconds)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Si no hay oponente todavía */}
      {!opponentResult && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center text-xs text-slate-400 space-y-1">
          <p>Tu puntaje fue registrado en el duelo.</p>
          <p className="text-slate-500">Cuando tu oponente juegue, podrás ver la comparación aquí.</p>
        </div>
      )}

      <button
        onClick={onBack}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
      >
        Volver al Mapa de Niveles
      </button>
    </div>
  );
}

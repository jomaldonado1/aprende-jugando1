import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import {
  CheckCircle, X, Brain, Edit3, Lightbulb, AlertTriangle,
  HelpCircle, ChevronRight, Send, ArrowRight, Zap, Clock,
  Star, Trophy, RefreshCw, MessageSquare, Eye, EyeOff, Sparkles
} from 'lucide-react';

// ─── Constantes de tiempo por tipo de pregunta ───────────────────────────────
const TIMER_SECONDS = {
  multiple_choice: 30,
  cloze: 35,
  examples: 45,
  open_ended: null,        // Sin timer
  trick_question: null,    // Sin timer
};

const BASE_SCORE = 100;
const TIME_BONUS_MULTIPLIER = 1.5; // pts extra por segundo restante

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTypeMeta(type) {
  switch (type) {
    case 'multiple_choice':
      return { label: 'Opción Múltiple', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: CheckCircle };
    case 'cloze':
      return { label: 'Completar Espacio', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Edit3 };
    case 'open_ended':
      return { label: 'Desarrollo Conceptual', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: Brain };
    case 'examples':
      return { label: 'Caso Práctico', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Lightbulb };
    case 'trick_question':
      return { label: 'Pregunta Capciosa', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: AlertTriangle };
    default:
      return { label: 'Pregunta', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: HelpCircle };
  }
}

// ─── Componente Timer Circular ────────────────────────────────────────────────
function CircularTimer({ seconds, total }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const strokeDashoffset = circumference * (1 - progress);
  const color = seconds > 10 ? '#6366f1' : seconds > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="relative text-sm font-black" style={{ color }}>{seconds}</span>
    </div>
  );
}

// ─── Componente Principal QuizWizard ─────────────────────────────────────────
export default function QuizWizard({ block, noteId, onClose, onComplete }) {
  const questions = block.questions || [];
  const total = questions.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerTotal, setTimerTotal] = useState(null);
  const [scores, setScores] = useState([]); // { questionId, score, timeBonus }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [evalError, setEvalError] = useState(null);
  const [hint, setHint] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showExpected, setShowExpected] = useState({});
  const [timedOut, setTimedOut] = useState(false);

  const timerRef = useRef(null);
  const currentQ = questions[currentIdx];

  // Inicializar timer cuando cambia la pregunta
  useEffect(() => {
    if (!currentQ || result) return;
    setAnswer('');
    setHint(null);
    setTimedOut(false);

    const secs = TIMER_SECONDS[currentQ.type];
    if (secs) {
      setTimeLeft(secs);
      setTimerTotal(secs);
    } else {
      setTimeLeft(null);
      setTimerTotal(null);
    }
  }, [currentIdx, currentQ, result]);

  // Tick del timer
  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      handleAutoAdvance();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, result]);

  const handleAutoAdvance = useCallback(() => {
    clearTimeout(timerRef.current);
    // Registrar tiempo agotado como respuesta vacía con score 0
    setScores(prev => [...prev, { questionId: currentQ.id, answer: '', score: 0, timeBonus: 0, timedOut: true }]);
    advanceQuestion('');
  }, [currentQ, currentIdx]);

  const advanceQuestion = (currentAnswer) => {
    clearTimeout(timerRef.current);
    if (currentIdx + 1 < total) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setAnimating(false);
      }, 300);
    }
    // Si es la última pregunta, el submit se maneja por handleSubmit
  };

  const handleAnswerSelect = (value) => {
    setAnswer(value);
  };

  const handleNextOrSubmit = () => {
    if (!answer.trim() && currentQ?.type !== 'multiple_choice') return;

    const secs = TIMER_SECONDS[currentQ.type];
    const timeBonus = secs && timeLeft !== null ? Math.round(timeLeft * TIME_BONUS_MULTIPLIER) : 0;
    const questionScore = answer.trim() ? BASE_SCORE : 0; // Score semántico lo calcula el backend

    const updatedScores = [...scores, {
      questionId: currentQ.id,
      answer: answer.trim(),
      score: questionScore,
      timeBonus
    }];

    setScores(updatedScores);
    clearTimeout(timerRef.current);

    if (currentIdx + 1 < total) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setAnimating(false);
      }, 300);
    } else {
      // Última pregunta → enviar al backend
      handleSubmit(updatedScores);
    }
  };

function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

  const handleSubmit = async (finalScores) => {
    setSubmitting(true);
    setEvalError(null);

    // Modo Duelo (sin block_id en la BD)
    if (!block.id) {
      const details = [];
      let totalCorrect = 0;
      for (const s of finalScores) {
        const q = questions.find(item => item.id === s.questionId);
        const usr = s.answer || '';
        const exp = q ? q.correct_answer || '' : '';
        const normUsr = normalizeText(usr);
        const normExp = normalizeText(exp);
        const isMatch = normUsr === normExp || (normUsr.length > 2 && normExp.includes(normUsr)) || (normExp.length > 2 && normUsr.includes(normExp));
        if (isMatch) totalCorrect += 1;
        details.push({
          question_id: s.questionId,
          type: q ? q.type : 'multiple_choice',
          prompt: q ? q.prompt : '',
          user_answer: usr,
          expected_answer: exp,
          is_correct: isMatch,
          score: isMatch ? 100 : 0,
          feedback: isMatch ? '¡Respuesta correcta!' : 'Respuesta registrada en el duelo.'
        });
      }

      const scorePercent = Math.round((totalCorrect / (questions.length || 1)) * 100);
      const enriched = {
        score: scorePercent,
        is_passed: scorePercent >= 60,
        details,
        time_bonuses: finalScores.reduce((acc, s) => { acc[s.questionId] = s.timeBonus || 0; return acc; }, {}),
        total_time_bonus: finalScores.reduce((acc, s) => acc + (s.timeBonus || 0), 0)
      };

      setResult(enriched);
      if (onComplete) onComplete(enriched);
      setSubmitting(false);
      return;
    }

    const payload = {
      block_id: block.id,
      answers: finalScores.map(s => ({
        question_id: s.questionId,
        selected_option: s.answer || ''
      }))
    };

    try {
      const res = await api.post('/api/quiz/submit', payload);
      const enriched = {
        ...res.data,
        time_bonuses: finalScores.reduce((acc, s) => {
          acc[s.questionId] = s.timeBonus || 0;
          return acc;
        }, {}),
        total_time_bonus: finalScores.reduce((acc, s) => acc + (s.timeBonus || 0), 0)
      };
      setResult(enriched);
      if (onComplete) onComplete(enriched);
    } catch (err) {
      setEvalError(err.response?.data?.detail || 'Error al evaluar el nivel. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetHint = async () => {
    if (hintUsed || loadingHint || !currentQ) return;
    setLoadingHint(true);
    try {
      const res = await api.post('/api/games/question-hint', {
        question_id: currentQ.id,
        prompt: currentQ.prompt,
        question_type: currentQ.type,
        correct_answer: currentQ.correct_answer
      });
      setHint(res.data.hint);
      setHintUsed(true);
    } catch (err) {
      setHint('No se pudo obtener la pista en este momento.');
      setHintUsed(true);
    } finally {
      setLoadingHint(false);
    }
  };

  const progress = ((currentIdx) / total) * 100;
  const isLastQuestion = currentIdx === total - 1;
  const canProceed = answer.trim().length > 0;
  const hasTimer = TIMER_SECONDS[currentQ?.type] !== null && TIMER_SECONDS[currentQ?.type] !== undefined;

  // ── PANTALLA DE RESULTADO ──────────────────────────────────────────────────
  if (result) {
    const totalTimeBonus = result.total_time_bonus || 0;
    const grandTotal = Math.round(result.score + totalTimeBonus * 0.1);

    return (
      <div className="space-y-5 py-2">
        <div className="text-center space-y-3">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
            result.is_passed
              ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/20'
              : 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40'
          }`}>
            {result.is_passed ? <Trophy className="w-10 h-10" /> : <X className="w-10 h-10" />}
          </div>

          <div>
            <h4 className="text-2xl font-black text-white">
              {result.is_passed ? '¡Nivel Superado! 🎉' : 'Sigue Intentándolo 💪'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">Nivel {block.level} completado</p>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Precisión</p>
              <p className="text-2xl font-black text-white mt-1">{result.score}%</p>
            </div>
            <div className="bg-indigo-950/60 p-3 rounded-2xl border border-indigo-500/30 text-center">
              <p className="text-[10px] text-indigo-400 uppercase font-bold">Bonus Velocidad</p>
              <p className="text-2xl font-black text-amber-300 mt-1">+{totalTimeBonus}</p>
            </div>
          </div>
        </div>

        {/* Desglose por pregunta */}
        {result.details && result.details.length > 0 && (
          <div className="space-y-2 pt-1">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-purple-400" />
              Retroalimentación de Gemini AI
            </h5>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {result.details.map((detail, dIdx) => (
                <div
                  key={dIdx}
                  className={`p-3 rounded-2xl border text-xs space-y-2 ${
                    detail.is_correct
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">P{dIdx + 1}</span>
                    <div className="flex items-center gap-2">
                      {result.time_bonuses?.[detail.question_id] > 0 && (
                        <span className="text-[9px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          +{result.time_bonuses[detail.question_id]} vel
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        detail.is_correct
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {detail.is_correct ? '✓' : '✗'} {detail.score}%
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-white leading-snug">{detail.prompt}</p>
                  <div className="flex items-start gap-1.5 text-indigo-300 text-[11px] bg-indigo-950/40 p-2 rounded-xl border border-indigo-500/20">
                    <MessageSquare className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                    <p>{detail.feedback}</p>
                  </div>
                  <button
                    onClick={() => setShowExpected(prev => ({ ...prev, [dIdx]: !prev[dIdx] }))}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showExpected[dIdx] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showExpected[dIdx] ? 'Ocultar respuesta' : 'Ver respuesta esperada'}
                  </button>
                  {showExpected[dIdx] && (
                    <p className="text-[11px] text-indigo-200 bg-indigo-950/40 p-2 rounded-xl border border-indigo-500/20">
                      {detail.expected_answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          Regresar al Mapa de Niveles
        </button>
      </div>
    );
  }

  // ── PANTALLA DE EVALUACIÓN / ERROR ────────────────────────────────────────
  if (submitting || evalError) {
    return (
      <div className="py-8 text-center space-y-5">
        {!evalError ? (
          <>
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 border-r-purple-500 animate-spin" />
              <Brain className="w-10 h-10 text-indigo-400 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xl font-black text-white">Evaluando Nivel</h4>
              <p className="text-sm text-indigo-200 mt-1">🧠 Gemini AI está analizando tus respuestas...</p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-14 h-14 text-rose-400 mx-auto" />
            <p className="text-xs text-rose-200 bg-rose-950/40 p-4 rounded-2xl border border-rose-500/30">{evalError}</p>
            <div className="flex gap-3">
              <button onClick={() => handleSubmit(scores)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Reintentar
              </button>
              <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer">
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── PANTALLA DE PREGUNTA ──────────────────────────────────────────────────
  if (!currentQ) return null;

  const meta = getTypeMeta(currentQ.type);
  const MetaIcon = meta.icon;
  let options = [];
  if (currentQ.type === 'multiple_choice') {
    try { options = JSON.parse(currentQ.options_json); } catch { options = []; }
  }

  return (
    <div className={`space-y-5 transition-all duration-300 ${animating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
      {/* Barra de progreso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Pregunta {currentIdx + 1} de {total}</span>
          <span className="text-indigo-300 font-bold">{Math.round(progress)}% completado</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Cabecera de pregunta */}
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border flex items-center gap-1 ${meta.color}`}>
          <MetaIcon className="w-3 h-3" />
          {meta.label}
        </span>

        {/* Timer circular */}
        {hasTimer && timeLeft !== null && (
          <CircularTimer seconds={timeLeft} total={timerTotal} />
        )}
        {!hasTimer && (
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Sin límite de tiempo
          </span>
        )}
      </div>

      {/* Enunciado */}
      <p className="text-base font-bold text-white leading-snug">{currentQ.prompt}</p>

      {/* Pista de IA */}
      {hint && (
        <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p><span className="font-bold text-amber-300">Pista socrática:</span> {hint}</p>
        </div>
      )}

      {/* Input según tipo */}
      <div>
        {currentQ.type === 'multiple_choice' && (
          <div className="space-y-2">
            {options.map((opt, oIdx) => (
              <button
                key={oIdx}
                onClick={() => handleAnswerSelect(opt)}
                className={`w-full p-3 rounded-xl text-xs font-medium text-left transition-all border cursor-pointer ${
                  answer === opt
                    ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentQ.type === 'cloze' && (
          <input
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Escribe la palabra faltante que reemplaza '___'..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        )}

        {(currentQ.type === 'open_ended' || currentQ.type === 'examples' || currentQ.type === 'trick_question') && (
          <textarea
            rows={3}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={
              currentQ.type === 'examples'
                ? 'Menciona un ejemplo o caso de uso práctico...'
                : currentQ.type === 'trick_question'
                ? 'Identifica el malentendido o trampa habitual...'
                : 'Explica brevemente tu respuesta conceptual...'
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            autoFocus
          />
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        {/* Comodín pista */}
        <button
          onClick={handleGetHint}
          disabled={hintUsed || loadingHint}
          title={hintUsed ? 'Ya usaste tu pista' : 'Pedir pista a Gemini AI (1 por partida)'}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            hintUsed
              ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {loadingHint
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />
          }
          {hintUsed ? 'Pista usada' : '💡 Pedir Pista'}
        </button>

        {/* Botón avanzar / enviar */}
        <button
          onClick={handleNextOrSubmit}
          disabled={!canProceed}
          className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {isLastQuestion ? (
            <><Send className="w-4 h-4" /> Enviar y Evaluar</>
          ) : (
            <><ArrowRight className="w-4 h-4" /> Siguiente</>
          )}
        </button>
      </div>

      {timedOut && (
        <p className="text-xs text-amber-400 text-center">⏱️ Tiempo agotado — avanzando automáticamente...</p>
      )}
    </div>
  );
}

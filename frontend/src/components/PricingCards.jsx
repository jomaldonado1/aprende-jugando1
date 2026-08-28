import React, { useState } from 'react';
import { X, Sparkles, Check, Zap, Crown, ShieldAlert, CreditCard } from 'lucide-react';

export default function PricingCards({ onClose }) {
  const [toastMessage, setToastMessage] = useState('');

  const handleBuy = (planName) => {
    setToastMessage(`Integración con pasarela de pagos en desarrollo (${planName}).`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      
      {/* Toast Alert Notice */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-amber-500/50 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="glass-panel w-full max-w-5xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/90 border border-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Membresías y Créditos IA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Desbloquea el poder completo de la <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">IA Educativa</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Pasa de las demos gratuitas a generar juegos de estudio ilimitados para tus materias con cualquier archivo o tema.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CARD 1: PLAN BASE */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                  <Zap className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                  Estudiante
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white">Plan Base</h3>
              <p className="text-xs text-slate-400 mt-1 min-h-[36px]">"El salvavidas para el parcial"</p>

              <div className="my-5">
                <span className="text-3xl font-black text-white">$4.99</span>
                <span className="text-xs text-slate-400 font-medium"> / mes</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>15 Generaciones</strong> de juegos al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Apuntes cortos (.txt, .docx)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Feedback semántico con IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Acceso a las 3 Demos Gratuita</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleBuy('Plan Base')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4 text-blue-400" />
              Comprar Plan Base
            </button>
          </div>

          {/* CARD 2: PLAN PRO (FEATURED) */}
          <div className="glass-card p-6 rounded-3xl border-2 border-purple-500/80 bg-gradient-to-b from-purple-950/30 to-slate-900/90 flex flex-col justify-between shadow-2xl shadow-purple-500/20 relative scale-105">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg">
              MÁS POPULAR ⭐
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-1">
                <span className="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-md border border-purple-500/30">
                  Recomendado
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white">Plan Pro</h3>
              <p className="text-xs text-slate-300 mt-1 min-h-[36px]">"El compañero de carrera"</p>

              <div className="my-5">
                <span className="text-3xl font-black text-white">$9.99</span>
                <span className="text-xs text-slate-400 font-medium"> / mes</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span><strong>50 Generaciones</strong> de juegos al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Lectura de PDFs largos y escaneados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Historial guardado & análisis de avance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Soporte técnico prioritario</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleBuy('Plan Pro')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Comprar Plan Pro
            </button>
          </div>

          {/* CARD 3: PLAN MASTER */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                  <Crown className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                  Pro / Grupal
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white">Plan Master</h3>
              <p className="text-xs text-slate-400 mt-1 min-h-[36px]">"Grupos y estudio intensivo"</p>

              <div className="my-5">
                <span className="text-3xl font-black text-white">$19.99</span>
                <span className="text-xs text-slate-400 font-medium"> / mes</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>150 Generaciones</strong> de juegos al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Organización en carpetas temáticas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Links públicos multijugador</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Exportación masiva de cuestionarios</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleBuy('Plan Master')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              Comprar Plan Master
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

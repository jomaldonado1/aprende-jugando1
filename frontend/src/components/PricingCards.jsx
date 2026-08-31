import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Check, Zap, Crown, ShieldAlert, CreditCard, MessageSquare, Building } from 'lucide-react';

export default function PricingCards({ onClose }) {
  const { user } = useAuth();
  const [selectedPlanForTransfer, setSelectedPlanForTransfer] = useState(null);

  const handleWhatsAppTransfer = (planName) => {
    const email = user?.email || 'mi usuario';
    const text = encodeURIComponent(`Hola! Quiero abonar el ${planName} para mi usuario: ${email}. ¿Me pasas los datos para transferencia?`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleMercadoPago = (planName, link) => {
    window.open(link || 'https://www.mercadopago.com.ar', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      
      {/* Modal Transfer Details */}
      {selectedPlanForTransfer && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-emerald-500/40 space-y-4 relative text-center">
            <button
              onClick={() => setSelectedPlanForTransfer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Building className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white">Pago por Transferencia</h3>
            <p className="text-xs text-slate-400">
              Transferí el monto del <strong className="text-emerald-400">{selectedPlanForTransfer}</strong> a nuestros datos bancarios y envíanos el comprobante por WhatsApp para la activación inmediata:
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2 font-mono">
              <p className="text-slate-400"><span className="text-slate-500">ALIAS:</span> <strong className="text-emerald-300">aprende.jugando.mp</strong></p>
              <p className="text-slate-400"><span className="text-slate-500">CBU / CVU:</span> <strong className="text-emerald-300">0000003100012345678901</strong></p>
              <p className="text-slate-400"><span className="text-slate-500">TITULAR:</span> <strong className="text-white">Aprende Jugando IA</strong></p>
            </div>

            <button
              onClick={() => handleWhatsAppTransfer(selectedPlanForTransfer)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Enviar Comprobante por WhatsApp
            </button>
          </div>
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
            Elige Mercado Pago o Transferencia Bancaria para activar tu plan al instante.
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
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleMercadoPago('Plan Base', 'https://mpago.la/pos/base')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pagar con Mercado Pago
              </button>
              <button
                onClick={() => setSelectedPlanForTransfer('Plan Base ($4.99)')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Building className="w-4 h-4 text-emerald-400" />
                Transferencia / WhatsApp
              </button>
            </div>
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
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleMercadoPago('Plan Pro', 'https://mpago.la/pos/pro')}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pagar con Mercado Pago
              </button>
              <button
                onClick={() => setSelectedPlanForTransfer('Plan Pro ($9.99)')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Building className="w-4 h-4 text-emerald-400" />
                Transferencia / WhatsApp
              </button>
            </div>
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
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleMercadoPago('Plan Master', 'https://mpago.la/pos/master')}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pagar con Mercado Pago
              </button>
              <button
                onClick={() => setSelectedPlanForTransfer('Plan Master ($19.99)')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Building className="w-4 h-4 text-emerald-400" />
                Transferencia / WhatsApp
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

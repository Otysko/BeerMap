/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, Award, MapPin, Beer, ShieldCheck, Sparkles } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/35 rounded-3xl p-7 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
 
        {/* Header Illustration */}
        <div className="text-center space-y-2 mt-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-bounce mb-2">
            <Beer className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-black text-amber-500 tracking-tight">
            Vítej v České pivní mapě! 🍺
          </h2>
          <p className="text-xs text-slate-450 max-w-sm mx-auto leading-relaxed">
            Tvůj rychlý interaktivní průvodce po českých výčepech a čepovaných pivech.
          </p>
        </div>
 
        {/* Value Propositions / Quick Guide */}
        <div className="mt-6 space-y-3.5">
          
          <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/40 border border-slate-850/60 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Objevuj na mapě 🗺️
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Filtruj hospody podle vzdálenosti, ceny nebo značky piv na čepu.
              </p>
            </div>
          </div>
 
          <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/40 border border-slate-850/60 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Tvůj Pivní Pas 🏆
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Zapisuj si vypitá piva přímo v navštívených hospodách a odemykej ocenění.
              </p>
            </div>
          </div>
 
          <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/40 border border-slate-850/60 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Virtuální AI Sládek 🤖
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Zeptej se našeho chatu, kam vyrazit dle tvých aktuálních pivních chutí.
              </p>
            </div>
          </div>
 
          <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/40 border border-slate-850/60 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Komunitní správa ✍️
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Udržuj informace živé. Přidávej piva, hospody nebo nahlas přítomnou chybu jedním klikem.
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="mt-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl text-sm font-black font-display uppercase tracking-wide cursor-pointer transition shadow-lg hover:shadow-xl hover:shadow-amber-500/10 transform hover:-translate-y-0.5"
          >
            Vstoupit do mapy 🍻
          </button>
          
          <div className="text-center mt-3 text-[10px] text-slate-500 font-mono">
            Vytvořeno s láskou k českému pivu • Na zdraví!
          </div>
        </div>

      </div>
    </div>
  );
}

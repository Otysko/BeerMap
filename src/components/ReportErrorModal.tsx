/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Pub, UserProfile } from "../types";
import { X, Send, Mail, CheckCircle, ShieldAlert, AlertTriangle } from "lucide-react";

interface ReportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pub: Pub;
  userProfile: UserProfile | null;
}

const CATEGORIES = [
  "Nesprávné / neaktuální ceny piv 🍺",
  "Nějaké pivo na čepu chybí nebo přebývá",
  "Hospoda je trvale uzavřena ❌",
  "Špatná poloha nebo adresa na mapě 📍",
  "Chybný název nebo popis hospody",
  "Jiný problém / nahlášení nesprávných údajů ⚠️"
];

export default function ReportErrorModal({ isOpen, onClose, pub, userProfile }: ReportErrorModalProps) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // Reset modal state when opened or pub changes
  React.useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setDescription("");
      setError("");
      setCategory(CATEGORIES[0]);
      setEmail(userProfile?.email || "");
      setName(userProfile?.name || "");
    }
  }, [isOpen, pub.id, userProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Zadejte prosím podrobnější popis chyby.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId: pub.id,
          pubName: pub.name,
          category,
          description: description.trim(),
          userEmail: email.trim() || "Anonymní",
          userName: name.trim() || "Anonymní",
        }),
      });

      if (!response.ok) throw new Error("Nepodařilo se nahlásit chybu na serveru.");

      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Něco se nepovedlo. Hlášení se nepodařilo odeslat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/35 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-display font-bold text-amber-500">
              Nahlásit chybu v údajích
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-350 leading-relaxed flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                Nalezli jste v hospodě <strong>{pub.name}</strong> nesprávné informace? Vyberte kategorii, popište problém a hlášení uložte. Administrátor bude okamžitě informován a údaje ověří.
              </div>
            </div>

            {error && (
              <p className="bg-red-550/10 border border-red-500/25 p-3 rounded-xl text-xs text-red-400">
                {error}
              </p>
            )}

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                Co je v hospodě špatně?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer text-slate-200"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                Popište prosím skutečný stav *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Např. Plzeň již nestojí 59 Kč, ale zdražili na 65 Kč. Nebo Radegast 12° byl nahrazen Radegastem Ryze Hořká 12°..."
                rows={4}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm placeholder:text-slate-650 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none text-slate-200"
              />
            </div>

            {/* Optional contact fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                  Vaše jméno (dobrovolné)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="např. Pivní fajnšmekr"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">
                  Váš e-mail (dobrovolný)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pivo@priklad.cz"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-slate-200"
                />
              </div>
            </div>

            {/* Submit buttons */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-black uppercase tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
              {loading ? "Odesílám..." : "Odeslat hlášení"}
            </button>
          </form>
        ) : (
          /* Success Screen */
          <div className="space-y-5 text-center py-6 animate-pulseOnce">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-slate-150 font-display">
                Hlášení bylo úspěšně uloženo!
              </h4>
              <p className="text-xs text-slate-350 max-w-sm mx-auto leading-relaxed">
                Oprava byla bezpečně zaznamenána do naší databáze. Zároveň se na pozadí <strong>automaticky odeslal e-mail</strong> přímo Davidovi pro co nejrychlejší vyřízení. Děkujeme za pomoc s vylepšováním mapy hospod! 🍺
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Zavřít okno
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

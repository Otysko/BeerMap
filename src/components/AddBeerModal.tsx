/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Beer } from "../types";
import { Sparkles, Loader2, Save, X, Beer as BeerIcon, HelpCircle } from "lucide-react";

interface AddBeerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (beerData: {
    id?: string;
    name: string;
    degrees: string;
    price: number;
    style?: string;
    brewery?: string;
    description?: string;
  }) => Promise<void>;
  editingBeer: Beer | null;
}

export default function AddBeerModal({
  isOpen,
  onClose,
  onSubmit,
  editingBeer,
}: AddBeerModalProps) {
  const [name, setName] = useState("");
  const [degrees, setDegrees] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [style, setStyle] = useState("Světlý ležák");
  const [brewery, setBrewery] = useState("");
  const [description, setDescription] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync state if editing
  useEffect(() => {
    if (editingBeer) {
      setName(editingBeer.name);
      setDegrees(editingBeer.degrees);
      setPrice(editingBeer.price);
      setStyle(editingBeer.style || "Světlý ležák");
      setBrewery(editingBeer.brewery || "");
      setDescription(editingBeer.description || "");
    } else {
      setName("");
      setDegrees("");
      setPrice("");
      setStyle("Světlý ležák");
      setBrewery("");
      setDescription("");
    }
    setAiError("");
  }, [editingBeer, isOpen]);

  if (!isOpen) return null;

  // AI Autocomplete trigger
  const handleAiAutocomplete = async () => {
    if (!name.trim()) {
      setAiError("Nejdříve zadejte název piva (např. Radegast, Budvar).");
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("/api/gemini/beer-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beerName: name.trim() }),
      });

      if (!response.ok) throw new Error("Chyba při komunikaci s AI.");
      const data = await response.json();

      if (data) {
        if (data.name) setName(data.name);
        if (data.degrees) setDegrees(data.degrees);
        if (data.style) setStyle(data.style);
        if (data.brewery) setBrewery(data.brewery);
        if (data.notes) {
          setDescription(data.notes);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAiError("Nepodařilo se automaticky doplnit údaje. Zadejte je prosím ručně.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === "") return;

    setSaveLoading(true);
    try {
      // Automatically add "°" if the user entered raw digits or decimal numbers and didn't include "°"
      let formattedDegrees = degrees.trim();
      if (formattedDegrees && /^\d+(\.\d+)?$/.test(formattedDegrees)) {
        formattedDegrees = `${formattedDegrees}°`;
      }

      await onSubmit({
        id: editingBeer?.id,
        name: name.trim(),
        degrees: formattedDegrees,
        price: Number(price),
        style,
        brewery: brewery.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl animate-scaleIn">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-slate-905 to-slate-900 px-6 py-4 border-b border-slate-800/80">
          <h2 className="text-lg font-display font-bold text-amber-500 flex items-center gap-2">
            <BeerIcon className="w-5 h-5 text-amber-500" />
            {editingBeer ? "Upravit pivo" : "Přidat čepované pivo"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          
          {/* Beer Name + AI suggestion action */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Název piva <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Např. Pilsner Urquell, Kozel..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-550"
              />
              <button
                type="button"
                onClick={handleAiAutocomplete}
                disabled={aiLoading || !name.trim()}
                className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 hover:text-slate-950 font-bold text-xs rounded-xl transition duration-200 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-amber-500/10"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Doplnit s AI
              </button>
            </div>
            {aiError && (
              <p className="text-red-400 text-xs mt-1 animate-slideDown">{aiError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Degrees */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Stupňovitost (EPM)
              </label>
              <input
                type="text"
                placeholder="Např. 12°, 11.5°, 10°"
                value={degrees}
                onChange={(e) => setDegrees(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-100"
              />
              <p className="text-[10px] text-slate-400">Tradiční hustota mladiny.</p>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Cena (Kč za půllitr) <span className="text-red-400">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  placeholder="Např. 58"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl pl-3 pr-8 py-2 text-sm text-slate-100"
                />
                <span className="absolute right-3 text-xs text-slate-400 font-semibold">Kč</span>
              </div>
              <p className="text-[10px] text-slate-400">Kolik stojí jedno orosené.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Style */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Pivní styl (druh)
              </label>
              <input
                type="text"
                placeholder="Např. Světlý ležák, IPA, APA, Tmavé"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-100"
              />
            </div>

            {/* Brewery */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Pivovar / Výrobce
              </label>
              <input
                type="text"
                placeholder="Např. Plzeňský Prazdroj, Bernard"
                value={brewery}
                onChange={(e) => setBrewery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Chuť nebo poznámka (volitelné)
            </label>
            <textarea
              placeholder="Např. Hořké, hutná smetanová pěna, čepované z tanku..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-18 resize-none bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-100"
            />
          </div>

          {/* Prompt/Guide */}
          <div className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <strong>Tip sládka:</strong> Tlačítko <strong className="text-emerald-400">Doplnit s AI</strong> využívá model 
              Gemini ke stažení typických hodnot. Stačí napsat název (třeba <em>"Kozel 11"</em>, <em>"Radegast Ryze Hořká"</em>) a kliknout!
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saveLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Zpět
            </button>
            <button
              type="submit"
              disabled={saveLoading || !name.trim() || price === ""}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm rounded-xl transition cursor-pointer"
            >
              {saveLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingBeer ? "Uložit změny" : "Natočit do lístku"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Pub, Beer, UserProfile } from "../types";
import { Plus, Trash2, Edit3, X, MapPin, Beer as BeerIcon, Calendar, HardDrive, DollarSign, PenTool, Check, Award, Sparkles, Navigation, CheckCircle2, ShieldAlert } from "lucide-react";

interface PubDetailsProps {
  pub: Pub | null;
  onClose: () => void;
  onAddBeerClick: () => void;
  onEditBeerClick: (beer: Beer) => void;
  onDeleteBeer: (beerId: string) => Promise<void>;
  onDeletePub: (pubId: string) => Promise<void>;
  onUpdatePubDetails: (pubId: string, updatedFields: Partial<Pub>) => Promise<void>;
  userLocation?: { lat: number; lng: number } | null;
  userProfile: UserProfile | null;
  onLogVisit: (pubId: string, pubName: string, beer: Beer | null) => Promise<void>;
  onOpenPassportClick: () => void;
  onOpenLoginClick: () => void;
  onSimulateLocation: (lat: number, lng: number) => void;
}

export default function PubDetails({
  pub,
  onClose,
  onAddBeerClick,
  onEditBeerClick,
  onDeleteBeer,
  onDeletePub,
  onUpdatePubDetails,
  userLocation,
  userProfile,
  onLogVisit,
  onOpenPassportClick,
  onOpenLoginClick,
  onSimulateLocation,
}: PubDetailsProps) {
  const [isEditingPub, setIsEditingPub] = useState(false);
  const [editName, setEditName] = useState("");
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);

  // Helper to calculate distance in km using Haversine formula
  const calculateDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Human-readable Czech distance formatter
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`.replace(".", ",");
  };
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);
  const [deletingBeerId, setDeletingBeerId] = useState<string | null>(null);

  // Trigger pub editing modes
  const handleStartEditPub = () => {
    if (!pub) return;
    setEditName(pub.name);
    setEditAddress(pub.address || "");
    setEditNotes(pub.notes || "");
    setIsEditingPub(true);
  };

  const handleSavePubEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pub || !editName.trim()) return;

    try {
      await onUpdatePubDetails(pub.id, {
        name: editName.trim(),
        address: editAddress.trim(),
        notes: editNotes.trim(),
      });
      setIsEditingPub(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (!pub) return null;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-l border-amber-500/30 text-slate-100 shadow-2xl overflow-y-auto scrollbar-thin">
      
      {/* Pub Header Banner */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-amber-600/20 via-amber-750/5 to-slate-900 border-b border-amber-500/30">
        <div className="flex justify-between items-start gap-2">
          {!isEditingPub ? (
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold text-amber-500 tracking-tight leading-tight">
                {pub.name}
              </h2>
              <div className="flex flex-col gap-1 text-slate-400 text-xs">
                {pub.address && (
                  <p className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 mr-1 flex-shrink-0" />
                    {pub.address}
                  </p>
                )}
                {userLocation && (
                  <p className="flex items-center text-amber-500 font-semibold font-mono bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/10 w-fit text-[10.5px] mt-1">
                    📍 Moje poloha: {formatDistance(calculateDistanceInKm(userLocation.lat, userLocation.lng, pub.lat, pub.lng))}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full mr-2">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest block mb-1">
                Upravit hospodu
              </span>
            </div>
          )}

          {/* Close Panel button */}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notes display */}
        {!isEditingPub && pub.notes && (
          <p className="text-slate-300 text-xs mt-3 bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 leading-relaxed italic">
            "{pub.notes}"
          </p>
        )}

        {/* Action Controls for Pub Header */}
        {!isEditingPub && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleStartEditPub}
              className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-amber-500 text-xs font-semibold rounded-xl border border-slate-800/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Upravit údaje
            </button>

            {isDeletingConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-red-400 font-bold">Opravdu smazat?</span>
                <button
                  onClick={async () => {
                    await onDeletePub(pub.id);
                    setIsDeletingConfirm(false);
                  }}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Ano
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(false)}
                  className="px-2 py-1 bg-slate-805 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition cursor-pointer"
                >
                  Ne
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsDeletingConfirm(true)}
                className="px-3 py-1.5 bg-slate-850 hover:bg-red-950/40 text-slate-400 hover:text-red-400 text-xs font-semibold rounded-xl border border-slate-800/80 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Odstranit hospodu
              </button>
            )}
          </div>
        )}

        {/* ==================================== */}
        {/* 🏆 PIVNÍ PAS CHECK-IN / ACCESS BLOCK */}
        {/* ==================================== */}
        {!isEditingPub && (
          <div className="mt-4 pt-4 border-t border-amber-500/15">
            {!userProfile ? (
              // Case 1: User not logged in
              <div className="bg-slate-950/70 p-3.5 border border-amber-500/25 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 animate-pulse">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-grow space-y-0.5 overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-200 font-display leading-none">
                    Chceš si zapsat návštěvu?
                  </h4>
                  <p className="text-[10px] text-slate-450 leading-tight">
                    Přihlas se a odemykej až 20 pivních úspěchů!
                  </p>
                </div>
                <button
                  onClick={onOpenLoginClick}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-[11px] font-black font-display uppercase tracking-wide cursor-pointer transition shadow-sm hover:shadow-md"
                >
                  Přihlásit
                </button>
              </div>
            ) : (() => {
              // Case 2: User logged in. Calculate distance
              const distKm = userLocation ? calculateDistanceInKm(userLocation.lat, userLocation.lng, pub.lat, pub.lng) : null;
              const distM = distKm !== null ? Math.round(distKm * 1000) : null;
              const isNearby = distM !== null && distM <= 200;

              if (!isNearby) {
                return (
                  <div className="bg-slate-950/70 p-3.5 border border-red-500/20 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-grow space-y-1">
                        <h4 className="text-xs font-bold text-slate-200 font-display">
                          Příliš daleko pro zápis
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Zapisovat piva lze jen v dosahu do 200 m (z domova to nejde!). Aktuální vzdálenost:{" "}
                          <span className="font-bold text-red-400">
                            {distM !== null ? `${distM} m` : "neznámá (zapni GPS)"}
                          </span>.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Case 3: User logged in AND nearby (within 200m)
              return (
                <div className="bg-slate-950/70 p-3.5 border border-emerald-500/20 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 animate-bounce">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-grow space-y-0.5">
                      <h4 className="text-xs font-bold text-emerald-400 font-display">
                        Jsi na místě! (v dosahu {distM} m)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Zapiš si dnešní návštěvu do pasu, nebo si "vypij" jednotlivé kousky níže!
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={isLoggingVisit}
                      onClick={async () => {
                        setIsLoggingVisit(true);
                        try {
                          await onLogVisit(pub.id, pub.name, null); // Log pure visit
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsLoggingVisit(false);
                        }
                      }}
                      className="w-full px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingVisit ? "Ukládám..." : "Zapsat samotnou návštěvu"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Editing Form for Pub Header */}
      {isEditingPub && (
        <form onSubmit={handleSavePubEdit} className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Název hospody</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Adresa / Lokace</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white animate-fadeIn"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Poznámka / Charakteristika</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full h-14 resize-none bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingPub(false)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={!editName.trim()}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1 shadow-lg shadow-amber-500/10"
            >
              <Check className="w-3.5 h-3.5" /> Uložit údaje
            </button>
          </div>
        </form>
      )}

      {/* Beers List Section */}
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-display font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <BeerIcon className="w-4 h-4 text-amber-500" />
            Čepovaná piva ({pub.beers.length})
          </h3>
          <button
            onClick={onAddBeerClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 hover:text-slate-950 text-slate-950 text-xs font-bold rounded-xl transition duration-200 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 ring-1 ring-slate-950 rounded-full" /> Nahlásit pivo
          </button>
        </div>

        {/* Beers display Cards */}
        {pub.beers.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-950/30 border border-dashed border-amber-500/15 rounded-2xl space-y-3 animate-fadeIn">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <BeerIcon className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-slate-300 font-medium text-sm">Na tomto čepu nic neteče</p>
            <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              Pomozte ostatním pivařům! Přidejte pivo, které se v této hospodě čepuje, jeho stupně a cenu za půllitr.
            </p>
            <button
              onClick={onAddBeerClick}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-amber-500 border border-amber-500/20 text-xs font-semibold rounded-xl hover:bg-amber-500 hover:text-slate-950 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Přidat první pivo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pub.beers.map((beer) => (
              <div 
                key={beer.id} 
                className="group relative bg-slate-950 border border-amber-500/15 hover:border-amber-500/35 rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/[0.02]"
              >
                
                {/* Style badge + Degree Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/10">
                    {beer.degrees}
                  </span>
                  {beer.style && (
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      {beer.style}
                    </span>
                  )}
                </div>

                {/* Beer Name + price row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-slate-100 group-hover:text-amber-500 transition-colors">
                      {beer.name}
                    </h4>
                    {beer.brewery && (
                      <p className="text-slate-500 text-[11px] font-medium leading-tight">
                        Pivovar: {beer.brewery}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-amber-500 text-lg font-bold font-mono">
                      {beer.price} <span className="text-xs text-slate-400 font-sans">Kč</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block -mt-1 uppercase tracking-wider font-semibold">půllitr</span>
                  </div>
                </div>

                {/* Description notes */}
                {beer.description && (
                  <p className="text-slate-450 text-[11px] mt-2 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-900">
                    {beer.description}
                  </p>
                )}

                {/* Edit & Delete hover Controls */}
                <div className="flex gap-2 justify-end mt-3 pt-2 border-t border-amber-500/15">
                  {userProfile && (
                    <button
                      disabled={isLoggingVisit}
                      onClick={async () => {
                        const distKm = userLocation ? calculateDistanceInKm(userLocation.lat, userLocation.lng, pub.lat, pub.lng) : null;
                        const distM = distKm !== null ? Math.round(distKm * 1000) : null;
                        if (distM === null || distM > 200) {
                          alert(`Tento kousek si můžeš zapsat jen přímo v hospodě (do 200 m). Aktuálně jsi ve vzdálenosti: ${distM !== null ? `${distM} m` : "neznámé"}. Přijď blíž a dej si jedno točené! 🍻`);
                          return;
                        }
                        setIsLoggingVisit(true);
                        try {
                          await onLogVisit(pub.id, pub.name, beer);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsLoggingVisit(false);
                        }
                      }}
                      className="p-1 px-2.5 text-[11px] text-amber-500 hover:text-slate-950 hover:bg-amber-500 rounded-lg transition mr-auto flex items-center gap-1 cursor-pointer font-bold border border-amber-500/30 disabled:opacity-50"
                    >
                      <BeerIcon className="w-3.5 h-3.5" /> Vypil jsem 🍺
                    </button>
                  )}
                  <button
                    onClick={() => onEditBeerClick(beer)}
                    className="p-1 px-2.5 text-xs text-slate-400 hover:text-amber-500 hover:bg-slate-900 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Upravit
                  </button>
                  {deletingBeerId === beer.id ? (
                    <div className="flex items-center gap-1.5 animate-fadeIn">
                      <span className="text-[10px] text-red-400 font-semibold">Opravdu?</span>
                      <button
                        onClick={async () => {
                          await onDeleteBeer(beer.id);
                          setDeletingBeerId(null);
                        }}
                        className="p-1 px-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Ano
                      </button>
                      <button
                        onClick={() => setDeletingBeerId(null)}
                        className="p-1 px-2 bg-slate-800 text-slate-300 text-[10px] rounded-lg hover:bg-slate-705 transition cursor-pointer"
                      >
                        Ne
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingBeerId(beer.id)}
                      className="p-1 px-2.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Smazat
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Panel Footer detailing Beer degrees */}
      <div className="bg-slate-950 px-6 py-4 border-t border-amber-500/20 text-[11px] text-slate-400">
        <div className="flex justify-between items-center">
          <span className="italic flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            Aktualizováno: {pub.updatedAt ? new Date(pub.updatedAt).toLocaleDateString("cs-CZ") : "Zatím neaktualizováno"}
          </span>
          <span className="font-mono text-slate-500">
            ID: {pub.id}
          </span>
        </div>
      </div>

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { X, RefreshCw, ClipboardList, AlertTriangle, CheckCircle2, Trash2, Calendar, User, Eye, EyeOff } from "lucide-react";

interface Report {
  id: string;
  pubId: string;
  pubName: string;
  category: string;
  description: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  status: string;
}

interface AdminReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
  reports: Report[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onResolve: (id: string, newStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelectPub?: (pubId: string) => void;
}

export default function AdminReportsModal({
  isOpen,
  onClose,
  adminEmail,
  reports,
  loading,
  error,
  onRefresh,
  onResolve,
  onDelete,
  onSelectPub,
}: AdminReportsModalProps) {
  const [filter, setFilter] = useState<"all" | "new" | "resolved">("new");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredReports = [...reports]
    .filter((r) => {
      const isResolved = r.status === "Vyřešeno";
      if (filter === "new") return !isResolved;
      if (filter === "resolved") return isResolved;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const totalNewCount = reports.filter((r) => r.status !== "Vyřešeno").length;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/35 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/85">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 relative">
              <ClipboardList className="w-6 h-6" />
              {totalNewCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-extrabold rounded-full text-[9px] w-5 h-5 flex items-center justify-center animate-bounce border border-slate-950">
                  {totalNewCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-display font-black text-amber-500 uppercase tracking-wide">
                Nahlášené chyby v mapě 🛠️
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Vítej v administraci, {adminEmail} • Přijato celkem {reports.length} hlášení
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar / Stats bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-slate-800/40">
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setFilter("new")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "new"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Nevyřešené ({totalNewCount})
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "resolved"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Vyřešené ({reports.length - totalNewCount})
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "all"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Všechny ({reports.length})
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-2 text-xs font-bold bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/35 rounded-xl text-amber-500 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Aktualizovat seznam</span>
          </button>
        </div>

        {/* Main List */}
        <div className="flex-grow overflow-y-auto py-4 pr-1 scrollbar-thin space-y-3.5">
          {error && (
            <p className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl text-xs font-medium font-sans">
              {error}
            </p>
          )}

          {loading && filteredReports.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 gap-2 animate-pulse">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <span className="text-xs font-mono">Stahuji čerstvá hlášení z databáze...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-850 rounded-3xl p-6">
              <span className="text-3xl mb-2">🎉</span>
              <p className="text-sm font-bold text-slate-300">Žádná hlášení k zobrazení!</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                {filter === "new"
                  ? "Všechny nahlášené nesrovnalosti jsou v tuto chvíli kompletně vyřešeny. Skvělá práce!"
                  : "V tomto filtru se nenacházejí žádné záznamy."}
              </p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const isResolved = report.status === "Vyřešeno";
              const dateObj = new Date(report.createdAt);
              const formattedDate = !isNaN(dateObj.getTime())
                ? `${dateObj.toLocaleDateString("cs-CZ")} o ${dateObj.toLocaleTimeString("cs-CZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Neznámý čas";

              return (
                <div
                  key={report.id}
                  className={`p-4 border rounded-2xl flex flex-col gap-3 transition-all duration-300 ${
                    isResolved
                      ? "bg-slate-950/20 border-slate-900 opacity-60"
                      : "bg-slate-950 border-amber-500/20 hover:border-amber-500/35 shadow-md shadow-amber-550/[0.01]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-amber-500 flex items-center gap-1.5 uppercase tracking-wide leading-none">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {report.category}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Záznam ID: {report.id}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border leading-none select-none ${
                        isResolved
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          : "bg-red-500/10 text-red-500 border-red-500/25 animate-pulse"
                      }`}
                    >
                      {report.status || "Nové"}
                    </span>
                  </div>

                  {/* Body description */}
                  <p className="text-xs text-slate-200 bg-slate-900/40 p-3 rounded-xl border border-slate-850 font-sans leading-relaxed break-words whitespace-pre-wrap">
                    {report.description}
                  </p>

                  {/* Pub & Reporter details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-850/60 font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 overflow-hidden w-full">
                        <strong className="text-slate-500 shrink-0">Hospodský čep:</strong>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectPub) {
                              onSelectPub(report.pubId);
                              onClose();
                            }
                          }}
                          title="Ukázat tuto hospodu na mapě"
                          className="text-amber-500 font-extrabold hover:text-amber-400 hover:underline transition cursor-pointer text-left truncate shrink-0"
                        >
                          {report.pubName}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-500 shrink-0">Identifikátor:</strong>
                        <span className="text-slate-300">{report.pubId}</span>
                      </div>
                    </div>
                    <div className="space-y-1 md:border-l md:border-slate-850/65 md:pl-3">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-500 shrink-0">Ohlašovatel:</strong>
                        <span className="text-slate-300 truncate font-sans">
                          {report.userName || "Uživatel"} ({report.userEmail})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-500 shrink-0">Datum podání:</strong>
                        <span className="text-slate-400 font-sans">{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Control / Actions row */}
                  <div className="flex justify-end items-center gap-2 pt-1 border-t border-slate-850/50 mt-1 min-h-[36px]">
                    {deleteConfirmId !== report.id && (
                      !isResolved ? (
                        <button
                          onClick={() => onResolve(report.id, "Vyřešeno")}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
                        >
                          <span>Označit za vyřešené</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onResolve(report.id, "Nové")}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Obnovit hlášení</span>
                        </button>
                      )
                    )}

                    {deleteConfirmId === report.id ? (
                      <div className="flex items-center gap-1.5 animate-fadeIn">
                        <span className="text-[10px] text-red-500 font-bold font-sans">Opravdu smazat?</span>
                        <button
                          onClick={() => {
                            onDelete(report.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer"
                        >
                          Ano
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-850 hover:bg-slate-750 text-slate-300 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer"
                        >
                          Ne
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(report.id)}
                        className="p-1.5 bg-slate-950 hover:bg-red-950/40 border border-slate-850 hover:border-red-500/25 text-slate-500 hover:text-red-400 rounded-xl transition cursor-pointer"
                        title="Smazat report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info lock */}
        <div className="text-center mt-auto pt-3 border-t border-slate-850/70 text-[9.5px] text-slate-550 font-mono">
          Systém správy hlášení chyb v reálném čase • Administrátor Pivní Mapy ČR
        </div>

      </div>
    </div>
  );
}

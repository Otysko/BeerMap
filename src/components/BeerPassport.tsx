import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  MapPin, 
  Beer, 
  Calendar, 
  Award, 
  Trash2, 
  Sparkles, 
  LogOut, 
  History, 
  ClipboardList,
  Flame,
  GlassWater,
  Home,
  Map,
  Compass,
  Shuffle,
  Trees,
  Moon,
  Globe,
  Crown,
  MoonStar,
  Sun,
  Sword,
  CheckCircle2,
  BarChart3,
  Edit2,
  Check,
  AlertTriangle
} from "lucide-react";
import { UserProfile, UserPassport } from "../types";
import { getAchievements } from "../lib/achievements";

interface BeerPassportProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  passport: UserPassport;
  onLogout: () => void;
  onDeleteVisit: (visitId: string) => Promise<void>;
  onUpdateFavoriteBeer: (beerName: string) => Promise<void>;
  onUpdateUserProfile?: (updated: UserProfile) => void;
}

// Icon resolver for achievements map
function RenderAchievementIcon({ iconName, unlocked }: { iconName: string; unlocked: boolean }) {
  const iconProps = `w-6 h-6 stroke-[2] ${unlocked ? "text-amber-950 animate-pulse" : "text-slate-500"}`;
  switch (iconName) {
    case "GlassWater": return <GlassWater className={iconProps} />;
    case "Home": return <Home className={iconProps} />;
    case "Map": return <Map className={iconProps} />;
    case "Compass": return <Compass className={iconProps} />;
    case "MapPin": return <MapPin className={iconProps} />;
    case "Award": return <Award className={iconProps} />;
    case "Beer": return <Beer className={iconProps} />;
    case "Flame": return <Flame className={iconProps} />;
    case "Sparkles": return <Sparkles className={iconProps} />;
    case "Shuffle": return <Shuffle className={iconProps} />;
    case "Trees": return <Trees className={iconProps} />;
    case "Moon": return <Moon className={iconProps} />;
    case "Globe": return <Globe className={iconProps} />;
    case "Crown": return <Crown className={iconProps} />;
    case "MoonStar": return <MoonStar className={iconProps} />;
    case "Sun": return <Sun className={iconProps} />;
    case "Sword": return <Sword className={iconProps} />;
    default: return <Award className={iconProps} />;
  }
}

export function getStamgastRank(visitedPubCount: number) {
  if (visitedPubCount === 0) {
    return { title: "Nováček", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
  }
  if (visitedPubCount < 3) {
    return { title: "Učeň štamgasta", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  }
  if (visitedPubCount < 7) {
    return { title: "Štamgast", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-pulse" };
  }
  if (visitedPubCount < 12) {
    return { title: "Vele-štamgast", color: "text-purple-400 bg-purple-500/10 border-purple-550/20 font-bold" };
  }
  return { title: "Pivní legenda 👑", color: "text-amber-400 bg-amber-500/10 border-amber-500/20 font-extrabold shadow-sm shadow-amber-550/5" };
}

export function BeerPassport({ 
  isOpen, 
  onClose, 
  userProfile, 
  passport, 
  onLogout, 
  onDeleteVisit, 
  onUpdateFavoriteBeer,
  onUpdateUserProfile
}: BeerPassportProps) {
  const [activeTab, setActiveTab] = useState<string>("achievements");
  const [favBeerInput, setFavBeerInput] = useState(passport.favoriteBeerName || "");
  const [isEditingFav, setIsEditingFav] = useState(false);
  const [isSavingFav, setIsSavingFav] = useState(false);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);

  // States for error reports (Admin only)
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");

  // Inline name editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState(userProfile.name || "");
  
  // Pagination limits for long lists
  const [placesLimit, setPlacesLimit] = useState(15);
  const [historyLimit, setHistoryLimit] = useState(15);

  if (!isOpen) return null;

  // Compute achievements list dynamically based on passport visits list and sort unlocked/obtained achievements first
  const achievements = getAchievements(passport.visits, passport.visitedPubIds)
    .sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0; // maintain original relative sorting for similar unlocked states
    });
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Compute statistics
  const totalVisitsCount = passport.visits.length;
  const uniquePubsCount = passport.visitedPubIds.length;
  const uniqueBeersTried = new Set(
    passport.visits.filter((v) => v.beerName !== null).map((v) => `${v.beerName} (${v.pubId})`)
  ).size;

  // Compute detailed metrics for statistics
  const visitsWithBeer = passport.visits.filter((v) => !!v.beerName);
  const totalBeersLoggedCount = visitsWithBeer.length;

  // 1. Most frequent beer styles (Top 3)
  const styleCounts: Record<string, number> = {};
  passport.visits.forEach((v) => {
    const styleRaw = v.style?.trim();
    const style = styleRaw || (v.beerName?.toLowerCase().includes("plzeň") ? "Světlý ležák" : "Nespecifikováno");
    styleCounts[style] = (styleCounts[style] || 0) + 1;
  });
  const sortedStyles = Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count);

  // 2. Most frequent beers (Top 3)
  const beerCounts: Record<string, number> = {};
  visitsWithBeer.forEach((v) => {
    const name = v.beerName!.trim();
    beerCounts[name] = (beerCounts[name] || 0) + 1;
  });
  const sortedBeers = Object.entries(beerCounts)
    .map(([beerName, count]) => ({ beerName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 3. Most frequent breweries (Top 3)
  const breweryCounts: Record<string, number> = {};
  visitsWithBeer.forEach((v) => {
    if (v.brewery) {
      const bName = v.brewery.trim();
      breweryCounts[bName] = (breweryCounts[bName] || 0) + 1;
    }
  });
  const sortedBreweries = Object.entries(breweryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 4. Weekday distribution (0 = Po, 6 = Ne)
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  const weekdayNames = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
  passport.visits.forEach((v) => {
    const d = new Date(v.timestamp);
    const rawDay = d.getDay(); // 0 = Sun, 1 = Mon...
    const mappedDay = rawDay === 0 ? 6 : rawDay - 1;
    weekdayCounts[mappedDay]++;
  });
  const maxDayCount = Math.max(...weekdayCounts, 1);

  // 5. Drinking circadian hourly rhythm
  const hourCounts = Array(24).fill(0);
  passport.visits.forEach((v) => {
    const d = new Date(v.timestamp);
    hourCounts[d.getHours()]++;
  });
  const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
  const peakHourStr = peakHourIndex >= 0 && Math.max(...hourCounts) > 0 ? `${peakHourIndex}:00 - ${peakHourIndex + 1}:00` : "Žádná data";

  // Average hour
  let totalHoursSum = 0;
  passport.visits.forEach((v) => {
    totalHoursSum += new Date(v.timestamp).getHours();
  });
  const avgHourStr = passport.visits.length > 0 ? `${Math.round(totalHoursSum / passport.visits.length)}:00` : "-";

  const fetchReports = async () => {
    if (userProfile.email !== "david.kuncar@seznam.cz") return;
    setLoadingReports(true);
    setReportsError("");
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Chyba při stahování hlášení");
      const data = await res.json();
      setReports(data);
    } catch (err: any) {
      console.error(err);
      setReportsError("Nepovedlo se načíst seznam nahlášených chyb.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (isOpen && userProfile.email === "david.kuncar@seznam.cz") {
      fetchReports();
    }
  }, [isOpen, userProfile.email]);

  const handleResolveReport = async (reportId: string, status: string = "Vyřešeno") => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Nelze aktualizovat hlášení.");
      
      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    } catch (err) {
      console.error(err);
      alert("Chyba při označování hlášení.");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Nelze smazat hlášení.");
      
      // Update local state
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      console.error(err);
      alert("Chyba při mazání hlášení.");
    }
  };

  const handleSaveFavBeer = async () => {
    setIsSavingFav(true);
    try {
      await onUpdateFavoriteBeer(favBeerInput);
      setIsEditingFav(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingFav(false);
    }
  };

  const initialChar = (userProfile.name ? userProfile.name.trim() : userProfile.email.trim()).charAt(0).toUpperCase();
  const rank = getStamgastRank(passport.visitedPubIds ? passport.visitedPubIds.length : 0);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-l border-amber-500/30 text-slate-100 shadow-2xl overflow-y-auto scrollbar-thin z-25 relative">
      
      {/* Header section with user avatar and basic info */}
      <div className="px-6 py-5 bg-gradient-to-r from-amber-500/15 to-slate-900 border-b border-amber-500/20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            {/* Round initial badge */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-display font-black text-xl shadow-lg ring-2 ring-amber-500/30 select-none flex-shrink-0 animate-scaleIn">
              {initialChar}
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    className="bg-slate-950 border border-amber-500/35 rounded-md text-[11px] px-1.5 py-0.5 text-slate-100 outline-none w-28 focus:shadow-sm focus:border-amber-500/50"
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (newNameInput.trim()) {
                        if (onUpdateUserProfile) {
                          await onUpdateUserProfile({
                            ...userProfile,
                            name: newNameInput.trim()
                          });
                        }
                        setIsEditingName(false);
                      }
                    }}
                    className="p-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md hover:bg-green-500/20 transition cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setNewNameInput(userProfile.name || "");
                      setIsEditingName(false);
                    }}
                    className="p-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 
                    onClick={() => {
                      setNewNameInput(userProfile.name || "");
                      setIsEditingName(true);
                    }}
                    title="Klikni pro změnu přezdívky"
                    className="text-sm font-bold text-slate-100 uppercase tracking-wide font-display hover:text-amber-500 cursor-pointer flex items-center gap-1 transition select-none"
                  >
                    {userProfile.name || userProfile.email.split("@")[0]}
                    <Edit2 className="w-3 h-3 text-slate-500 hover:text-amber-500" />
                  </h3>
                  <span className={`text-[9px] border px-1.5 py-0.5 rounded-md font-bold uppercase select-none transition-all duration-300 ${rank.color}`}>
                    {rank.title}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[175px] truncate">
                {userProfile.email}
              </p>
              
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-[9.5px] font-bold text-red-400 hover:text-red-500 hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 bg-red-500/5 px-2.5 py-1 rounded-md transition cursor-pointer select-none"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Odhlásit se
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Favorite Beer persistent form */}
        <div className="bg-slate-950/40 rounded-xl px-3 py-2 border border-slate-850 flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base text-amber-500">🏆</span>
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">
                Nejoblíbenější pivo:
              </span>
              {isEditingFav ? (
                <input
                  type="text"
                  value={favBeerInput}
                  onChange={(e) => setFavBeerInput(e.target.value)}
                  placeholder="napr. Plzeň Hladinka"
                  className="bg-slate-900 border border-amber-500/35 rounded-md text-[11px] px-1.5 py-0.5 mt-1 text-slate-100 outline-none w-36 focus:shadow-sm"
                  autoFocus
                />
              ) : (
                <span className="text-[11px] text-amber-450 font-bold mt-1 block">
                  {passport.favoriteBeerName || "Zatím nevybráno"}
                </span>
              )}
            </div>
          </div>
          
          {isEditingFav ? (
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveFavBeer}
                disabled={isSavingFav}
                className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                {isSavingFav ? "Ukládám..." : "Uložit"}
              </button>
              <button
                onClick={() => {
                  setFavBeerInput(passport.favoriteBeerName || "");
                  setIsEditingFav(false);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-1"
              >
                Storno
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingFav(true)}
              className="text-[10px] text-slate-400 hover:text-amber-500 transition cursor-pointer hover:bg-slate-900 px-2 py-1 rounded-md"
            >
              Změnit
            </button>
          )}
        </div>

        {/* Quick summary grid of profile attributes */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950/60 p-2 border border-amber-500/10 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">Hospody</span>
            <span className="text-base font-black font-display text-amber-500">{uniquePubsCount}</span>
          </div>
          <div className="bg-slate-950/60 p-2 border border-amber-500/10 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">Ochutnáno</span>
            <span className="text-base font-black font-display text-amber-500">{uniqueBeersTried}</span>
          </div>
          <div className="bg-slate-950/60 p-2 border border-amber-500/10 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">Odznáčky</span>
            <span className="text-base font-black font-display text-amber-500">{unlockedCount}/20</span>
          </div>
        </div>

      </div>

      {/* Navigation tabs */}
      <div className="bg-slate-950 flex border-b border-amber-500/10">
        <button
          onClick={() => setActiveTab("achievements")}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "achievements" 
              ? "border-amber-500 text-amber-500 bg-amber-500/[0.02]" 
              : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/30"
          }`}
        >
          <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Odznaky</span>
        </button>
        <button
          onClick={() => setActiveTab("places")}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "places" 
              ? "border-amber-500 text-amber-500 bg-amber-500/[0.02]" 
              : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/30"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Navštíveno</span>
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "stats" 
              ? "border-amber-500 text-amber-500 bg-amber-500/[0.02]" 
              : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/30"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Statistiky</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "history" 
              ? "border-amber-500 text-amber-500 bg-amber-500/[0.02]" 
              : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/30"
          }`}
        >
          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Historie</span>
        </button>
      </div>

      {/* Main tab body panel (seamlessly flowing with parent scrollable viewport) */}
      <div className="p-4 space-y-4">

        {/* TAB 1: 🏆 ACHIEVEMENTS GRID (20 Badges) */}
        {activeTab === "achievements" && (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`border rounded-2xl p-3 flex gap-3 transition duration-200 ${
                    ach.unlocked 
                      ? "bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-950 border-amber-500/30 shadow-md shadow-amber-500/[0.02]" 
                      : "bg-slate-950/40 border-slate-850 opacity-80"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                      ach.unlocked
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 shadow-inner"
                        : "bg-slate-900 border-slate-800 text-slate-600"
                    }`}>
                      <RenderAchievementIcon iconName={ach.iconName} unlocked={ach.unlocked} />
                    </div>
                  </div>
                  
                  <div className="flex-grow space-y-1 overflow-hidden">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className={`text-xs font-bold leading-none truncate ${ach.unlocked ? "text-amber-405 font-display" : "text-slate-400"}`}>
                        {ach.title}
                      </h4>
                      {ach.unlocked && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {ach.description}
                    </p>
                    <p className="text-[9px] text-slate-500 italic block leading-none">
                      {ach.requirement}
                    </p>
                    
                    {/* Acquisition Timestamp representation */}
                    {ach.unlocked && ach.unlockedAt && (
                      <div className="text-[9.5px] text-amber-500/90 font-display font-bold flex items-center gap-1 pt-0.5">
                        <Calendar className="w-3 h-3 text-amber-500/70 shrink-0" />
                        <span>Získáno: {new Date(ach.unlockedAt).toLocaleDateString("cs-CZ")}</span>
                      </div>
                    )}
                    
                    {/* Dynamic progress bar detail */}
                    <div className="pt-1.5 space-y-1">
                      <div className="flex justify-between items-center text-[8px] text-slate-505 font-bold leading-none uppercase">
                        <span>Pokrok:</span>
                        <span>{ach.progress} / {ach.target}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full transition-all duration-300 ${ach.unlocked ? "bg-amber-500" : "bg-slate-700"}`}
                          style={{ width: `${(ach.progress / ach.target) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: 🗺️ UNIQUE PLACES LIST */}
        {activeTab === "places" && (
          <div className="space-y-3 pb-8">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Navštívené pivní štace ({uniquePubsCount})
            </h4>

            {uniquePubsCount === 0 ? (
              <div className="text-center py-12 bg-slate-950/30 border border-dashed border-amber-500/10 rounded-2xl space-y-3">
                <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500">
                  Zatím jsi neoficiálně nenavštívil žádnou hospodu.<br />
                  Zajdi na mapu, přibliž se k hospůdce a klikni na **Zapsat návštěvu**.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(() => {
                  const allPlaces = Array.from(new Set(passport.visits.map((v) => JSON.stringify({id: v.pubId, name: v.pubName}))));
                  const visiblePlaces = allPlaces.slice(0, placesLimit);
                  const hasMore = allPlaces.length > placesLimit;

                  return (
                    <>
                      {visiblePlaces.map((strVal) => {
                        const parsed = JSON.parse(strVal);
                        // count total unique calendar days on which user visited this pub
                        const dailySet = new Set(
                          passport.visits
                            .filter((v) => v.pubId === parsed.id)
                            .map((v) => v.timestamp ? new Date(v.timestamp).toLocaleDateString("cs-CZ") : new Date().toLocaleDateString("cs-CZ"))
                        );
                        const count = dailySet.size;
                        
                        // list beers consumed in this pub
                        const beersHere = Array.from(new Set(
                          passport.visits
                            .filter((v) => v.pubId === parsed.id && v.beerName !== null)
                            .map((v) => `${v.beerName}${v.degrees ? ` (${v.degrees})` : ""}`)
                        )).join(", ");

                        return (
                          <div key={parsed.id} className="p-4 bg-slate-950 border border-amber-500/10 rounded-2xl flex justify-between items-center hover:border-amber-500/20 transition-all">
                            <div className="space-y-1 overflow-hidden">
                              <h5 className="text-xs font-bold text-slate-100 font-display">
                                {parsed.name}
                              </h5>
                              <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                                <span className="text-amber-500">★ {count}x návštěva</span>
                                {beersHere && (
                                  <span className="truncate max-w-[200px] text-slate-500 italic">
                                    Pivo: {beersHere}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setPlacesLimit((prev) => prev + 15)}
                          className="w-full py-2.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30 rounded-xl transition cursor-pointer select-none"
                        >
                          Načíst dalších 15 hospod ({allPlaces.length - placesLimit} zbývá)
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 📊 STATISTIKY (Beer analytics and charts) */}
        {activeTab === "stats" && (
          <div className="space-y-4 pb-8">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Pivní statistiky & rozbory štamgasta
            </h4>

            {passport.visits.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/30 border border-dashed border-amber-500/10 rounded-2xl space-y-3">
                <BarChart3 className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs text-slate-500">
                  Zatím nemáš zapsanou žádnou hospodu k analýze.<br />
                  Dej si první pivo a hned tu uvidíš přehledy!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual grid cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950/80 p-3 border border-amber-500/10 rounded-xl space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">
                      Zlatá hodina 🕰️
                    </span>
                    <span className="text-xs font-bold text-amber-500 block font-display">
                      {peakHourStr}
                    </span>
                    <span className="text-[8.5px] text-slate-400 block leading-tight">
                      Čas, kdy se v tvé ruce nejčastěji blýská půllitr.
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-3 border border-amber-500/10 rounded-xl space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">
                      Průměrný zápis 🌙
                    </span>
                    <span className="text-xs font-bold text-amber-500 block font-display">
                      {avgHourStr}
                    </span>
                    <span className="text-[8.5px] text-slate-400 block leading-tight">
                      Orientační průměrná hodina tvého zápisu návštěvy.
                    </span>
                  </div>
                </div>

                {/* Favorite Beers */}
                <div className="bg-slate-950/80 p-4 border border-amber-500/10 rounded-xl space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Beer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nejčastěji točená piva ({totalBeersLoggedCount}x)</span>
                  </h5>
                  {sortedBeers.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Zatím nebyly zapsány konkrétní značky piv.</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedBeers.map(({ beerName, count }, idx) => {
                        const pct = Math.round((count / Math.max(totalBeersLoggedCount, 1)) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-200">
                                {idx + 1}. {beerName}
                              </span>
                              <span className="font-mono text-[10px] text-amber-500 font-bold">
                                {count}x ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="bg-gradient-to-r from-amber-600 to-amber-400 h-1.5 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Weekday distribution - customized SVG/Tailwind chart */}
                <div className="bg-slate-950/80 p-4 border border-amber-500/10 rounded-xl space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>Četnost návštěv podle dnů v týdnu</span>
                  </h5>
                  <div className="space-y-2">
                    {weekdayCounts.map((count, idx) => {
                      const dayName = weekdayNames[idx];
                      const pct = Math.round((count / maxDayCount) * 100);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-14 font-bold font-display">{dayName}</span>
                          <div className="flex-grow bg-slate-900 rounded-full h-2.5 overflow-hidden relative">
                            <div
                              style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                idx >= 4 ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-slate-700"
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-300 font-bold w-6 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Popular Styles and Breweries */}
                <div className="grid grid-cols-1 gap-2">
                  {/* Favourite Styles */}
                  <div className="bg-slate-950/80 p-3.5 border border-amber-500/10 rounded-xl space-y-2.5">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Oblíbené pivní druhy (styly)</span>
                    </h5>
                    {sortedStyles.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">Zatím nebyly rozeznány žádné styly.</p>
                    ) : (
                      <div className="space-y-2">
                        {sortedStyles.slice(0, 3).map(({ style, count }) => {
                          const stylePct = Math.round((count / passport.visits.length) * 100);
                          return (
                            <div key={style} className="text-[11px] space-y-1">
                              <div className="flex justify-between text-slate-200">
                                <span className="font-semibold truncate max-w-[170px]">{style}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{count}x ({stylePct}%)</span>
                              </div>
                              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                <div style={{ width: `${stylePct}%` }} className="bg-amber-500/70 h-1 rounded-full" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Favourite Breweries */}
                  <div className="bg-slate-950/80 p-3.5 border border-amber-500/10 rounded-xl space-y-2.5">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>Prověřené pivovary celkem</span>
                    </h5>
                    {sortedBreweries.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic font-medium">Zatím chybí ruka pivovarů dopsaná k pivem.</p>
                    ) : (
                      <div className="space-y-2">
                        {sortedBreweries.map(({ name, count }) => {
                          const breweryPct = Math.round((count / Math.max(totalBeersLoggedCount, 1)) * 100);
                          return (
                            <div key={name} className="text-[11px] space-y-1">
                              <div className="flex justify-between text-slate-200">
                                <span className="font-semibold truncate max-w-[170px]">{name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{count}x</span>
                              </div>
                              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                <div style={{ width: `${breweryPct}%` }} className="bg-slate-500/70 h-1 rounded-full" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: 🕰️ VISITS HISTORY LOG */}
        {activeTab === "history" && (
          <div className="space-y-3 pb-8">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Kompletní pitná kronika ({totalVisitsCount})
            </h4>

            {totalVisitsCount === 0 ? (
              <div className="text-center py-12 bg-slate-950/30 border border-dashed border-amber-500/10 rounded-2xl space-y-3">
                <History className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500">
                  Naše pivní kronika zeje prázdnotou.<br />
                  Dej si škopek a zapiš ho! Proslulost čeká.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(() => {
                  const sortedVisits = [...passport.visits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  const visibleVisits = sortedVisits.slice(0, historyLimit);
                  const hasMore = sortedVisits.length > historyLimit;

                  return (
                    <>
                      {visibleVisits.map((visit) => (
                        <div 
                          key={visit.id} 
                          className="p-3.5 bg-slate-950 border border-slate-850 hover:border-amber-500/10 rounded-2xl flex justify-between items-center gap-4 transition group"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase leading-none">
                                {new Date(visit.timestamp).toLocaleDateString("cs-CZ", { 
                                  day: "numeric", 
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              <span className="text-[10px] text-slate-600">|</span>
                              <span className="text-xs font-bold text-amber-500 truncate leading-none font-display">
                                {visit.pubName}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-200 font-medium flex items-center gap-1">
                              <Beer className="w-3 h-3 text-slate-500" />
                              {visit.beerName ? (
                                <span>
                                  {visit.beerName}{visit.degrees ? ` (${visit.degrees})` : ""}{visit.brewery ? ` od ${visit.brewery}` : ""}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Čistá návštěva (bez piva)</span>
                              )}
                            </p>

                            {visit.style && (
                              <span className="inline-block text-[9px] bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded">
                                Styl: {visit.style}
                              </span>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            {deletingVisitId === visit.id ? (
                              <div className="flex items-center gap-1 animate-fadeIn">
                                <button
                                  onClick={async () => {
                                    await onDeleteVisit(visit.id);
                                    setDeletingVisitId(null);
                                  }}
                                  className="text-[9px] font-bold bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded cursor-pointer"
                                >
                                  Ano
                                </button>
                                <button
                                  onClick={() => setDeletingVisitId(null)}
                                  className="text-[9px] bg-slate-800 text-slate-350 px-1.5 py-1 rounded hover:bg-slate-700 cursor-pointer"
                                >
                                  Ne
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingVisitId(visit.id)}
                                className="p-1 px-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition opacity-60 group-hover:opacity-100 cursor-pointer"
                                title="Smazat záznam z historie"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setHistoryLimit((prev) => prev + 15)}
                          className="w-full py-2.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30 rounded-xl transition cursor-pointer select-none"
                        >
                          Načíst dalších 15 záznamů ({sortedVisits.length - historyLimit} zbývá)
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Persistent logout footer */}
      <div className="px-6 py-4 bg-slate-950 border-t border-amber-500/10 flex justify-between items-center mt-auto">
        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>PIVNÍ PAS</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-amber-500/20 hover:border-amber-500/50 hover:bg-red-950/20 hover:text-red-400 rounded-xl text-[11px] font-bold text-slate-400 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Odhlásit se
        </button>
      </div>

    </div>
  );
}

import React, { useState } from "react";
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
  BarChart3
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
  const [activeTab, setActiveTab] = useState<"achievements" | "places" | "stats" | "history">("achievements");
  const [favBeerInput, setFavBeerInput] = useState(passport.favoriteBeerName || "");
  const [isEditingFav, setIsEditingFav] = useState(false);
  const [isSavingFav, setIsSavingFav] = useState(false);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  
  // Profile customizer states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newNameInput, setNewNameInput] = useState(userProfile.name);

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

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-l border-amber-500/30 text-slate-100 shadow-2xl overflow-y-auto scrollbar-thin z-25 relative">
      
      {/* Header section with user avatar and basic info */}
      <div className="px-6 py-5 bg-gradient-to-r from-amber-500/15 to-slate-900 border-b border-amber-500/20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              title="Změnit avatar / jméno"
              className="relative group w-13 h-13 rounded-2xl overflow-hidden ring-2 ring-amber-500/30 hover:ring-amber-450 bg-slate-950 block focus:outline-none cursor-pointer flex-shrink-0"
            >
              {userProfile.picture ? (
                <img
                  src={userProfile.picture}
                  alt={userProfile.name}
                  referrerPolicy="no-referrer; same-origin"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-500">
                  <User className="w-6 h-6" />
                </div>
              )}
              {/* Overlaid edit indicator */}
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[8px] text-amber-400 font-bold tracking-tight transition-opacity duration-150">
                <span>Upravit</span>
              </div>
            </button>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-display">
                  {userProfile.name}
                </h3>
                <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-440 px-1.5 py-0.5 rounded-md font-bold uppercase select-none">
                  Štamgast
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[175px] truncate">
                {userProfile.email}
              </p>
              
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="flex items-center gap-0.5 text-[9.5px] font-bold text-amber-500 hover:text-amber-400 transition cursor-pointer select-none border border-amber-500/15 hover:border-amber-500/30 bg-amber-500/5 px-2 py-0.5 rounded-md"
                >
                  Nastavení vzhledu
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-[9.5px] font-bold text-red-400 hover:text-red-500 transition cursor-pointer select-none border border-red-500/15 hover:border-red-500/30 bg-red-500/5 px-2 py-0.5 rounded-md"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Odhlásit
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

        {/* ⚙️ PROFILE CUSTOMIZER PANEL */}
        {isEditingProfile && (
          <div className="mt-1 mb-4 p-3.5 bg-slate-950/70 border border-amber-500/15 rounded-xl space-y-3 animate-fadeIn">
            <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
              Nastavení vzhledu & jména štamgasta
            </h4>
            
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block">
                Změnit přezdívku:
              </label>
              <input
                type="text"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                placeholder="Zadej své jméno"
                maxLength={25}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs px-2.5 py-1.5 text-slate-150 focus:border-amber-500/50 outline-none transition"
              />
            </div>

            {/* Avatar Selector Grid */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block">
                Zvol si svůj vzhled (včetně světlého muže s blond vlasy a neutrálních):
              </label>
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {[
                  {
                    id: "blonde_male",
                    name: "Štamgast (Světlý/Blond)",
                    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac"
                  },
                  {
                    id: "dark_male",
                    name: "Štamgast (Tmavovlasý)",
                    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=cernovlasyKluk&top[]=shortHair&hairColor[]=2c1b18&skinColor[]=ffdbac"
                  },
                  {
                    id: "blonde_female",
                    name: "Štamgastka",
                    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=blondynaStamgast&top[]=longHair&hairColor[]=e8c170&skinColor[]=ffdbac"
                  },
                  {
                    id: "crown_gold",
                    name: "Koruna krále piv",
                    url: "https://api.dicebear.com/7.x/shapes/svg?seed=pivnikralcool&backgroundColor=f59e0b"
                  },
                  {
                    id: "pohar_gold",
                    name: "Zlatý pohár",
                    url: "https://api.dicebear.com/7.x/shapes/svg?seed=pivnihvezda&backgroundColor=10b981"
                  },
                  {
                    id: "shield_gold",
                    name: "Pivní štít",
                    url: "https://api.dicebear.com/7.x/shapes/svg?seed=pivnicech&backgroundColor=6366f1"
                  }
                ].map((av) => (
                  <button
                    key={av.id}
                    title={av.name}
                    type="button"
                    onClick={() => {
                      if (onUpdateUserProfile) {
                        onUpdateUserProfile({
                          ...userProfile,
                          picture: av.url
                        });
                      }
                    }}
                    className={`aspect-square rounded-lg border overflow-hidden p-0 bg-slate-900 cursor-pointer transition flex items-center justify-center ${
                      userProfile.picture === av.url 
                        ? "border-amber-500 ring-2 ring-amber-500/20" 
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-10/12 h-10/12 object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setNewNameInput(userProfile.name);
                  setIsEditingProfile(false);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-200 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md transition cursor-pointer"
              >
                Storno
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateUserProfile) {
                    onUpdateUserProfile({
                      ...userProfile,
                      name: newNameInput.trim() || userProfile.name
                    });
                  }
                  setIsEditingProfile(false);
                }}
                className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1 rounded-md transition cursor-pointer"
              >
                Uložit jméno
              </button>
            </div>
          </div>
        )}

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
                {/* Dynamically filter unique pubs and render details */}
                {Array.from(new Set(passport.visits.map((v) => JSON.stringify({id: v.pubId, name: v.pubName}))))
                  .map((strVal) => {
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
                {[...passport.visits]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((visit) => (
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
              </div>
            )}
          </div>
        )}

      </div>

      {/* Persistent logout footer */}
      <div className="px-6 py-4 bg-slate-950 border-t border-amber-500/10 flex justify-between items-center mt-auto">
        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
          <ClipboardList className="w-3.5 h-3.5 text-amber-505" />
          KRONIKA AKTIVNÍ
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

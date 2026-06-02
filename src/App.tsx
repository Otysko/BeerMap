/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Pub, Beer, UserProfile, UserPassport } from "./types";
import MapComponent from "./components/MapComponent";
import PubDetails from "./components/PubDetails";
import AddBeerModal from "./components/AddBeerModal";
import AiAssistant from "./components/AiAssistant";
import { LoginModal } from "./components/LoginModal";
import { BeerPassport } from "./components/BeerPassport";
import { Beer as BeerIcon, Sparkles, MapPin, Search, ListFilter, SlidersHorizontal, Info, PlusCircle, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, X, Award, LogOut, User } from "lucide-react";

export default function App() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filtering states
  const [textFilter, setTextFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(120);
  const [sortBy, setSortBy] = useState<"name" | "cheapestBeer" | "distance">("name");
  
  // Selection states
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [candidateCoords, setCandidateCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modals & Panels toggle states
  const [isBeerModalOpen, setIsBeerModalOpen] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile menu collapse

  // Active user location for proximity queries in AI
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // User Authentication & Passport states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [passport, setPassport] = useState<UserPassport | null>(null);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  // 1. Fetch all pubs from Express API
  const fetchPubs = async () => {
    try {
      const res = await fetch("/api/pubs");
      if (!res.ok) throw new Error("Chyba při komunikaci s databází.");
      const data = await res.json();
      setPubs(data || []);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Nepodařilo se načíst databázi hospod. Zkontrolujte připojení k serveru.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch passport data for a user email
  const fetchPassportData = async (email: string) => {
    try {
      const res = await fetch(`/api/passports/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setPassport(data);
      }
    } catch (err) {
      console.error("Failed to fetch user passport:", err);
    }
  };

  // Handle Login success
  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("pivnimapa_user", JSON.stringify(profile));
    fetchPassportData(profile.email);
    setIsLoginModalOpen(false);
  };

  // Handle Logout
  const handleLogout = () => {
    setUserProfile(null);
    setPassport(null);
    setIsPassportOpen(false);
    localStorage.removeItem("pivnimapa_user");
  };

  // Handle Profile Update (e.g. name or portrait)
  const handleUpdateUserProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    localStorage.setItem("pivnimapa_user", JSON.stringify(updated));
  };

  // Log a pub/beer visit to the Beer Passport
  const handleLogVisit = async (pubId: string, pubName: string, beer: Beer | null) => {
    if (!userProfile) return;

    try {
      const res = await fetch(`/api/passports/${encodeURIComponent(userProfile.email)}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId,
          pubName,
          beerId: beer ? beer.id : null,
          beerName: beer ? beer.name : null,
          degrees: beer ? beer.degrees : null,
          style: beer ? beer.style : null,
          brewery: beer ? beer.brewery : null,
        }),
      });

      if (!res.ok) throw new Error("Chyba při zápisu návštěvy");
      const updatedPassport = await res.json();
      setPassport(updatedPassport);
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se zapsat návštěvu do pasu.");
    }
  };

  // Delete a logged visit from the Beer Passport
  const handleDeleteVisit = async (visitId: string) => {
    if (!userProfile) return;

    try {
      const res = await fetch(`/api/passports/${encodeURIComponent(userProfile.email)}/visits/${encodeURIComponent(visitId)}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Chyba při odstraňování záznamu");
      const updatedPassport = await res.json();
      setPassport(updatedPassport);
    } catch (err) {
      console.error(err);
      alert("Záznam se nepodařilo smazat.");
    }
  };

  // Update Favorite Beer in the Beer Passport
  const handleUpdateFavoriteBeer = async (beerName: string) => {
    if (!userProfile) return;

    try {
      const res = await fetch(`/api/passports/${encodeURIComponent(userProfile.email)}/favorite-beer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteBeerName: beerName }),
      });

      if (!res.ok) throw new Error("Chyba při ukládání oblíbeného piva.");
      const updatedPassport = await res.json();
      setPassport(updatedPassport);
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se uložit oblíbené pivo.");
    }
  };

  // Force GPS coordinate override for simulating proximity
  const handleSimulateLocation = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
  };

  useEffect(() => {
    fetchPubs();

    // Load cached passport user profile if any
    const cachedUser = localStorage.getItem("pivnimapa_user");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.email) {
          setUserProfile(parsed);
          fetchPassportData(parsed.email);
        }
      } catch (err) {
        console.error("Failed to parse cached user:", err);
      }
    }
    
    // Acquire user location for contextual AI references
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      }, (err) => {
        console.log("No location acquired for coordinates fallback.", err);
      });
    }
  }, []);

  // 2. Add a new Pub (Hospoda)
  const handleCreatePub = async (name: string, lat: number, lng: number, address?: string) => {
    try {
      const res = await fetch("/api/pubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lat, lng, address: address || "" }),
      });
      if (!res.ok) throw new Error("Chyba při zakládání hospody.");
      const newPub = await res.json();
      
      setPubs((prev) => [...prev, newPub]);
      setSelectedPubId(newPub.id); // Show detail instantly
      setIsDetailsOpen(true);
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se přidat hospodu.");
    }
  };

  // 3. Update Pub Header attributes
  const handleUpdatePubDetails = async (pubId: string, updatedFields: Partial<Pub>) => {
    try {
      const res = await fetch(`/api/pubs/${pubId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (!res.ok) throw new Error("Chyba při ukládání detailů hospody.");
      const updatedPub = await res.json();
      
      setPubs((prev) => prev.map((p) => (p.id === pubId ? updatedPub : p)));
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se uložit změny.");
    }
  };

  // 4. Delete Pub entirely
  const handleDeletePub = async (pubId: string) => {
    try {
      const res = await fetch(`/api/pubs/${pubId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Chyba při mazání hospody.");
      
      setPubs((prev) => prev.filter((p) => p.id !== pubId));
      setSelectedPubId(null);
      setIsDetailsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Odstranění selhalo.");
    }
  };

  // 5. Submit Beer (Add or Update)
  const handleSubmitBeer = async (beerData: {
    id?: string;
    name: string;
    degrees: string;
    price: number;
    style?: string;
    brewery?: string;
    description?: string;
  }) => {
    if (!selectedPubId) return;

    try {
      const res = await fetch(`/api/pubs/${selectedPubId}/beers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(beerData),
      });
      if (!res.ok) throw new Error("Chyba při ukládání piva.");
      const updatedPub = await res.json();
      
      setPubs((prev) => prev.map((p) => (p.id === selectedPubId ? updatedPub : p)));
    } catch (err) {
      console.error(err);
      alert("Uložení piva selhalo.");
    }
  };

  // 6. Delete Beer from a pub
  const handleDeleteBeer = async (beerId: string) => {
    if (!selectedPubId) return;

    try {
      const res = await fetch(`/api/pubs/${selectedPubId}/beers/${beerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Chyba při odstraňování piva.");
      const updatedPub = await res.json();
      
      setPubs((prev) => prev.map((p) => (p.id === selectedPubId ? updatedPub : p)));
    } catch (err) {
      console.error(err);
      alert("Nepodařilo se odebrat pivo.");
    }
  };

  // Selected Pub object retriever
  const activePub = pubs.find((p) => p.id === selectedPubId) || null;

  // 7. Filtering and Sorting logic of places
  const filteredPubs = pubs.filter((pub) => {
    // Search filter: matches pub name, address, notes, or any of its tapped beer names / breweries
    const query = textFilter.toLowerCase().trim();
    const matchesQuery =
      !query ||
      pub.name.toLowerCase().includes(query) ||
      (pub.address && pub.address.toLowerCase().includes(query)) ||
      (pub.notes && pub.notes.toLowerCase().includes(query)) ||
      pub.beers.some(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          (b.style && b.style.toLowerCase().includes(query)) ||
          (b.brewery && b.brewery.toLowerCase().includes(query))
      );

    // Price filter: if pub has beers, at least one beer must be <= maxPriceFilter. If no beers, we include it based on query if it's general discovery.
    const matchesPrice =
      pub.beers.length === 0 || pub.beers.some((b) => b.price <= maxPriceFilter);

    return matchesQuery && matchesPrice;
  });

  // Sorting pubs
  const sortedPubs = [...filteredPubs].sort((a, b) => {
    if (sortBy === "distance" && userLocation) {
      const distA = calculateDistanceInKm(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = calculateDistanceInKm(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    }
    if (sortBy === "cheapestBeer") {
      // Get min price for each pub. Pubs without beer go to end.
      const priceA = a.beers.length > 0 ? Math.min(...a.beers.map((b) => b.price)) : Infinity;
      const priceB = b.beers.length > 0 ? Math.min(...b.beers.map((b) => b.price)) : Infinity;
      return priceA - priceB;
    }
    // alphabetical default
    return a.name.localeCompare(b.name, "cs-CZ");
  });

  // Trigger user location and set distance sorting
  const handleDistanceSortClick = () => {
    if (!userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            setSortBy("distance");
          },
          (err) => {
            // Geolocation failed or blocked - auto-simulate Prague center for smooth testing in IFrames
            const pragueCenter = { lat: 50.0818, lng: 14.4286 };
            setUserLocation(pragueCenter);
            setSortBy("distance");
            alert("Přístup k poloze byl zablokován prohlížečem (časté v bezpečných iframe náhledech).\n\nPro účely snadného testování jsme vám nasimulovali výchozí polohu v centru Prahy! Nyní můžete seřadit hospody podle vzdálenosti, vybrat libovolné místo na mapě a kliknout na tlačítko '📍 Simulovat příchod' přímo v detailu hospody.");
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      } else {
        const pragueCenter = { lat: 50.0818, lng: 14.4286 };
        setUserLocation(pragueCenter);
        setSortBy("distance");
        alert("Prohlížeč nepodporuje geolokaci. Nasimulovali jsme vám polohu v Praze pro otestování.");
      }
    } else {
      setSortBy("distance");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden">
      
      {/* 🍺 TOP NAVIGATION BAR HEADER */}
      <header className="flex-shrink-0 bg-slate-900 border-b border-amber-500/30 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg ring-4 ring-amber-500/10">
            <BeerIcon className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-display font-black text-amber-500 tracking-tight leading-none uppercase">
              Česká Pivní Mapa
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
              Co se kde točí a kolik stojí orosený půllitr
            </p>
          </div>
        </div>

        {/* AI Bartender launcher + Mobile Sidebar launcher */}
        <div className="flex items-center gap-2.5">
          {/* 🍺 PIVNÍ PAS USER ACCORDION */}
          {userProfile ? (
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (isPassportOpen) {
                    setIsPassportOpen(false);
                  } else {
                    setIsPassportOpen(true);
                    setIsDetailsOpen(false);
                    setSelectedPubId(null);
                    setIsSidebarOpen(false);
                    setIsAiOpen(false);
                  }
                }}
                title="Můj Pas"
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition overflow-hidden p-0 cursor-pointer select-none ${
                  isPassportOpen 
                    ? "bg-amber-500/25 border-amber-500 text-amber-400 ring-2 ring-amber-500/20" 
                    : "bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-amber-500/35 text-slate-200 hover:text-white"
                }`}
              >
                {userProfile.picture ? (
                  <img
                    referrerPolicy="no-referrer; same-origin"
                    src={userProfile.picture}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-amber-500" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-amber-500 text-xs font-bold font-display rounded-xl border border-slate-800 hover:border-amber-500/30 transition cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Aktivovat Pas</span>
            </button>
          )}
        </div>
      </header>

      {/* Main dashboard content area */}
      <div className="flex-grow flex relative overflow-hidden">
        
        {/* 📚 SIDEBAR CONTROLLER / DRAWER - LIST OF PUBS */}
        <aside 
          className={`h-full bg-slate-900 flex-shrink-0 transition-all duration-300 flex flex-col z-20 ${
            isSidebarOpen ? "w-full md:w-[340px] border-r border-amber-500/30" : "w-0 overflow-hidden border-r-0 pointer-events-none invisible opacity-0 md:hidden"
          }`}
        >
          {/* Header element to easily close on mobile */}
          <div className="p-4 border-b border-amber-500/20 flex justify-between items-center bg-slate-950/30">
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-amber-500" />
              <span className="text-xs uppercase font-bold text-slate-300 tracking-wider">Hospody & Filtry</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5 text-amber-400" />
              Zavřít
            </button>
          </div>

          {/* Filters Pane */}
          <div className="p-4 border-b border-amber-500/20 space-y-4">
            {/* Text Search Pub/Beer input */}
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus-within:border-amber-500/50 transition">
              <Search className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Rychlé hledání piva, hospody..."
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-xs w-full placeholder:text-slate-500"
              />
              {textFilter && (
                <button 
                  onClick={() => setTextFilter("")} 
                  className="text-[10px] text-slate-450 hover:text-white ml-1 bg-slate-800 rounded px-1"
                >
                  Smazat
                </button>
              )}
            </div>

            {/* Price slider filter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-450 font-bold uppercase tracking-wide">
                <span className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-amber-500" /> Max cena piva
                </span>
                <span className="text-amber-500 font-mono text-xs">{maxPriceFilter} Kč</span>
              </div>
              <input
                type="range"
                min={30}
                max={150}
                step={5}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer appearance-none"
              />
            </div>

            {/* Sorting buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Řazení
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy("name")}
                  className={`text-[10.5px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortBy === "name" 
                      ? "bg-amber-500 text-slate-950 shadow-sm" 
                      : "bg-slate-950 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  Abecedně
                </button>
                <button
                  onClick={() => setSortBy("cheapestBeer")}
                  className={`text-[10.5px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortBy === "cheapestBeer" 
                      ? "bg-amber-500 text-slate-950 shadow-sm" 
                      : "bg-slate-950 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  Nejlevnější
                </button>
                <button
                  onClick={handleDistanceSortClick}
                  className={`text-[10.5px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortBy === "distance" 
                      ? "bg-amber-500 text-slate-950 shadow-sm" 
                      : "bg-slate-950 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  Nejbližší
                </button>
              </div>
            </div>
          </div>

          {/* Pub list output view */}
          <div className="flex-grow overflow-y-auto divide-y divide-amber-500/10">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-2">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Načítám čepy...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-xs text-red-400">
                <p>{error}</p>
                <button 
                  onClick={fetchPubs}
                  className="mt-2 text-amber-500 hover:underline flex items-center gap-1 justify-center mx-auto"
                >
                  <RefreshCw className="w-3 h-3" /> Zkusit znovu
                </button>
              </div>
            ) : sortedPubs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <p className="text-xs">Nebylo nalezeno žádné vyhovující místo.</p>
                <p className="text-[10px] text-slate-605">Zkuste resetovat vyhledávací filtry výše.</p>
                <button
                  onClick={() => {
                    setTextFilter("");
                    setMaxPriceFilter(120);
                  }}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-xs text-amber-500 rounded-lg transition"
                >
                  Obnovit filtry
                </button>
              </div>
            ) : (
              sortedPubs.map((pub) => {
                const isSelected = pub.id === selectedPubId;
                const minPrice = pub.beers.length > 0 
                  ? Math.min(...pub.beers.map(b => b.price))
                  : null;

                return (
                  <div
                    key={pub.id}
                    onClick={() => {
                      setSelectedPubId(pub.id);
                      setIsAiOpen(false); // Close AI panel
                      
                      // Close filters and keep detail drawer closed on mobile list clicks
                      if (window.innerWidth < 780) {
                        setIsSidebarOpen(false);
                        setIsDetailsOpen(false);
                      } else {
                        setIsDetailsOpen(true);
                      }
                    }}
                    className={`p-4 transition-all duration-200 cursor-pointer hover:bg-slate-850/45 text-left border-l-4 ${
                      isSelected 
                        ? "bg-slate-850 border-l-amber-500" 
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1 pb-1">
                      <h3 className="text-xs font-bold leading-snug tracking-tight text-slate-100 group-hover:text-amber-500">
                        {pub.name}
                      </h3>
                      {minPrice !== null && (
                        <span className="text-[10.5px] font-mono text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10 flex-shrink-0">
                           od {minPrice} Kč
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 flex-wrap gap-x-2">
                      {pub.address ? (
                        <p className="flex items-center">
                          <MapPin className="w-3 h-3 text-slate-500 mr-0.5" />
                          {pub.address.split(",")[0]}
                        </p>
                      ) : (
                        <span />
                      )}
                      {userLocation && (
                        <span className="text-amber-500 font-semibold font-mono bg-amber-500/10 px-1.5 py-0.5 rounded text-[9.5px]">
                          📍 {formatDistance(calculateDistanceInKm(userLocation.lat, userLocation.lng, pub.lat, pub.lng))}
                        </span>
                      )}
                    </div>
                    
                    {/* Beer previews list */}
                    {pub.beers.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1 pl-1">
                        {pub.beers.slice(0, 3).map((b) => (
                          <span 
                            key={b.id} 
                            className="bg-slate-950 px-2 py-0.5 rounded text-[9.5px] font-semibold text-slate-350 border border-slate-800"
                          >
                            🍺 {b.name} ({b.degrees})
                          </span>
                        ))}
                        {pub.beers.length > 3 && (
                          <span className="text-[9px] text-slate-550 font-bold pt-0.5 px-0.5">
                            +{pub.beers.length - 3} další
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9.5px] text-slate-550 italic pl-1 block">
                        Zatím žádný nahlášený kohout
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Informational Tip on Pub additions */}
          <div className="p-3.5 bg-slate-950 border-t border-amber-500/20 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-[10px] text-slate-450 leading-relaxed">
              <strong>Tip sládka:</strong> Novou hospodu přidáte <strong>kliknutím přímo do mapy</strong>, zadáním názvu a uložením místa.
            </p>
          </div>
        </aside>

        {/* 🗺️ DYNAMIC COLLAPSE TAB BAR TOGGLE (Between Map and Sidebar list) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-[340px] top-1/2 -translate-y-1/2 z-[1001] hidden md:flex w-5 h-12 bg-slate-900 hover:bg-slate-800 border-y border-r border-amber-500/20 rounded-r-xl items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl cursor-pointer"
          style={{ left: isSidebarOpen ? "340px" : "0" }}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* 🗺️ INTERACTIVE LEAFLET DISPLAY MAP CONTAINER */}
        <main className="flex-grow h-full relative z-10 bg-slate-950">
          <MapComponent
            pubs={pubs}
            selectedPubId={selectedPubId}
            onSelectPub={(pubId) => {
              setSelectedPubId(pubId);
              if (pubId) {
                setIsDetailsOpen(true);
                setIsAiOpen(false);
                setIsPassportOpen(false);
                if (window.innerWidth < 780) {
                  setIsSidebarOpen(false);
                }
              } else {
                setIsDetailsOpen(false);
              }
            }}
            onCreatePub={handleCreatePub}
            candidateCoords={candidateCoords}
            setCandidateCoords={(coords) => {
              setCandidateCoords(coords);
              if (coords) {
                setIsDetailsOpen(false);
                setIsAiOpen(false);
                setIsPassportOpen(false);
              }
            }}
            userLocation={userLocation}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => {
              setIsSidebarOpen(!isSidebarOpen);
              if (!isSidebarOpen) {
                setIsAiOpen(false);
                setSelectedPubId(null);
              }
              setIsPassportOpen(false);
            }}
          />

          {/* Floating 'Hospodský Kecal AI' Button floating in the bottom right corner of the map */}
          {/* We hide it on mobile/desktop when candidateCoords is active (when creating a new pub) so it cannot overlap and block the Save/Submit button */}
          {!candidateCoords && (
            <div className="absolute bottom-6 right-4 z-[1000]">
              <button
                onClick={() => {
                  setIsAiOpen(!isAiOpen);
                  if (!isAiOpen) {
                    setIsSidebarOpen(false);
                    setSelectedPubId(null); // Close details when AI is open
                    setIsDetailsOpen(false);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-3 rounded-xl text-xs font-bold font-display transition-all duration-300 shadow-2xl border cursor-pointer hover:scale-105 active:scale-95 ${
                  isAiOpen
                    ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/30"
                    : "bg-slate-900/95 hover:bg-slate-850 backdrop-blur-md border-amber-500/40 hover:border-amber-500 text-amber-500 hover:text-white"
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isAiOpen ? 'text-slate-950' : 'text-amber-500 animate-pulse'}`} />
                <span>Hospodský Kecal AI</span>
              </button>
            </div>
          )}
        </main>

        {/* 🗃️ SLIDE-OUT RIGHT HAND DRAWER: selected PUB DETAILS */}
        <aside
          className={`h-full bg-slate-900 flex-shrink-0 transition-all duration-300 z-20 ${
            activePub && isDetailsOpen ? "w-full md:w-[380px] border-l border-amber-500/30" : "w-0 overflow-hidden border-l-0 pointer-events-none invisible opacity-0"
          }`}
        >
          {activePub && isDetailsOpen && (
            <PubDetails
              pub={activePub}
              onClose={() => {
                setSelectedPubId(null);
                setIsDetailsOpen(false);
              }}
              onAddBeerClick={() => {
                setEditingBeer(null);
                setIsBeerModalOpen(true);
              }}
              onEditBeerClick={(beer) => {
                setEditingBeer(beer);
                setIsBeerModalOpen(true);
              }}
              onDeleteBeer={handleDeleteBeer}
              onDeletePub={handleDeletePub}
              onUpdatePubDetails={handleUpdatePubDetails}
              userLocation={userLocation}
              userProfile={userProfile}
              onLogVisit={handleLogVisit}
              onOpenPassportClick={() => setIsPassportOpen(true)}
              onOpenLoginClick={() => setIsLoginModalOpen(true)}
              onSimulateLocation={handleSimulateLocation}
            />
          )}
        </aside>

        {/* 🤖 SLIDE-OUT RIGHT HAND DRAWER: AI ASSISTANT CHAT ("Hospodský Kecal") */}
        <aside
          className={`h-full bg-slate-900 flex-shrink-0 transition-all duration-300 z-20 ${
            isAiOpen ? "w-full md:w-[380px] border-l border-amber-500/30" : "w-0 overflow-hidden border-l-0 pointer-events-none invisible opacity-0"
          }`}
        >
          {isAiOpen && (
            <AiAssistant
              isOpen={isAiOpen}
              onClose={() => setIsAiOpen(false)}
              userLatLng={userLocation}
              favoriteBeerName={passport?.favoriteBeerName}
            />
          )}
        </aside>

        {/* 🏆 SLIDE-OUT RIGHT HAND DRAWER: PIVNÍ PAS (Beer Passport) */}
        <aside
          className={`h-full bg-slate-900 flex-shrink-0 transition-all duration-300 z-25 ${
            userProfile && passport && isPassportOpen ? "w-full md:w-[420px] border-l border-amber-500/30" : "w-0 overflow-hidden border-l-0 pointer-events-none invisible opacity-0"
          }`}
        >
          {userProfile && passport && isPassportOpen && (
            <BeerPassport
              isOpen={isPassportOpen}
              onClose={() => setIsPassportOpen(false)}
              userProfile={userProfile}
              passport={passport}
              onLogout={handleLogout}
              onDeleteVisit={handleDeleteVisit}
              onUpdateFavoriteBeer={handleUpdateFavoriteBeer}
              onUpdateUserProfile={handleUpdateUserProfile}
            />
          )}
        </aside>

      </div>

      {/* 🧾 ADD/EDIT BEER MODAL COMPONENT WINDOW */}
      <AddBeerModal
        isOpen={isBeerModalOpen}
        onClose={() => {
          setIsBeerModalOpen(false);
          setEditingBeer(null);
        }}
        onSubmit={handleSubmitBeer}
        editingBeer={editingBeer}
      />

      {/* 🔐 LOGIN / REGISTRATION MODAL PANEL */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Pub } from "../types";
import { Search, Compass, MapPin, Plus, Check, ListFilter, Minus } from "lucide-react";

interface MapComponentProps {
  pubs: Pub[];
  selectedPubId: string | null;
  onSelectPub: (pubId: string | null) => void;
  onCreatePub: (name: string, lat: number, lng: number, address?: string) => Promise<void>;
  candidateCoords: { lat: number; lng: number } | null;
  setCandidateCoords: (coords: { lat: number; lng: number } | null) => void;
  userLocation: { lat: number; lng: number } | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function MapComponent({
  pubs,
  selectedPubId,
  onSelectPub,
  onCreatePub,
  candidateCoords,
  setCandidateCoords,
  userLocation,
  isSidebarOpen,
  onToggleSidebar,
}: MapComponentProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const candidateMarkerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const selectedPubIdRef = useRef<string | null>(selectedPubId);

  // Keep ref in sync for event listeners
  useEffect(() => {
    selectedPubIdRef.current = selectedPubId;
  }, [selectedPubId]);

  // Search address input state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // New pub naming modal inline state
  const [newPubName, setNewPubName] = useState("");
  const [newPubAddress, setNewPubAddress] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const L = (window as any).L;

  // 1. Initialize Map
  useEffect(() => {
    if (!L || mapInstanceRef.current || !mapElementRef.current) return;

    // Center of Prague
    const startLat = 50.0818;
    const startLng = 14.4286;
    const startZoom = 13;

    const map = L.map(mapElementRef.current, {
      zoomControl: false, // Custom position Zoom controls later or default topright
      attributionControl: true,
      tap: false // Disable legacy Leaflet mobile tap handler that causes ghost clicks and double taps on search or markers
    }).setView([startLat, startLng], startZoom);

    // Dark styled map tiles (CartoDB Dark Matter / Mapbox similar)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Geolocation attempt
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 14);
            
            // Add user location marker
            const userIcon = L.divIcon({
              html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg ring-4 ring-blue-500/30"></div>`,
              className: '',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            
            if (userLocationMarkerRef.current) {
              userLocationMarkerRef.current.setLatLng([latitude, longitude]);
            } else {
              userLocationMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup("<strong>Jste zde</strong>")
                .openPopup();
            }
          }
        },
        (error) => {
          console.warn("Geolocation permission declined or failed:", error);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    }

    // Set up click on Map to place a Candidate Marker for a new pub
    map.on("click", (e: any) => {
      // Robust defensive guard for phantom clicks on mobile:
      // If the user's click/touch targets or bubbles from a marker icon, pop-up, search form, or zoom widgets, ignore it completely.
      if (e.originalEvent && e.originalEvent.target) {
        const target = e.originalEvent.target as HTMLElement;
        if (
          target.closest(".leaflet-marker-icon") ||
          target.closest(".leaflet-popup") ||
          target.closest(".leaflet-control") ||
          target.closest(".leaflet-tooltip") ||
          target.closest("button") ||
          target.closest("input") ||
          target.closest("form")
        ) {
          return;
        }
      }

      const { lat, lng } = e.latlng;
      setCandidateCoords({ lat, lng });
      setShowAddForm(true);
      setNewPubName("");
      onSelectPub(null); // Deselect currently active pub
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Sync Existing Pub Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Clear existing active markers that are no longer in list
    Object.keys(markersRef.current).forEach((pubId) => {
      if (!pubs.find((p) => p.id === pubId)) {
        markersRef.current[pubId].remove();
        delete markersRef.current[pubId];
      }
    });

    // Add or update markers
    pubs.forEach((pub) => {
      const isSelected = pub.id === selectedPubId;
      
      // Calculate how many beers are tapped for simple badge number
      const beerCount = pub.beers.length;

      // Custom Beer marker HTML
      const markerHtml = `
        <div class="relative flex items-center justify-center transform transition-all duration-300 pointer-events-auto ${isSelected ? 'scale-125 z-50' : 'scale-100 hover:scale-110'}">
          <div class="w-9 h-9 flex items-center justify-center rounded-xl border-2 shadow-xl ${
            isSelected 
              ? 'bg-amber-500 border-white text-slate-950 beer-marker-pulse' 
              : beerCount > 0 
                ? 'bg-amber-600/90 border-amber-400/50 text-slate-100' 
                : 'bg-slate-700/90 border-slate-500/50 text-slate-300'
          }">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 11h1a3 3 0 0 1 0 6h-1"></path>
              <rect x="6" y="8" width="11" height="12" rx="2"></rect>
              <path d="M6 8a4 4 0 0 1 11 0"></path>
              <path d="M9 12v4"></path>
              <path d="M13 12v4"></path>
            </svg>
          </div>
          ${
            beerCount > 0 
              ? `<span class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-slate-950 shadow">${beerCount}</span>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      if (markersRef.current[pub.id]) {
        // Update position and icon
        markersRef.current[pub.id].setLatLng([pub.lat, pub.lng]);
        markersRef.current[pub.id].setIcon(customIcon);
      } else {
        // Create new marker
        const marker = L.marker([pub.lat, pub.lng], { icon: customIcon })
          .addTo(map)
          .on("click", (e: any) => {
            if (e.originalEvent) {
              e.originalEvent.stopPropagation();
            }
            L.DomEvent.stopPropagation(e);
            onSelectPub(pub.id);
            setCandidateCoords(null);
            setShowAddForm(false);
          });
        
        // Add a tooltip that appears on hover with the name of the pub and lowest price or count
        const priceInfo = pub.beers.length > 0
          ? `, od ${Math.min(...pub.beers.map(b => b.price))} Kč`
          : " (žádný čep)";
        
        marker.bindTooltip(`<strong>${pub.name}</strong>${priceInfo}`, {
          direction: 'top',
          offset: [0, -12],
          opacity: 0.9,
          className: 'bg-slate-900 border border-amber-500/30 text-white rounded-lg px-2 py-1 text-xs font-semibold shadow-lg'
        });

        markersRef.current[pub.id] = marker;
      }
    });
  }, [pubs, selectedPubId]);

  // 3. Pan map when selectedPub edits
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPubId) return;
    const pub = pubs.find((p) => p.id === selectedPubId);
    if (pub) {
      mapInstanceRef.current.setView([pub.lat, pub.lng], 15, { animate: true, duration: 0.5 });
    }
  }, [selectedPubId]);

  // 4. Sync Candidate Marker (the grey placeholder before creation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    if (candidateCoords) {
      const candidateHtml = `
        <div class="relative flex items-center justify-center scale-110 pointer-events-auto">
          <div class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-700/90 border-2 border-emerald-400 text-emerald-400 shadow-xl beer-marker-pulse">
            <svg class="w-6 h-6 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </div>
        </div>
      `;

      const candidateIcon = L.divIcon({
        html: candidateHtml,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (candidateMarkerRef.current) {
        candidateMarkerRef.current.setLatLng([candidateCoords.lat, candidateCoords.lng]);
      } else {
        candidateMarkerRef.current = L.marker([candidateCoords.lat, candidateCoords.lng], { icon: candidateIcon })
          .addTo(map);
      }
      
      map.setView([candidateCoords.lat, candidateCoords.lng], map.getZoom() < 14 ? 14 : map.getZoom(), { animate: true });
    } else {
      if (candidateMarkerRef.current) {
        candidateMarkerRef.current.remove();
        candidateMarkerRef.current = null;
      }
    }
  }, [candidateCoords]);

  // Reverse geocoding of candidate coords to automatically fetch Czech addresses
  useEffect(() => {
    if (!candidateCoords) {
      setNewPubAddress("");
      return;
    }

    const fetchAddress = async () => {
      setIsGeocodingAddress(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${candidateCoords.lat}&lon=${candidateCoords.lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "cs" // Prefer Czech street formats
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            const addr = data.address;
            let formatted = data.display_name;
            if (addr) {
              const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
              const houseNumber = addr.house_number || "";
              const city = addr.city || addr.town || addr.village || "";
              if (street && city) {
                formatted = `${street} ${houseNumber}${houseNumber ? ", " : ""}${city}`;
              } else if (city) {
                formatted = `${city}`;
              }
            }
            setNewPubAddress(formatted);
          }
        }
      } catch (err) {
        console.error("Failed to reverse geocode coordinate:", err);
      } finally {
        setIsGeocodingAddress(false);
      }
    };

    fetchAddress();
  }, [candidateCoords]);

  // 5. Geocoding address search using OpenStreetMap Nominatim
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    
    setIsSearching(true);
    setSearchError("");

    try {
      // Append "Czech Republic" to bound it nicely to CR
      const queryStr = encodeURIComponent(`${searchQuery}, Česká republika`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryStr}&limit=1`);
      
      if (!response.ok) throw new Error("Nepodařilo se připojit k vyhledávací službě.");
      
      const results = await response.json();
      
      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const targetLat = parseFloat(lat);
        const targetLng = parseFloat(lon);
        
        mapInstanceRef.current.flyTo([targetLat, targetLng], 15, { duration: 1.2 });
        
        setSearchQuery("");
      } else {
        setSearchError("Místo nebylo nalezeno. Zkuste upřesnit název.");
      }
    } catch (err: any) {
      console.error("Nominatim search failed:", err);
      setSearchError("Při hledání nastala chyba.");
    } finally {
      setIsSearching(false);
    }
  };

  // Find nearest pub action
  const handleCenterOnUser = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.5 });
          
          // Add or update marker
          const userIcon = L.divIcon({
            html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg ring-4 ring-blue-500/30"></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            userLocationMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(mapInstanceRef.current);
          }
          userLocationMarkerRef.current.bindPopup("<strong>Jste zde</strong>").openPopup();
        },
        (error) => {
          console.warn("Geolocation centering failed:", error);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    }
  };

  // Sync simulated/GPS location from App.tsx prop onto Leaflet map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L || !userLocation) return;

    const userIcon = L.divIcon({
      html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg ring-4 ring-blue-500/30 animate-pulse"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map);
    }

    userLocationMarkerRef.current.bindPopup("<strong>Jste zde</strong>").openPopup();
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
  }, [userLocation]);

  // Submit new pub creation
  const handleAddNewPubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPubName.trim() || !candidateCoords) return;

    try {
      await onCreatePub(newPubName.trim(), candidateCoords.lat, candidateCoords.lng, newPubAddress.trim());
      setCandidateCoords(null);
      setShowAddForm(false);
      setNewPubName("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      
      {/* 🏡 Address Search & Filters Bar combined on one line */}
      <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-[420px] z-[1000] flex gap-2">
        <form 
          onSubmit={handleAddressSearch} 
          className="flex-grow flex flex-col gap-1.5"
        >
          <div className="flex items-center h-10.5 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 text-slate-100 shadow-xl focus-within:border-amber-500 transition-all">
            <Search className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Hledat město, ulici nebo obec..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full focus:outline-none text-sm placeholder:text-slate-400"
            />
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            ) : (
              <button 
                type="submit" 
                className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 font-semibold text-slate-950 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              >
                Hledat
              </button>
            )}
          </div>
          {searchError && (
            <div className="bg-red-950/90 border border-red-500/30 text-red-200 text-xs py-1 px-3 rounded-lg backdrop-blur-md shadow-lg animate-fadeIn">
              {searchError}
            </div>
          )}
        </form>

        <button
          type="button"
          onClick={onToggleSidebar}
          title="Filtry a hospody"
          className={`flex items-center justify-center w-10.5 h-10.5 rounded-xl border shadow-xl transition-all flex-shrink-0 cursor-pointer ${
            isSidebarOpen
              ? "bg-amber-500 border-amber-400 text-slate-950"
              : "bg-slate-900/95 backdrop-blur-md border-amber-500/30 text-amber-505 text-amber-500 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ListFilter className="w-5 h-5" />
        </button>
      </div>

      {/* 📍 Map DOM Node */}
      <div id="beer-leaflet-map" ref={mapElementRef} className="w-full h-full" />

      {/* 🛠️ Bottom Left Map Controls (Zoom +, Zoom -, Locate) */}
      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2">
        {/* Zoom Stack */}
        <div className="flex flex-col bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl overflow-hidden shadow-xl">
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.zoomIn();
              }
            }}
            title="Přiblížit"
            className="w-10 h-10 flex items-center justify-center text-amber-500 hover:text-white hover:bg-slate-850 active:scale-95 transition-all border-b border-amber-500/10 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.zoomOut();
              }
            }}
            title="Oddálit"
            className="w-10 h-10 flex items-center justify-center text-amber-500 hover:text-white hover:bg-slate-850 active:scale-95 transition-all cursor-pointer"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Locate Me Button directly below zoom buttons */}
        <button
          type="button"
          onClick={handleCenterOnUser}
          title="Moje poloha"
          className="flex items-center justify-center w-10 h-10 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 text-amber-500 hover:text-white hover:bg-amber-500 hover:border-amber-400 hover:text-slate-950 rounded-xl shadow-xl transition-all cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* 🆕 Floating "Add Pub" Form when Candidate is Active */}
      {showAddForm && candidateCoords && (
        <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-[1050] bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 shadow-2xl md:w-96 animate-fadeSlideIn">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-display font-semibold text-emerald-400 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-emerald-400" />
              Nové místo na mapě
            </h3>
            <button
              onClick={() => {
                setCandidateCoords(null);
                setShowAddForm(false);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
            >
              Zrušit
            </button>
          </div>
          
          <p className="text-slate-400 text-[10px] mb-3 leading-relaxed">
            Vybrané souřadnice: <code className="text-slate-300">{candidateCoords.lat.toFixed(5)}, {candidateCoords.lng.toFixed(5)}</code>.
          </p>

          <form onSubmit={handleAddNewPubSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block p-0.5">Název hospody *</label>
              <input
                type="text"
                required
                placeholder="Např. Hostinec pod Lípou..."
                value={newPubName}
                onChange={(e) => setNewPubName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-slate-100"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block p-0.5">Adresa / Lokace</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={isGeocodingAddress ? "Vyhledávám adresu..." : "Zadejte adresu..."}
                  value={newPubAddress}
                  onChange={(e) => setNewPubAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-slate-100 pr-8"
                />
                {isGeocodingAddress && (
                  <div className="absolute right-2.5 top-2.5">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setCandidateCoords(null);
                  setShowAddForm(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Zpět
              </button>
              <button
                type="submit"
                disabled={!newPubName.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Uložit místo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

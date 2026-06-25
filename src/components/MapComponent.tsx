/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Pub } from "../types";
import { Search, Compass, MapPin, Plus, Check, ListFilter, Minus, Heart, X, ClipboardList } from "lucide-react";

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
  onBoundsChange?: (bounds: { swLat: number; swLng: number; neLat: number; neLng: number } | null) => void;
  theme: "dark" | "light";
  isAdmin?: boolean;
  unreadReportsCount?: number;
  onOpenReports?: () => void;
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
  onBoundsChange,
  theme,
  isAdmin = false,
  unreadReportsCount = 0,
  onOpenReports,
}: MapComponentProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const candidateMarkerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const selectedPubIdRef = useRef<string | null>(selectedPubId);
  const pubsRef = useRef<Pub[]>(pubs);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const searchLocationMarkerRef = useRef<any>(null);
  const [highlightedPubId, setHighlightedPubId] = useState<string | null>(null);

  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // Keep refs in sync for event listeners
  useEffect(() => {
    selectedPubIdRef.current = selectedPubId;
    if (selectedPubId) {
      setHighlightedPubId(null);
    }
  }, [selectedPubId]);

  useEffect(() => {
    pubsRef.current = pubs;
  }, [pubs]);

  // Clean up search marker when candidateCoords (adding a new pub) or selectedPubId changes
  useEffect(() => {
    if (selectedPubId || candidateCoords) {
      if (searchLocationMarkerRef.current) {
        searchLocationMarkerRef.current.remove();
        searchLocationMarkerRef.current = null;
      }
      setHighlightedPubId(null);
    }
  }, [selectedPubId, candidateCoords]);

  // Helper to calculate distance in meters using Haversine formula
  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
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

  // Search address input state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // New pub naming modal inline state
  const [newPubName, setNewPubName] = useState("");
  const [newPubAddress, setNewPubAddress] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

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

    // Base url based on user theme
    const tilesUrl = theme === "light"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    const tileLayer = L.tileLayer(tilesUrl, {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Set up ResizeObserver to dynamically update Leaflet sized tiles as container elements smoothly expand or narrow
    const resizeObserver = new ResizeObserver(() => {
      if (map) {
        map.invalidateSize({ animate: false });
      }
    });

    if (mapElementRef.current) {
      resizeObserver.observe(mapElementRef.current);
    }

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
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
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

    const handleBoundsChange = () => {
      if (!mapInstanceRef.current && map) {
        // Fallback reference if mapInstanceRef not fully set
        const bounds = map.getBounds();
        setMapBounds(bounds);
        if (onBoundsChangeRef.current) {
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          onBoundsChangeRef.current({
            swLat: sw.lat,
            swLng: sw.lng,
            neLat: ne.lat,
            neLng: ne.lng
          });
        }
        return;
      }
      const activeMap = mapInstanceRef.current;
      if (!activeMap) return;
      const bounds = activeMap.getBounds();
      setMapBounds(bounds);
      if (onBoundsChangeRef.current) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        onBoundsChangeRef.current({
          swLat: sw.lat,
          swLng: sw.lng,
          neLat: ne.lat,
          neLng: ne.lng
        });
      }
    };

    map.on("moveend", handleBoundsChange);
    map.on("zoomend", handleBoundsChange);
    
    // Initial bounds load
    setTimeout(handleBoundsChange, 500);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 1b. Switch map style when user switches between Light and Dark core theme
  useEffect(() => {
    if (tileLayerRef.current) {
      const url = theme === "light"
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      tileLayerRef.current.setUrl(url);
    }
  }, [theme]);

  // 2. Sync Existing Pub Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Pad active bounds slightly so markers near the borders do not pop in/out aggressively on slight pan
    const bounds = mapBounds ? mapBounds.pad(0.12) : null;
    const visiblePubs = pubs.filter((pub) => {
      if (pub.id === selectedPubId) return true;
      if (!bounds) return true;
      return bounds.contains([pub.lat, pub.lng]);
    });

    // Clear existing active markers that are no longer in visible list
    Object.keys(markersRef.current).forEach((pubId) => {
      if (!visiblePubs.find((p) => p.id === pubId)) {
        markersRef.current[pubId].remove();
        delete markersRef.current[pubId];
      }
    });

    // Add or update markers
    visiblePubs.forEach((pub) => {
      const isSelected = pub.id === selectedPubId || pub.id === highlightedPubId;
      
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
            setHighlightedPubId(null);
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
  }, [pubs, selectedPubId, highlightedPubId, mapBounds]);

  // 3. Pan map when selectedPub edits
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPubId) return;
    const pub = pubsRef.current.find((p) => p.id === selectedPubId);
    if (pub) {
      // First immediate pan to give instant response
      mapInstanceRef.current.setView([pub.lat, pub.lng], 15, { animate: true, duration: 0.4 });
      
      // Delay to fine-tune alignment with transition-all layout sidebar animations (300ms)
      const timer = setTimeout(() => {
        if (mapInstanceRef.current && selectedPubIdRef.current === selectedPubId) {
          mapInstanceRef.current.invalidateSize({ animate: false });
          mapInstanceRef.current.panTo([pub.lat, pub.lng], { animate: true, duration: 0.4 });
        }
      }, 320);

      return () => clearTimeout(timer);
    }
  }, [selectedPubId]);

  // 3b. Align centered map when sidebar collapses/opens
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (selectedPubIdRef.current) {
        const pub = pubsRef.current.find(p => p.id === selectedPubIdRef.current);
        if (pub) {
          map.panTo([pub.lat, pub.lng], { animate: true, duration: 0.4 });
        }
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

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
    
    // Blur any focused element (like the search input) immediately to dismiss the mobile keyboard.
    // This allows the browser to trigger resize events before we start any flyTo map animation,
    // avoiding interruption of the transition when keyboard closes and layout updates.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setIsSearching(true);
    setSearchError("");

    try {
      // Append "Czech Republic" to bound it nicely to CR
      const queryStr = encodeURIComponent(`${searchQuery}, Česká republika`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryStr}&limit=1`);
      
      if (!response.ok) throw new Error("Nepodařilo se připojit k vyhledávací službě.");
      
      const results = await response.json();
      
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        const targetLat = parseFloat(lat);
        const targetLng = parseFloat(lon);
        
        // Remove existing search marker
        if (searchLocationMarkerRef.current) {
          searchLocationMarkerRef.current.remove();
          searchLocationMarkerRef.current = null;
        }

        const searchedAddress = searchQuery.trim();

        // Check if there is an existing pub near the target search location
        let closestPub = null;
        let closestDist = Infinity;
        
        const allPubs = pubsRef.current || [];
        for (const p of allPubs) {
          const dist = getDistanceInMeters(targetLat, targetLng, p.lat, p.lng);
          if (dist < closestDist) {
            closestDist = dist;
            closestPub = p;
          }
        }

        // Use a short delay before flyTo so the mobile keyboard closing and layout size adjustments have stabilized
        setTimeout(() => {
          if (!mapInstanceRef.current) return;

          // If closest pub is within 120 meters, center and highlight it instead of placing a general pin
          if (closestPub && closestDist <= 120) {
            setHighlightedPubId(closestPub.id);
            onSelectPub(null); // Center & highlight only, do not open details panel
            mapInstanceRef.current.flyTo([closestPub.lat, closestPub.lng], 16, { duration: 1.2 });
          } else {
            // Otherwise, put a custom styled pulsing search location anchor pin (puntík)
            const pulsingIcon = L.divIcon({
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-8 h-8 bg-amber-500/35 rounded-full animate-ping"></div>
                  <div class="w-6 h-6 flex items-center justify-center rounded-full bg-slate-950 border-2 border-amber-500 shadow-xl text-amber-500 cursor-pointer">
                    <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                </div>
              `,
              className: "",
              iconSize: [32, 32],
              iconAnchor: [16, 24],
              popupAnchor: [0, -24]
            });

            searchLocationMarkerRef.current = L.marker([targetLat, targetLng], { icon: pulsingIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup(`<strong class="popup-text font-bold">${searchedAddress}</strong>`, {
                className: "custom-leaflet-popup"
              })
              .on("click", (e: any) => {
                if (e.originalEvent) {
                  e.originalEvent.stopPropagation();
                }
                L.DomEvent.stopPropagation(e);

                // Start creating a new pub at this search location
                setCandidateCoords({ lat: targetLat, lng: targetLng });
                setNewPubName("");
                setNewPubAddress(searchedAddress);
                setShowAddForm(true);
                onSelectPub(null);

                // Remove this search marker
                if (searchLocationMarkerRef.current) {
                  searchLocationMarkerRef.current.remove();
                  searchLocationMarkerRef.current = null;
                }
              })
              .openPopup();

            mapInstanceRef.current.flyTo([targetLat, targetLng], 16, { duration: 1.2 });
            onSelectPub(null); // Deselect currently active pub as we highlighted the address pin
          }
          
          setSearchQuery("");
        }, 150);

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
    if (!mapInstanceRef.current || !L) return;

    // Recalculate dimensions immediately before centering to ensure absolute precision
    mapInstanceRef.current.invalidateSize({ animate: false });

    const currentZoom = mapInstanceRef.current.getZoom();
    const targetZoom = Math.max(currentZoom || 15, 17);

    // 1. If we already have the tracked userLocation in state, fly to it immediately (speed-up)
    if (userLocation) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], targetZoom, { duration: 1.5 });
      
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
          .addTo(mapInstanceRef.current);
      }
      userLocationMarkerRef.current.bindPopup("<strong>Jste zde</strong>").openPopup();
      return;
    }

    // 2. Hardware level query fallback in case position is not loaded yet
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ animate: false });
            const currZoom = mapInstanceRef.current.getZoom();
            const fallbackTargetZoom = Math.max(currZoom || 15, 17);
            mapInstanceRef.current.flyTo([latitude, longitude], fallbackTargetZoom, { duration: 1.5 });
          }
          
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
          alert("Nepodařilo se zaměřit vaši GPS polohu. Ujistěte se prosím, zda máte zapnuté určování polohy v nastavení telefonu a povolili jste sdílení.");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      alert("Určování polohy není podporováno vaším prohlížečem.");
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
      // Create user location marker and set initial map focus only the first time
      userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("<strong>Jste zde</strong>")
        .openPopup();
      map.setView([userLocation.lat, userLocation.lng], 15);
    }
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
              placeholder="Hledat..."
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
      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col items-start gap-2">
        {/* Zoom Stack */}
        <div className="w-10 flex flex-col bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl overflow-hidden shadow-xl">
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

        {/* Locate Me and Donate Buttons in a horizontal row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCenterOnUser}
            title="Moje poloha"
            className="flex items-center justify-center w-10 h-10 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 text-amber-500 hover:text-white hover:bg-amber-500 hover:border-amber-400 hover:text-slate-950 rounded-xl shadow-xl transition-all cursor-pointer"
          >
            <Compass className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowDonateModal(true)}
            title="Podpořit vývojáře"
            className="flex items-center justify-center w-10 h-10 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 text-amber-500 hover:text-white hover:bg-amber-500 hover:border-amber-400 hover:text-slate-950 rounded-xl shadow-xl transition-all cursor-pointer"
          >
            <Heart className="w-5 h-5 fill-amber-500/20" />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenReports}
              title="Administrace nahlášených chyb"
              className="relative flex items-center justify-center w-10 h-10 bg-slate-900/95 backdrop-blur-md border border-red-500/30 text-red-500 hover:text-white hover:bg-red-600 hover:border-red-500 rounded-xl shadow-xl transition-all cursor-pointer"
            >
              <ClipboardList className="w-5 h-5" />
              {unreadReportsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-extrabold rounded-full text-[9px] w-5 h-5 flex items-center justify-center animate-bounce border border-slate-950 shadow">
                  {unreadReportsCount}
                </span>
              )}
            </button>
          )}
        </div>
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

      {/* 🧡 Floating / Backdrop Custom Donation Modal */}
      {showDonateModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl max-w-sm w-full space-y-4 animate-scaleIn relative">
            <button 
              onClick={() => setShowDonateModal(false)}
              className="absolute top-3.5 right-3.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                <Heart className="w-5 h-5 fill-amber-500/10 animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-display font-bold text-slate-100 uppercase tracking-wide">Podpořit sládka</h3>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">Dobrovolný dar na provoz</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Pivní pas i celou českou pivní mapu pro tebe tvořím dobrovolně ve svém volném čase. Pokud ti aplikace pomohla najít orosený půllitr nebo se ti líbí, můžeš mě podpořit jedním pivem! 😉
            </p>
            
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 text-[10px] text-slate-450 leading-normal font-medium">
              ⚠️ <strong>Upozornění:</strong> Jedná se o čistě dobrovolný dar. Za příspěvek nezískáte žádné výhody ani prémiové funkce. Pouze vřelý pocit a moji vděčnost.
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDonateModal(false)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Zpět
              </button>
              <a 
                href="https://www.buymeacoffee.com/davidkuncar" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-[2] flex items-center justify-center gap-1.5 py-1.5 bg-[#f58f00] hover:bg-[#ff9e15] text-black font-extrabold font-display rounded-xl text-xs transition-all shadow-md active:scale-95 text-center cursor-pointer"
              >
                <span>🍺</span>
                <span>Pozvat mě na jedno</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

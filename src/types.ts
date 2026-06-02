/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Beer {
  id: string;
  name: string;      // Name of the beer (e.g. Radegast, Pilsner Urquell, Bernard)
  degrees: string;   // Beer degrees/Plato (e.g. 10°, 11°, 12°, 12.3° or just 12)
  price: number;     // Price in CZK (e.g. 59)
  style?: string;    // Style (e.g. Ležák, IPA, Neumann, Stout, Tmavé)
  brewery?: string;  // Brewery / Pivovar (e.g. Plzeňský Prazdroj, Bernard)
  description?: string; // Short notes
}

export interface Pub {
  id: string;
  name: string;        // Name of the pub/restaurant (e.g. Hostinec u Vodomila, Bar No. 7)
  lat: number;         // Latitude coordinate
  lng: number;         // Longitude coordinate
  address?: string;    // Decoded address or location custom notes
  notes?: string;      // Pub general notes
  beers: Beer[];       // List of beers currently on tap ("točí se")
  updatedAt?: string;  // Date updated
}

export interface BeerAutocompleteSuggestion {
  name: string;        // autocompleted name
  degrees: string;     // suggested degrees (e.g. 12°)
  style: string;       // suggested style (e.g. Světlý ležák)
  brewery: string;     // suggested brewery (e.g. Budějovický Budvar)
  notes?: string;      // short description / fun fact
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface BeerVisit {
  id: string; // unique visit ID
  pubId: string;
  pubName: string;
  beerId?: string | null; // empty if just "visit without beer"
  beerName?: string | null;
  degrees?: string | null;
  style?: string | null;
  brewery?: string | null;
  timestamp: string; // ISO string
}

export interface UserPassport {
  userEmail: string;
  visitedPubIds: string[]; // unique pub IDs
  visits: BeerVisit[];
  favoriteBeerName?: string; // manually chosen
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  requirement: string;
  category: "visits" | "beers" | "styles" | "breweries" | "special";
  iconName: string; // lucide icon name
  progress: number; // current progress count
  target: number; // target count
  unlocked: boolean;
  unlockedAt?: string;
}


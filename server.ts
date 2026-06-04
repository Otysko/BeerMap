/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const HOST = "0.0.0.0";
const DB_FILE = path.join(process.cwd(), "pubs_data.json");
const PASSPORTS_FILE = path.join(process.cwd(), "user_passports.json");

// Helper to interact with the passports database
function readPassportsFromDb(): Record<string, any> {
  try {
    if (!fs.existsSync(PASSPORTS_FILE)) {
      fs.writeFileSync(PASSPORTS_FILE, JSON.stringify({}, null, 2), "utf8");
      return {};
    }
    const data = fs.readFileSync(PASSPORTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading passports db, returning empty object:", err);
    return {};
  }
}

function writePassportsToDb(passports: Record<string, any>) {
  try {
    fs.writeFileSync(PASSPORTS_FILE, JSON.stringify(passports, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing passports db:", err);
  }
}

// Middleware
app.use(express.json());

// Initialize Gemini SDK lazily to prevent startup crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARN: GEMINI_API_KEY is not defined. AI features will be disabled.");
      throw new Error("GEMINI_API_KEY environment variable is required for AI features.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Czech Pub & Beer default seed data
const SEED_PUBS = [
  {
    id: "pub-1",
    name: "Lokál Dlouhááá",
    lat: 50.090333,
    lng: 14.425983,
    address: "Dlouhá 731/33, 110 00 Praha 1",
    notes: "Legendární pražská pivnice proslulá špičkově ošetřenou plzní čepovanou přímo z tanků.",
    beers: [
      {
        id: "beer-1-1",
        name: "Pilsner Urquell",
        degrees: "12°",
        price: 64,
        style: "Světlý ležák",
        brewery: "Plzeňský Prazdroj",
        description: "Dokonalá tanková plzeň čepovaná na hladinku, šnyt i mlíko."
      },
      {
        id: "beer-1-2",
        name: "Velkopopovický Kozel Černý",
        degrees: "10°",
        price: 58,
        style: "Tmavé výčepní",
        brewery: "Pivovar Velké Popovice",
        description: "Jemné karamelové tmavé pivo s vyváženou doznívající hořkostí."
      }
    ]
  },
  {
    id: "pub-2",
    name: "Zlý časy",
    lat: 50.063812,
    lng: 14.444265,
    address: "Čestmírova 390/5, 140 00 Praha 4",
    notes: "Útulná malostránská a nuselská klasika s mnoha pípami s nabídkou z malých nezávislých pivovarů.",
    beers: [
      {
        id: "beer-2-1",
        name: "Matuska Apollo Galaxy",
        degrees: "13°",
        price: 89,
        style: "American Pale Ale (APA)",
        brewery: "Pivovar Matuška",
        description: "Svrchně kvašené pivo s výrazným chmelovým aroma citrusu a tropického ovoce."
      },
      {
        id: "beer-2-2",
        name: "Únětické Pivo Světlé",
        degrees: "10°",
        price: 52,
        style: "Světlé výčepní",
        brewery: "Únětický pivovar",
        description: "Poctivé nefiltrované pivo z regionálního pivovaru s příjemným řízem."
      },
      {
        id: "beer-2-3",
        name: "Bernard Nefiltrovaný ležák",
        degrees: "11°",
        price: 56,
        style: "Světlý ležák",
        brewery: "Rodinný pivovar Bernard",
        description: "Pivo s výraznou chmelovou vůní, hustou pěnou a lahodnou plností."
      }
    ]
  },
  {
    id: "pub-3",
    name: "Hostinec U Jelínků",
    lat: 50.082725,
    lng: 14.420138,
    address: "Charvátova 110/2, 110 00 Praha 1",
    notes: "Jedna z nejstarších nepřetržitě fungujících plzeňských pivnic v Praze s neopakovatelnou atmosférou.",
    beers: [
      {
        id: "beer-3-1",
        name: "Pilsner Urquell",
        degrees: "12°",
        price: 61,
        style: "Světlý ležák",
        brewery: "Plzeňský Prazdroj",
        description: "Tradiční plzeňské točené s perfektním řízem a hustou krémovou pěnou."
      }
    ]
  },
  {
    id: "pub-4",
    name: "Pivovarský Klub Benedict",
    lat: 50.091189,
    lng: 14.444985,
    address: "Křižíkova 272/17, 186 00 Praha 8 - Karlín",
    notes: "Otevřený prostor pro milovníky piva v Karlíně s rotujícími pípami a stovkami lahví z celého světa.",
    beers: [
      {
        id: "beer-4-1",
        name: "Břevnovský Benedict Světlý ležák",
        degrees: "12°",
        price: 68,
        style: "Světlý ležák",
        brewery: "Břevnovský klášterní pivovar",
        description: "Chlebnaté, středně hořké pivo čepované přímo od zdroje v karlínské pobočce."
      },
      {
        id: "beer-4-2",
        name: "Kocour Stout",
        degrees: "12°",
        price: 78,
        style: "Stout",
        brewery: "Pivovar Kocour Varnsdorf",
        description: "Tmavé svrchně kvašené pivo s výraznou chutí po kávě a čokoládě."
      }
    ]
  }
];

// Helper to interact with the database
function readPubsFromDb(): any[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(SEED_PUBS, null, 2), "utf8");
      return SEED_PUBS;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, returning seed data:", err);
    return SEED_PUBS;
  }
}

function writePubsToDb(pubs: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(pubs, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to database:", err);
  }
}

// API Routes

// Read all pubs
app.get("/api/pubs", (req, res) => {
  const pubs = readPubsFromDb();
  res.json(pubs);
});

// Create a new pub
app.post("/api/pubs", (req, res) => {
  const { name, lat, lng, address, notes } = req.body;
  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "Název hospody, zeměpisná šířka (lat) a délka (lng) jsou povinné údaje." });
    return;
  }

  const pubs = readPubsFromDb();
  const newPub = {
    id: `pub-${Date.now()}`,
    name,
    lat,
    lng,
    address: address || "",
    notes: notes || "",
    beers: [],
    updatedAt: new Date().toISOString()
  };

  pubs.push(newPub);
  writePubsToDb(pubs);
  res.status(201).json(newPub);
});

// Update a pub (change name, coordinates, notes)
app.put("/api/pubs/:pubId", (req, res) => {
  const { pubId } = req.params;
  const { name, lat, lng, address, notes } = req.body;

  const pubs = readPubsFromDb();
  const index = pubs.findIndex((p) => p.id === pubId);

  if (index === -1) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }

  pubs[index] = {
    ...pubs[index],
    name: name !== undefined ? name : pubs[index].name,
    lat: lat !== undefined ? lat : pubs[index].lat,
    lng: lng !== undefined ? lng : pubs[index].lng,
    address: address !== undefined ? address : pubs[index].address,
    notes: notes !== undefined ? notes : pubs[index].notes,
    updatedAt: new Date().toISOString()
  };

  writePubsToDb(pubs);
  res.json(pubs[index]);
});

// Delete a pub
app.delete("/api/pubs/:pubId", (req, res) => {
  const { pubId } = req.params;
  const pubs = readPubsFromDb();
  const filtered = pubs.filter((p) => p.id !== pubId);

  if (pubs.length === filtered.length) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }

  writePubsToDb(filtered);
  res.json({ success: true, message: "Hospoda byla odstraněna." });
});

// Add a beer to a pub, or update an existing one
app.post("/api/pubs/:pubId/beers", (req, res) => {
  const { pubId } = req.params;
  const { id, name, degrees, price, style, brewery, description } = req.body;

  if (!name || price === undefined) {
    res.status(400).json({ error: "Název piva a cena za půllitr jsou povinné údaje." });
    return;
  }

  const pubs = readPubsFromDb();
  const pubIndex = pubs.findIndex((p) => p.id === pubId);

  if (pubIndex === -1) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }

  const pub = pubs[pubIndex];
  let beerId = id;
  const existingBeerIndex = beerId ? pub.beers.findIndex((b: any) => b.id === beerId) : -1;

  const newBeer = {
    id: beerId || `beer-${Date.now()}`,
    name,
    degrees: degrees || "12°",
    price: Number(price),
    style: style || "Světlý ležák",
    brewery: brewery || "Neznámý pivovar",
    description: description || ""
  };

  if (existingBeerIndex > -1) {
    // Update existing beer
    pub.beers[existingBeerIndex] = newBeer;
  } else {
    // Add new beer
    pub.beers.push(newBeer);
  }

  pub.updatedAt = new Date().toISOString();
  writePubsToDb(pubs);
  res.json(pub);
});

// Delete a beer from a pub
app.delete("/api/pubs/:pubId/beers/:beerId", (req, res) => {
  const { pubId, beerId } = req.params;

  const pubs = readPubsFromDb();
  const pubIndex = pubs.findIndex((p) => p.id === pubId);

  if (pubIndex === -1) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }

  const pub = pubs[pubIndex];
  const initialCount = pub.beers.length;
  pub.beers = pub.beers.filter((b: any) => b.id !== beerId);

  if (pub.beers.length === initialCount) {
    res.status(404).json({ error: "Pivo nebylo v této hospodě nalezeno." });
    return;
  }

  pub.updatedAt = new Date().toISOString();
  writePubsToDb(pubs);
  res.json(pub);
});


// Gemini AI Route 1: Autocomplete details for a typed beer name
app.post("/api/gemini/beer-info", async (req, res) => {
  const { beerName } = req.body;
  
  if (!beerName || beerName.trim().length === 0) {
    res.status(400).json({ error: "Název piva je prázdný." });
    return;
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Navrhni pivní detaily pro zadané pivo "${beerName}". Použij k tomu své pivovarnické znalosti, typické stupně a styl, kterým je v České republice známé. Pokud se jedná o neznámé pivo, odhadni odpovídající údaje realisticky podle českých tradic.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Jste přední český pivní expert, sládek a someliér. Vaším úkolem je poskytovat přesné, detailní a realistické informace o různých značkách a druzích piv, zejména o stupňovitosti, stylu (např. ležák, ejl, tmavé, stout atd.), výrobci (pivovaru) a krátkou vtipnou tasting poznámku v češtině.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Značka a název piva, urovnaný do standardní podoby" },
            degrees: { type: Type.STRING, description: "Typický stupeň piva (např. '12°' nebo '11°'). Vždy s kroužkem stupně." },
            style: { type: Type.STRING, description: "Pivní styl česky, např. 'Světlý ležák', 'IPA', 'Plný ležák', 'Tmavý ležák', 'Pšeničné pivo'." },
            brewery: { type: Type.STRING, description: "Pivovar, který pivo vaří (např. 'Plzeňský Prazdroj', 'Rodinný pivovar Bernard', 'Pivovar Matuška')." },
            notes: { type: Type.STRING, description: "Atraktivní, krátká chuťová charakteristika nebo zajímavost (max 15 slov česky)." }
          },
          required: ["name", "degrees", "style", "brewery", "notes"]
        }
      }
    });

    const jsonText = response.text;
    if (jsonText) {
      const parsedData = JSON.parse(jsonText.trim());
      res.json(parsedData);
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error: any) {
    console.error("Gemini beer-info autocompletion failed:", error);
    // Graceful fallback if Gemini API is disabled, unavailable, or limits hit
    res.json({
      name: beerName,
      degrees: "12°",
      style: "Světlý ležák",
      brewery: "Neznámý pivovar",
      notes: "Informace nebyly staženy (zkontrolujte GEMINI_API_KEY). Česká klasika, která nikdy nezklame."
    });
  }
});


// Gemini AI Route 2: Chat and ask food pairings, recommendations, or trivia
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, userLatLng } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Historie zpráv chybí nebo je neplatná." });
    return;
  }

  try {
    const ai = getGeminiClient();
    const currentPubs = readPubsFromDb();
    
    // Inject the current pubs and draft beers into the system prompt as contextual database!
    // This allows Gemini to answer commands like: "Kde čepují Plzeň?" or "Kam mám jít na IPU?" or "Ukaž mi nejlevnější pivo."
    const formattedPubsContext = currentPubs.map(p => {
      const beerString = p.beers.map((b: any) => `- ${b.name} (${b.degrees}, ${b.price} Kč, styl: ${b.style || "nezařazen"})`).join("\n");
      return `Hospoda "${p.name}" na pozici [lat: ${p.lat}, lng: ${p.lng}], adresa: ${p.address || "Neuvedena"}.\nPoznámka: ${p.notes || ""}\nČepovaná piva zde:\n${beerString || "- Žádná piva zatím nejsou nahlášena"}`;
    }).join("\n\n");

    const systemInstruction = `Jste chytrý, přátelský český výčepní a pivní someliér (přezdívaný 'Hospodský Kecal'). Odpovídáte na dotazy uživatelů ohledně piva v češtině, s humorem, lehkým slangem a velkou autoritou přes pivo. 
Doporučujete piva k jídlu, radíte, jaké stupně jsou nejlepší na co, a vysvětlujete pivní kulturu (např. co je hladinka, šnyt, mlíko, čochtan, nadvakrát nalité pivo).

Zde je aktuální databáze hospod na mapě, kterou spravuje uživatel. Odpovídejte s ohledem na tyto informace! Když se uživatel zeptá kde co točí nebo kde je nejlevnější pivo, odkazujte se přímo na tyto konkrétní hospody:
${formattedPubsContext}

${userLatLng ? `Aktuální poloha uživatele na mapě je přibližně: [Šířka: ${userLatLng.lat}, Délka: ${userLatLng.lng}]. Tuto informaci můžeš využít k doporučení nejbližší hospody.` : ""}

Pište stručně, lidově, poutavě. Používejte české pivní výrazy (pivečko, škopek, natočit hladinku, pěna jak smetana). Odpovědi formátujte do Markdownu (odrážky, tučné písmo).`;

    // Process chat history
    // Get the latest query
    const latestQuery = messages[messages.length - 1].text;
    
    // Convert previous dialogue to Gemini content roles
    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.8
      }
    });

    res.json({
      text: response.text || "Copak bys chtěl vědět o pivečku, kamaráde? Zeptej se mě znova."
    });
  } catch (error: any) {
    console.error("Gemini chat failed:", error);
    res.status(500).json({ 
      error: "Nepodařilo se komunikovat se znalcem piva.",
      fallback: "Ahoj! Vypadá to, že můj výčepní modul má zrovna sanitaci (chybí GEMINI_API_KEY nebo selhalo spojení). Ale pivo čepujeme dál! Můžeš si vesele klikat do mapy a zakládat své oblíbené hospůdky."
    });
  }
});


// ==========================================
// 🍺 USER PASSPORT (PIVNÍ PAS) API ROUTES
// ==========================================

// Get or initialize user passport
app.get("/api/passports/:email", (req, res) => {
  const { email } = req.params;
  if (!email) {
    res.status(400).json({ error: "E-mail je povinný údaj." });
    return;
  }
  const dbPassports = readPassportsFromDb();
  const lowerEmail = email.toLowerCase().trim();
  if (!dbPassports[lowerEmail]) {
    dbPassports[lowerEmail] = {
      userEmail: lowerEmail,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
    writePassportsToDb(dbPassports);
  }
  res.json(dbPassports[lowerEmail]);
});

// Log a visit to a pub / beer consumption
app.post("/api/passports/:email/visits", (req, res) => {
  const { email } = req.params;
  const { pubId, pubName, beerId, beerName, degrees, style, brewery } = req.body;
  if (!email || !pubId || !pubName) {
    res.status(400).json({ error: "E-mail, ID hospody a název hospody jsou povinné údaje." });
    return;
  }
  const dbPassports = readPassportsFromDb();
  const lowerEmail = email.toLowerCase().trim();
  if (!dbPassports[lowerEmail]) {
    dbPassports[lowerEmail] = {
      userEmail: lowerEmail,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
  }

  const visit = {
    id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    pubId,
    pubName,
    beerId: beerId || null,
    beerName: beerName || null,
    degrees: degrees || null,
    style: style || null,
    brewery: brewery || null,
    timestamp: new Date().toISOString()
  };

  dbPassports[lowerEmail].visits.push(visit);

  // Re-calculate visited unique pub IDs
  const visitedPubsSet = new Set<string>(dbPassports[lowerEmail].visitedPubIds);
  visitedPubsSet.add(pubId);
  dbPassports[lowerEmail].visitedPubIds = Array.from(visitedPubsSet);

  writePassportsToDb(dbPassports);
  res.status(201).json(dbPassports[lowerEmail]);
});

// Delete a visit
app.delete("/api/passports/:email/visits/:visitId", (req, res) => {
  const { email, visitId } = req.params;
  if (!email || !visitId) {
    res.status(400).json({ error: "E-mail a ID návštěvy jsou povinné údaje." });
    return;
  }
  const dbPassports = readPassportsFromDb();
  const lowerEmail = email.toLowerCase().trim();
  if (!dbPassports[lowerEmail]) {
    res.status(404).json({ error: "Pivní pas tohoto uživatele neexistuje." });
    return;
  }

  dbPassports[lowerEmail].visits = dbPassports[lowerEmail].visits.filter(
    (v: any) => v.id !== visitId
  );

  // Re-calculate visited unique pub IDs
  const visitedPubsSet = new Set<string>();
  dbPassports[lowerEmail].visits.forEach((v: any) => {
    visitedPubsSet.add(v.pubId);
  });
  dbPassports[lowerEmail].visitedPubIds = Array.from(visitedPubsSet);

  writePassportsToDb(dbPassports);
  res.json(dbPassports[lowerEmail]);
});

// Save or set manually chosen Favorite Beer Name
app.post("/api/passports/:email/favorite-beer", (req, res) => {
  const { email } = req.params;
  const { favoriteBeerName } = req.body;
  if (!email) {
    res.status(400).json({ error: "E-mail je povinný údaj." });
    return;
  }
  const dbPassports = readPassportsFromDb();
  const lowerEmail = email.toLowerCase().trim();
  if (!dbPassports[lowerEmail]) {
    dbPassports[lowerEmail] = {
      userEmail: lowerEmail,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
  }

  dbPassports[lowerEmail].favoriteBeerName = favoriteBeerName || "";
  writePassportsToDb(dbPassports);
  res.json(dbPassports[lowerEmail]);
});


// Bulk sync-restore from client's localStorage to protect against Render.com ephemeral disk wipes
app.post("/api/sync-restore", (req, res) => {
  const { pubs, passports } = req.body;
  
  if (Array.isArray(pubs) && pubs.length > 0) {
    writePubsToDb(pubs);
    console.log(`[Sync] Restored ${pubs.length} pubs to database.`);
  }
  
  if (passports && typeof passports === "object" && Object.keys(passports).length > 0) {
    const currentPassports = readPassportsFromDb();
    const merged = { ...currentPassports, ...passports };
    writePassportsToDb(merged);
    console.log(`[Sync] Restored ${Object.keys(passports).length} passports to database.`);
  }
  
  res.json({ success: true });
});


// Vite middleware integration for full-stack build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🍺 Pivní Mapa Express Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

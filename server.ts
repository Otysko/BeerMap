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
import sql from "mssql";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const DB_FILE = path.join(process.cwd(), "pubs_data.json");
const PASSPORTS_FILE = path.join(process.cwd(), "user_passports.json");

// Define SEED_PUBS first so it can be referenced in database setup
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

// Helper to interact with the local JSON passports database
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

// Helper to interact with local JSON pubs database
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

// 🗄️ AZURE SQL DATABASE COUPLING STATE
let mssqlPool: sql.ConnectionPool | null = null;
let isSqlMode = false;

// Create DB Schema if connected to Azure SQL (Idempotent)
async function createSqlTablesIfNotExist() {
  if (!mssqlPool) return;
  const req = mssqlPool.request();
  
  try {
    // 1. Create pubs table
    await req.query(`
      IF OBJECT_ID('pubs', 'U') IS NULL
      CREATE TABLE pubs (
        id VARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        lat FLOAT NOT NULL,
        lng FLOAT NOT NULL,
        address NVARCHAR(255),
        notes NVARCHAR(MAX),
        updatedAt VARCHAR(50),
        createdAt VARCHAR(50),
        createdBy NVARCHAR(100),
        updatedBy NVARCHAR(100)
      )
    `);
    
    // 2. Create beers table
    await req.query(`
      IF OBJECT_ID('beers', 'U') IS NULL
      CREATE TABLE beers (
        id VARCHAR(50) PRIMARY KEY,
        pubId VARCHAR(50) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        degrees NVARCHAR(20),
        price FLOAT NOT NULL,
        style NVARCHAR(100),
        brewery NVARCHAR(100),
        description NVARCHAR(MAX),
        createdAt VARCHAR(50),
        createdBy NVARCHAR(100),
        updatedAt VARCHAR(50),
        updatedBy NVARCHAR(100),
        FOREIGN KEY (pubId) REFERENCES pubs(id) ON DELETE CASCADE
      )
    `);

    // Gracefully run ALTER TABLEs to inject columns if tables already exist
    try {
      await req.query("ALTER TABLE pubs ADD createdAt VARCHAR(50)");
    } catch (e) {}
    try {
      await req.query("ALTER TABLE pubs ADD createdBy NVARCHAR(100)");
    } catch (e) {}
    try {
      await req.query("ALTER TABLE pubs ADD updatedBy NVARCHAR(100)");
    } catch (e) {}
    try {
      await req.query("ALTER TABLE beers ADD createdAt VARCHAR(50)");
    } catch (e) {}
    try {
      await req.query("ALTER TABLE beers ADD createdBy NVARCHAR(100)");
    } catch (e) {}
    try {
      await req.query("ALTER TABLE beers ADD updatedAt VARCHAR(50)");
    } catch (e) {}
    try {
      await req.query("ALTER TABLE beers ADD updatedBy NVARCHAR(100)");
    } catch (e) {}
    
    // 3. Create passports table
    await req.query(`
      IF OBJECT_ID('passports', 'U') IS NULL
      CREATE TABLE passports (
        email NVARCHAR(100) PRIMARY KEY,
        userName NVARCHAR(100),
        password NVARCHAR(100),
        favoriteBeerName NVARCHAR(100)
      )
    `);
    
    // 4. Create visits table
    await req.query(`
      IF OBJECT_ID('visits', 'U') IS NULL
      CREATE TABLE visits (
        id VARCHAR(50) PRIMARY KEY,
        email NVARCHAR(100) NOT NULL,
        pubId VARCHAR(50) NOT NULL,
        pubName NVARCHAR(100) NOT NULL,
        beerId VARCHAR(50),
        beerName NVARCHAR(100),
        degrees NVARCHAR(20),
        style NVARCHAR(100),
        brewery NVARCHAR(100),
        timestamp VARCHAR(50),
        FOREIGN KEY (email) REFERENCES passports(email) ON DELETE CASCADE
      )
    `);

    // Seed default pubs if Azure SQL tables are brand new and empty
    const pubCountResult = await req.query("SELECT COUNT(*) as cnt FROM pubs");
    if (pubCountResult.recordset[0].cnt === 0) {
      console.log("🌱 Database is empty! Seeding default Czech pubs into Azure SQL Database...");
      for (const p of SEED_PUBS) {
        await mssqlPool.request()
          .input("id", sql.VarChar(50), p.id)
          .input("name", sql.NVarChar(100), p.name)
          .input("lat", sql.Float, p.lat)
          .input("lng", sql.Float, p.lng)
          .input("address", sql.NVarChar(255), p.address)
          .input("notes", sql.NVarChar(sql.MAX), p.notes)
          .input("updatedAt", sql.VarChar(50), new Date().toISOString())
          .query(`
            INSERT INTO pubs (id, name, lat, lng, address, notes, updatedAt)
            VALUES (@id, @name, @lat, @lng, @address, @notes, @updatedAt)
          `);
        
        for (const b of p.beers) {
          await mssqlPool.request()
            .input("id", sql.VarChar(50), b.id)
            .input("pubId", sql.VarChar(50), p.id)
            .input("name", sql.NVarChar(100), b.name)
            .input("degrees", sql.NVarChar(20), b.degrees)
            .input("price", sql.Float, b.price)
            .input("style", sql.NVarChar(100), b.style)
            .input("brewery", sql.NVarChar(100), b.brewery)
            .input("description", sql.NVarChar(sql.MAX), b.description)
            .query(`
              INSERT INTO beers (id, pubId, name, degrees, price, style, brewery, description)
              VALUES (@id, @pubId, @name, @degrees, @price, @style, @brewery, @description)
            `);
        }
      }
      console.log("🌱 Database seeding completed successfully!");
    }
  } catch (err) {
    console.error("❌ Failed to auto-create tables or seed Azure SQL Database:", err);
  }
}

// Initialize database connection
async function initSqlDatabase(): Promise<boolean> {
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
  const server = process.env.AZURE_SQL_SERVER;
  
  if (!connectionString && !server) {
    console.log("ℹ️ No AZURE_SQL_CONNECTION_STRING or AZURE_SQL_SERVER provided. Running in local JSON database mode.");
    return false;
  }
  
  try {
    console.log("⚡ Connecting to Azure SQL Database...");
    if (connectionString) {
      mssqlPool = await sql.connect(connectionString);
    } else {
      const config: sql.config = {
        user: process.env.AZURE_SQL_USER || "",
        password: process.env.AZURE_SQL_PASSWORD || "",
        server: server || "",
        database: process.env.AZURE_SQL_DATABASE || "",
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };
      const pool = new sql.ConnectionPool(config);
      mssqlPool = await pool.connect();
    }
    
    isSqlMode = true;
    console.log("✅ Successfully connected to Azure SQL Database!");
    await createSqlTablesIfNotExist();
    return true;
  } catch (err) {
    console.error("❌ Failed to connect to Azure SQL Database. Falling back to local JSON database mode.", err);
    return false;
  }
}

// -----------------------------------------------------------------
// 🛠️ DATA REPOSITORY WRAPPER OPERATIONS (FALLBACK BACKED)
// -----------------------------------------------------------------

async function getPubsList(): Promise<any[]> {
  if (isSqlMode && mssqlPool) {
    try {
      const resultPubs = await mssqlPool.request().query("SELECT * FROM pubs");
      const resultBeers = await mssqlPool.request().query("SELECT * FROM beers");
      return resultPubs.recordset.map((p: any) => ({
        ...p,
        beers: resultBeers.recordset
          .filter((b: any) => b.pubId === p.id)
          .map((b: any) => ({
            id: b.id,
            name: b.name,
            degrees: b.degrees,
            price: b.price,
            style: b.style,
            brewery: b.brewery,
            description: b.description,
            createdAt: b.createdAt,
            createdBy: b.createdBy,
            updatedAt: b.updatedAt,
            updatedBy: b.updatedBy
          }))
      }));
    } catch (err) {
      console.error("SQL getPubsList failed, falling back to JSON:", err);
    }
  }
  return readPubsFromDb();
}

async function createNewPub(name: string, lat: number, lng: number, address: string, notes: string, createdBy?: string): Promise<any> {
  const newPub = {
    id: `pub-${Date.now()}`,
    name,
    lat,
    lng,
    address: address || "",
    notes: notes || "",
    beers: [] as any[],
    createdAt: new Date().toISOString(),
    createdBy: createdBy || "Anonymní uživatel",
    updatedAt: new Date().toISOString(),
    updatedBy: createdBy || "Anonymní uživatel"
  };

  if (isSqlMode && mssqlPool) {
    try {
      await mssqlPool.request()
        .input("id", sql.VarChar(50), newPub.id)
        .input("name", sql.NVarChar(100), newPub.name)
        .input("lat", sql.Float, newPub.lat)
        .input("lng", sql.Float, newPub.lng)
        .input("address", sql.NVarChar(255), newPub.address)
        .input("notes", sql.NVarChar(sql.MAX), newPub.notes)
        .input("updatedAt", sql.VarChar(50), newPub.updatedAt)
        .input("createdAt", sql.VarChar(50), newPub.createdAt)
        .input("createdBy", sql.NVarChar(100), newPub.createdBy)
        .input("updatedBy", sql.NVarChar(100), newPub.updatedBy)
        .query(`
          INSERT INTO pubs (id, name, lat, lng, address, notes, updatedAt, createdAt, createdBy, updatedBy)
          VALUES (@id, @name, @lat, @lng, @address, @notes, @updatedAt, @createdAt, @createdBy, @updatedBy)
        `);
      return newPub;
    } catch (err) {
      console.error("SQL createNewPub failed, falling back to JSON:", err);
    }
  }

  const pubs = readPubsFromDb();
  pubs.push(newPub);
  writePubsToDb(pubs);
  return newPub;
}

async function updateExistingPub(pubId: string, name?: string, lat?: number, lng?: number, address?: string, notes?: string, updatedBy?: string): Promise<any> {
  const finalUpdatedBy = updatedBy || "Anonymní uživatel";
  const nowStr = new Date().toISOString();

  if (isSqlMode && mssqlPool) {
    try {
      const existingRes = await mssqlPool.request()
        .input("pubId", sql.VarChar(50), pubId)
        .query("SELECT * FROM pubs WHERE id = @pubId");
      if (existingRes.recordset.length === 0) return null;
      const existing = existingRes.recordset[0];
      const finalPub = {
        id: pubId,
        name: name !== undefined ? name : existing.name,
        lat: lat !== undefined ? lat : existing.lat,
        lng: lng !== undefined ? lng : existing.lng,
        address: address !== undefined ? address : existing.address,
        notes: notes !== undefined ? notes : existing.notes,
        beers: [] as any[],
        createdAt: existing.createdAt || nowStr,
        createdBy: existing.createdBy || "Anonymní uživatel",
        updatedAt: nowStr,
        updatedBy: finalUpdatedBy
      };
      await mssqlPool.request()
        .input("pubId", sql.VarChar(50), pubId)
        .input("name", sql.NVarChar(100), finalPub.name)
        .input("lat", sql.Float, finalPub.lat)
        .input("lng", sql.Float, finalPub.lng)
        .input("address", sql.NVarChar(255), finalPub.address)
        .input("notes", sql.NVarChar(sql.MAX), finalPub.notes)
        .input("updatedAt", sql.VarChar(50), finalPub.updatedAt)
        .input("updatedBy", sql.NVarChar(100), finalPub.updatedBy)
        .query(`
          UPDATE pubs 
          SET name = @name, lat = @lat, lng = @lng, address = @address, notes = @notes, updatedAt = @updatedAt, updatedBy = @updatedBy
          WHERE id = @pubId
        `);
      
      const beersRes = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT * FROM beers WHERE pubId = @pubId");
      finalPub.beers = beersRes.recordset;
      return finalPub;
    } catch (err) {
      console.error("SQL updateExistingPub failed, falling back to JSON:", err);
    }
  }

  const pubs = readPubsFromDb();
  const index = pubs.findIndex((p) => p.id === pubId);
  if (index === -1) return null;

  pubs[index] = {
    ...pubs[index],
    name: name !== undefined ? name : pubs[index].name,
    lat: lat !== undefined ? lat : pubs[index].lat,
    lng: lng !== undefined ? lng : pubs[index].lng,
    address: address !== undefined ? address : pubs[index].address,
    notes: notes !== undefined ? notes : pubs[index].notes,
    createdAt: pubs[index].createdAt || nowStr,
    createdBy: pubs[index].createdBy || "Anonymní uživatel",
    updatedAt: nowStr,
    updatedBy: finalUpdatedBy
  };

  writePubsToDb(pubs);
  return pubs[index];
}

async function deleteExistingPub(pubId: string): Promise<boolean> {
  if (isSqlMode && mssqlPool) {
    try {
      const res = await mssqlPool.request()
        .input("pubId", sql.VarChar(50), pubId)
        .query("DELETE FROM pubs WHERE id = @pubId");
      return (res.rowsAffected[0] || 0) > 0;
    } catch (err) {
      console.error("SQL deleteExistingPub failed, falling back to JSON:", err);
    }
  }

  const pubs = readPubsFromDb();
  const filtered = pubs.filter((p) => p.id !== pubId);
  if (pubs.length === filtered.length) return false;
  writePubsToDb(filtered);
  return true;
}

async function addOrUpdateBeer(pubId: string, beer: any): Promise<any> {
  const beerCreator = beer.createdBy || beer.updatedBy || "Anonymní uživatel";
  const beerUpdater = beer.updatedBy || beer.createdBy || "Anonymní uživatel";
  const nowStr = new Date().toISOString();

  if (isSqlMode && mssqlPool) {
    try {
      const pubCheck = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT id FROM pubs WHERE id = @pubId");
      if (pubCheck.recordset.length === 0) return null;

      const beerId = beer.id || `beer-${Date.now()}`;
      
      const checkRes = await mssqlPool.request()
        .input("beerId", sql.VarChar(50), beerId)
        .query("SELECT id FROM beers WHERE id = @beerId");
      
      if (checkRes.recordset.length > 0) {
        await mssqlPool.request()
          .input("beerId", sql.VarChar(50), beerId)
          .input("name", sql.NVarChar(100), beer.name)
          .input("degrees", sql.NVarChar(20), beer.degrees)
          .input("price", sql.Float, Number(beer.price))
          .input("style", sql.NVarChar(100), beer.style)
          .input("brewery", sql.NVarChar(100), beer.brewery)
          .input("description", sql.NVarChar(sql.MAX), beer.description)
          .input("updatedAt", sql.VarChar(50), nowStr)
          .input("updatedBy", sql.NVarChar(100), beerUpdater)
          .query(`
            UPDATE beers
            SET name = @name, degrees = @degrees, price = @price, style = @style, brewery = @brewery, description = @description, updatedAt = @updatedAt, updatedBy = @updatedBy
            WHERE id = @beerId
          `);
      } else {
        await mssqlPool.request()
          .input("beerId", sql.VarChar(50), beerId)
          .input("pubId", sql.VarChar(50), pubId)
          .input("name", sql.NVarChar(100), beer.name)
          .input("degrees", sql.NVarChar(20), beer.degrees)
          .input("price", sql.Float, Number(beer.price))
          .input("style", sql.NVarChar(100), beer.style)
          .input("brewery", sql.NVarChar(100), beer.brewery)
          .input("description", sql.NVarChar(sql.MAX), beer.description)
          .input("createdAt", sql.VarChar(50), nowStr)
          .input("createdBy", sql.NVarChar(100), beerCreator)
          .input("updatedAt", sql.VarChar(50), nowStr)
          .input("updatedBy", sql.NVarChar(100), beerCreator)
          .query(`
            INSERT INTO beers (id, pubId, name, degrees, price, style, brewery, description, createdAt, createdBy, updatedAt, updatedBy)
            VALUES (@beerId, @pubId, @name, @degrees, @price, @style, @brewery, @description, @createdAt, @createdBy, @updatedAt, @updatedBy)
          `);
      }

      await mssqlPool.request()
        .input("pubId", sql.VarChar(50), pubId)
        .input("updatedAt", sql.VarChar(50), nowStr)
        .query("UPDATE pubs SET updatedAt = @updatedAt WHERE id = @pubId");

      const updatedPubRes = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT * FROM pubs WHERE id = @pubId");
      const beersRes = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT * FROM beers WHERE pubId = @pubId");
      return {
        ...updatedPubRes.recordset[0],
        beers: beersRes.recordset.map((b: any) => ({
          id: b.id,
          name: b.name,
          degrees: b.degrees,
          price: b.price,
          style: b.style,
          brewery: b.brewery,
          description: b.description,
          createdAt: b.createdAt,
          createdBy: b.createdBy,
          updatedAt: b.updatedAt,
          updatedBy: b.updatedBy
        }))
      };
    } catch (err) {
      console.error("SQL addOrUpdateBeer failed, falling back to JSON:", err);
    }
  }

  const pubs = readPubsFromDb();
  const pubIndex = pubs.findIndex((p) => p.id === pubId);
  if (pubIndex === -1) return null;

  const pub = pubs[pubIndex];
  const beerId = beer.id || `beer-${Date.now()}`;
  const existingBeerIndex = beer.id ? pub.beers.findIndex((b: any) => b.id === beer.id) : -1;

  let finalBeer;
  if (existingBeerIndex > -1) {
    const orig = pub.beers[existingBeerIndex];
    finalBeer = {
      id: beerId,
      name: beer.name,
      degrees: beer.degrees || "12°",
      price: Number(beer.price),
      style: beer.style || "Světlý ležák",
      brewery: beer.brewery || "Neznámý pivovar",
      description: beer.description || "",
      createdAt: orig.createdAt || nowStr,
      createdBy: orig.createdBy || "Anonymní uživatel",
      updatedAt: nowStr,
      updatedBy: beerUpdater
    };
    pub.beers[existingBeerIndex] = finalBeer;
  } else {
    finalBeer = {
      id: beerId,
      name: beer.name,
      degrees: beer.degrees || "12°",
      price: Number(beer.price),
      style: beer.style || "Světlý ležák",
      brewery: beer.brewery || "Neznámý pivovar",
      description: beer.description || "",
      createdAt: nowStr,
      createdBy: beerCreator,
      updatedAt: nowStr,
      updatedBy: beerCreator
    };
    pub.beers.push(finalBeer);
  }

  pub.updatedAt = nowStr;
  writePubsToDb(pubs);
  return pub;
}

async function removeBeer(pubId: string, beerId: string): Promise<any> {
  if (isSqlMode && mssqlPool) {
    try {
      const pubCheck = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT id FROM pubs WHERE id = @pubId");
      if (pubCheck.recordset.length === 0) return null;

      const deleteRes = await mssqlPool.request()
        .input("beerId", sql.VarChar(50), beerId)
        .query("DELETE FROM beers WHERE id = @beerId");

      if ((deleteRes.rowsAffected[0] || 0) === 0) return null;

      await mssqlPool.request()
        .input("pubId", sql.VarChar(50), pubId)
        .input("updatedAt", sql.VarChar(50), new Date().toISOString())
        .query("UPDATE pubs SET updatedAt = @updatedAt WHERE id = @pubId");

      const updatedPubRes = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT * FROM pubs WHERE id = @pubId");
      const beersRes = await mssqlPool.request().input("pubId", sql.VarChar(50), pubId).query("SELECT * FROM beers WHERE pubId = @pubId");
      return {
        ...updatedPubRes.recordset[0],
        beers: beersRes.recordset
      };
    } catch (err) {
      console.error("SQL removeBeer failed, falling back to JSON:", err);
    }
  }

  const pubs = readPubsFromDb();
  const pubIndex = pubs.findIndex((p) => p.id === pubId);
  if (pubIndex === -1) return null;

  const pub = pubs[pubIndex];
  const initialCount = pub.beers.length;
  pub.beers = pub.beers.filter((b: any) => b.id !== beerId);
  if (pub.beers.length === initialCount) return null;

  pub.updatedAt = new Date().toISOString();
  writePubsToDb(pubs);
  return pub;
}

async function getOrRegisterPassport(email: string): Promise<any> {
  const emailLower = email.toLowerCase().trim();
  if (isSqlMode && mssqlPool) {
    try {
      const passResult = await mssqlPool.request()
        .input("email", sql.NVarChar(100), emailLower)
        .query("SELECT * FROM passports WHERE email = @email");
      
      if (passResult.recordset.length === 0) {
        await mssqlPool.request()
          .input("email", sql.NVarChar(100), emailLower)
          .input("userName", sql.NVarChar(100), emailLower.split("@")[0])
          .query("INSERT INTO passports (email, userName, password, favoriteBeerName) VALUES (@email, @userName, '', '')");
          
        return {
          userEmail: emailLower,
          userName: emailLower.split("@")[0],
          password: "",
          visitedPubIds: [] as string[],
          visits: [] as any[],
          favoriteBeerName: ""
        };
      }
      
      const passport = passResult.recordset[0];
      const visitsRes = await mssqlPool.request()
        .input("email", sql.NVarChar(100), emailLower)
        .query("SELECT * FROM visits WHERE email = @email");
      
      const visits = visitsRes.recordset;
      const visitedPubIds = Array.from(new Set<string>(visits.map((v: any) => v.pubId)));
      
      return {
        userEmail: passport.email,
        userName: passport.userName || passport.email.split("@")[0],
        password: passport.password || "",
        favoriteBeerName: passport.favoriteBeerName || "",
        visits: visits,
        visitedPubIds: visitedPubIds
      };
    } catch (err) {
      console.error("SQL getOrRegisterPassport failed, falling back to JSON:", err);
    }
  }

  const dbPassports = readPassportsFromDb();
  if (!dbPassports[emailLower]) {
    dbPassports[emailLower] = {
      userEmail: emailLower,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
    writePassportsToDb(dbPassports);
  }
  return dbPassports[emailLower];
}

async function saveProfileName(email: string, name: string): Promise<boolean> {
  const emailLower = email.toLowerCase().trim();
  if (isSqlMode && mssqlPool) {
    try {
      const res = await mssqlPool.request()
        .input("email", sql.NVarChar(100), emailLower)
        .input("userName", sql.NVarChar(100), name.trim())
        .query("UPDATE passports SET userName = @userName WHERE email = @email");
      return (res.rowsAffected[0] || 0) > 0;
    } catch (err) {
      console.error("SQL saveProfileName failed, falling back to JSON:", err);
    }
  }

  const dbPassports = readPassportsFromDb();
  if (!dbPassports[emailLower]) return false;
  dbPassports[emailLower].userName = name.trim();
  writePassportsToDb(dbPassports);
  return true;
}

async function logBeerVisit(email: string, body: any): Promise<any> {
  const emailLower = email.toLowerCase().trim();
  const { pubId, pubName, beerId, beerName, degrees, style, brewery } = body;
  
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

  if (isSqlMode && mssqlPool) {
    try {
      await getOrRegisterPassport(emailLower); // validates row exists

      await mssqlPool.request()
        .input("id", sql.VarChar(50), visit.id)
        .input("email", sql.NVarChar(100), emailLower)
        .input("pubId", sql.VarChar(50), visit.pubId)
        .input("pubName", sql.NVarChar(100), visit.pubName)
        .input("beerId", sql.VarChar(50), visit.beerId)
        .input("beerName", sql.NVarChar(100), visit.beerName)
        .input("degrees", sql.NVarChar(20), visit.degrees)
        .input("style", sql.NVarChar(100), visit.style)
        .input("brewery", sql.NVarChar(100), visit.brewery)
        .input("timestamp", sql.VarChar(50), visit.timestamp)
        .query(`
          INSERT INTO visits (id, email, pubId, pubName, beerId, beerName, degrees, style, brewery, timestamp)
          VALUES (@id, @email, @pubId, @pubName, @beerId, @beerName, @degrees, @style, @brewery, @timestamp)
        `);
      return await getOrRegisterPassport(emailLower);
    } catch (err) {
      console.error("SQL logBeerVisit failed, falling back to JSON:", err);
    }
  }

  const dbPassports = readPassportsFromDb();
  if (!dbPassports[emailLower]) {
    dbPassports[emailLower] = {
      userEmail: emailLower,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
  }

  dbPassports[emailLower].visits.push(visit);
  const visitedPubsSet = new Set<string>(dbPassports[emailLower].visitedPubIds);
  visitedPubsSet.add(pubId);
  dbPassports[emailLower].visitedPubIds = Array.from(visitedPubsSet);
  writePassportsToDb(dbPassports);
  return dbPassports[emailLower];
}

async function removeVisit(email: string, visitId: string): Promise<any> {
  const emailLower = email.toLowerCase().trim();
  if (isSqlMode && mssqlPool) {
    try {
      await mssqlPool.request()
        .input("visitId", sql.VarChar(50), visitId)
        .input("email", sql.NVarChar(100), emailLower)
        .query("DELETE FROM visits WHERE id = @visitId AND email = @email");
      return await getOrRegisterPassport(emailLower);
    } catch (err) {
      console.error("SQL removeVisit failed, falling back to JSON:", err);
    }
  }

  const dbPassports = readPassportsFromDb();
  if (!dbPassports[emailLower]) return null;

  dbPassports[emailLower].visits = dbPassports[emailLower].visits.filter((v: any) => v.id !== visitId);
  const visitedPubsSet = new Set<string>();
  dbPassports[emailLower].visits.forEach((v: any) => {
    visitedPubsSet.add(v.pubId);
  });
  dbPassports[emailLower].visitedPubIds = Array.from(visitedPubsSet);
  writePassportsToDb(dbPassports);
  return dbPassports[emailLower];
}

async function setFavoriteBeer(email: string, favoriteBeerName: string): Promise<any> {
  const emailLower = email.toLowerCase().trim();
  if (isSqlMode && mssqlPool) {
    try {
      await getOrRegisterPassport(emailLower);
      await mssqlPool.request()
        .input("email", sql.NVarChar(100), emailLower)
        .input("favBeer", sql.NVarChar(100), favoriteBeerName || "")
        .query("UPDATE passports SET favoriteBeerName = @favBeer WHERE email = @email");
      return await getOrRegisterPassport(emailLower);
    } catch (err) {
      console.error("SQL setFavoriteBeer failed, falling back to JSON:", err);
    }
  }

  const dbPassports = readPassportsFromDb();
  if (!dbPassports[emailLower]) {
    dbPassports[emailLower] = {
      userEmail: emailLower,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
  }
  dbPassports[emailLower].favoriteBeerName = favoriteBeerName || "";
  writePassportsToDb(dbPassports);
  return dbPassports[emailLower];
}

async function loginUserAuth(email: string, name: string, password?: string): Promise<any> {
  const emailLower = email.toLowerCase().trim();
  const cleanPassword = (password || "").trim();

  if (isSqlMode && mssqlPool) {
    try {
      const checkRes = await mssqlPool.request()
        .input("email", sql.NVarChar(100), emailLower)
        .query("SELECT * FROM passports WHERE email = @email");
      
      if (checkRes.recordset.length === 0) {
        const newName = name || emailLower.split("@")[0];
        await mssqlPool.request()
          .input("email", sql.NVarChar(100), emailLower)
          .input("userName", sql.NVarChar(100), newName)
          .input("password", sql.NVarChar(100), cleanPassword)
          .query("INSERT INTO passports (email, userName, password, favoriteBeerName) VALUES (@email, @userName, @password, '')");
        return {
          success: true,
          isNew: true,
          user: {
            email: emailLower,
            name: newName,
            password: cleanPassword
          }
        };
      }
      
      const existing = checkRes.recordset[0];
      if (existing.password) {
        if (existing.password !== cleanPassword) {
          return { error: "Zadané heslo pro tento e-mail není správné. Zadejte správné heslo nebo použijte jiný e-mail." };
        }
      } else {
        await mssqlPool.request()
          .input("email", sql.NVarChar(100), emailLower)
          .input("password", sql.NVarChar(100), cleanPassword)
          .query("UPDATE passports SET password = @password WHERE email = @email");
      }
      
      return {
        success: true,
        isNew: false,
        user: {
          email: emailLower,
          name: existing.userName || name || emailLower.split("@")[0],
          password: cleanPassword
        }
      };
    } catch (err) {
      console.error("SQL loginUserAuth failed, falling back to JSON:", err);
    }
  }

  const dbPassports = readPassportsFromDb();
  if (!dbPassports[emailLower]) {
    dbPassports[emailLower] = {
      userEmail: emailLower,
      userName: name || emailLower.split("@")[0],
      password: cleanPassword,
      visitedPubIds: [],
      visits: [],
      favoriteBeerName: ""
    };
    writePassportsToDb(dbPassports);
    return {
      success: true,
      isNew: true,
      user: {
        email: emailLower,
        name: dbPassports[emailLower].userName,
        password: cleanPassword
      }
    };
  }

  const existingPassport = dbPassports[emailLower];
  if (existingPassport.password) {
    if (existingPassport.password !== cleanPassword) {
      return { error: "Zadané heslo pro tento e-mail není správné. Zadejte správné heslo nebo použijte jiný e-mail." };
    }
  } else {
    existingPassport.password = cleanPassword;
    if (name) existingPassport.userName = name;
    writePassportsToDb(dbPassports);
  }

  return {
    success: true,
    isNew: false,
    user: {
      email: emailLower,
      name: existingPassport.userName || name || emailLower.split("@")[0],
      password: cleanPassword
    }
  };
}

async function authorizePassportAsync(req: express.Request, email: string): Promise<boolean> {
  const emailLower = email.toLowerCase().trim();
  try {
    let dbPassword = "";
    if (isSqlMode && mssqlPool) {
      const res = await mssqlPool.request()
        .input("email", sql.NVarChar(100), emailLower)
        .query("SELECT password FROM passports WHERE email = @email");
      if (res.recordset.length === 0) return true;
      dbPassword = res.recordset[0].password || "";
    } else {
      const dbPassports = readPassportsFromDb();
      const passport = dbPassports[emailLower];
      if (!passport) return true;
      dbPassword = passport.password || "";
    }

    if (dbPassword) {
      const incomingPassword = req.headers["x-passport-password"] || req.query.password || "";
      if (dbPassword !== incomingPassword) return false;
    }
    return true;
  } catch (err) {
    console.error("Error authorizing passport:", err);
    return false;
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

// -----------------------------------------------------------------
// 📡 API ENDPOINTS
// -----------------------------------------------------------------

// Read all pubs
app.get("/api/pubs", async (req, res) => {
  const pubs = await getPubsList();
  res.json(pubs);
});

// Create a new pub
app.post("/api/pubs", async (req, res) => {
  const { name, lat, lng, address, notes, createdBy } = req.body;
  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "Název hospody, zeměpisná šířka (lat) a délka (lng) jsou povinné údaje." });
    return;
  }

  const newPub = await createNewPub(name, lat, lng, address, notes, createdBy);
  res.status(201).json(newPub);
});

// Update a pub (change name, coordinates, notes)
app.put("/api/pubs/:pubId", async (req, res) => {
  const { pubId } = req.params;
  const { name, lat, lng, address, notes, updatedBy } = req.body;

  const updated = await updateExistingPub(pubId, name, lat, lng, address, notes, updatedBy);
  if (!updated) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }
  res.json(updated);
});

// Delete a pub
app.delete("/api/pubs/:pubId", async (req, res) => {
  const { pubId } = req.params;
  const deleted = await deleteExistingPub(pubId);
  if (!deleted) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }
  res.json({ success: true, message: "Hospoda byla odstraněna." });
});

// Add a beer to a pub, or update an existing one
app.post("/api/pubs/:pubId/beers", async (req, res) => {
  const { pubId } = req.params;
  const { id, name, degrees, price, style, brewery, description, createdBy, updatedBy } = req.body;

  if (!name || price === undefined) {
    res.status(400).json({ error: "Název piva a cena za půllitr jsou povinné údaje." });
    return;
  }

  const updatedPub = await addOrUpdateBeer(pubId, { id, name, degrees, price, style, brewery, description, createdBy, updatedBy });
  if (!updatedPub) {
    res.status(404).json({ error: "Hospoda nebyla nalezena." });
    return;
  }
  res.json(updatedPub);
});

// Helper storage functions for Error Reports
const REPORTS_DB_FILE = path.join(process.cwd(), "error_reports.json");

function readReportsFromDb(): any[] {
  try {
    if (fs.existsSync(REPORTS_DB_FILE)) {
      const data = fs.readFileSync(REPORTS_DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading error_reports.json:", err);
  }
  return [];
}

function writeReportsToDb(reports: any[]) {
  try {
    fs.writeFileSync(REPORTS_DB_FILE, JSON.stringify(reports, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing error_reports.json:", err);
  }
}

async function sendEmailNotification(report: any) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Česká pivní mapa" <noreply@pivnimapa.cz>';
  const to = process.env.SMTP_TO || "david.kuncar93@gmail.com";

  if (!host || !user || !pass) {
    console.log("SMTP configurations are not completely set. Skipping automatic email send on background progress.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailOptions = {
      from: from,
      to: to,
      subject: `🚨 NOVÉ HLÁŠENÍ CHYBY: ${report.pubName}`,
      text: `Ahoj Davide,\n\nv aplikaci Česká pivní mapa bylo nahlášeno nové pochybení u hospody "${report.pubName}" (ID: ${report.pubId || "Neznámé"}).\n\nKategorie chyby:\n${report.category}\n\nDetailní popis:\n${report.description}\n\nNahlásil/a:\n${report.userName} (${report.userEmail})\n\nVytvořeno dne: ${new Date(report.createdAt).toLocaleString("cs-CZ")}\n\nZprávu si můžeš detailně prohlédnout, spravovat nebo označit za vyřešenou přímo ve svém administrátorském rozhraní v aplikaci.\n\nDej si jedno orosené! 🍻`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Error report notification email sent successfully: %s", info.messageId);
  } catch (error) {
    console.error("Failed to send error report notification email:", error);
  }
}

// Create an error report
app.post("/api/reports", async (req, res) => {
  const { pubId, pubName, category, description, userEmail, userName } = req.body;
  if (!category || !description) {
    res.status(400).json({ error: "Kategorie a popis nahlášené chyby jsou povinné údaje." });
    return;
  }

  const newReport = {
    id: `report-${Date.now()}`,
    pubId: pubId || null,
    pubName: pubName || "Neznámá hospoda",
    category,
    description,
    userEmail: userEmail || "Anonymní",
    userName: userName || "Anonymní",
    status: "Nové",
    createdAt: new Date().toISOString()
  };

  const reports = readReportsFromDb();
  reports.push(newReport);
  writeReportsToDb(reports);

  // Send email in background, don't block the HTTP response
  sendEmailNotification(newReport).catch(err => {
    console.error("Background notify email failed:", err);
  });

  res.status(201).json({ success: true, report: newReport });
});

// Get all error reports
app.get("/api/reports", async (req, res) => {
  const reports = readReportsFromDb();
  res.json(reports);
});

// Update the status of an error report (resolved, etc.)
app.put("/api/reports/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;
  const reports = readReportsFromDb();
  const idx = reports.findIndex((r) => r.id === reportId);
  if (idx !== -1) {
    reports[idx].status = status || "Vyřešeno";
    writeReportsToDb(reports);
    res.json({ success: true, report: reports[idx] });
  } else {
    res.status(404).json({ error: "Hlášení nebylo nalezeno." });
  }
});

// Delete an error report
app.delete("/api/reports/:reportId", async (req, res) => {
  const { reportId } = req.params;
  const reports = readReportsFromDb();
  const filtered = reports.filter((r) => r.id !== reportId);
  if (reports.length > filtered.length) {
    writeReportsToDb(filtered);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Hlášení nebylo nalezeno." });
  }
});

// Delete a beer from a pub
app.delete("/api/pubs/:pubId/beers/:beerId", async (req, res) => {
  const { pubId, beerId } = req.params;
  const updatedPub = await removeBeer(pubId, beerId);
  if (!updatedPub) {
    res.status(404).json({ error: "Hospoda nebo pivo nebylo nalezeno." });
    return;
  }
  res.json(updatedPub);
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
      model: "gemini-3.1-flash-lite",
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
    res.json({
      name: beerName,
      degrees: "12°",
      style: "Světlý ležák",
      brewery: "Neznámý pivovar",
      notes: "Poctivé a dobře ošetřené pivečko. Česká klasika, která nikdy nezklame."
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
    const currentPubs = await getPubsList();
    
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

    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
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
      fallback: "Ahoj štamgaste! 🍻 Vypadá to, že můj výčepní modul má zrovna sanitaci trubek, takže si teď nemůžeme takhle pokecat. Ale pivo čepujeme dál! Můžeš vesele klikat do mapy, zakládat své oblíbené hospůdky a zapisovat si je do svého Pivního Pasu."
    });
  }
});

// Explicit Login / Authentication endpoint (Checks or register password)
app.post("/api/login", async (req, res) => {
  const { email, name, password } = req.body;
  
  if (!email) {
    res.status(400).json({ error: "E-mail je povinný údaj." });
    return;
  }

  const result = await loginUserAuth(email, name, password);
  if (result.error) {
    res.status(401).json({ error: result.error });
    return;
  }
  res.json(result);
});

// Get or initialize user passport
app.get("/api/passports/:email", async (req, res) => {
  const { email } = req.params;
  if (!email) {
    res.status(400).json({ error: "E-mail je povinný údaj." });
    return;
  }
  const authorized = await authorizePassportAsync(req, email);
  if (!authorized) {
    res.status(401).json({ error: "Neautorizovaný přístup k pivnímu pasu. Nesprávné heslo." });
    return;
  }
  const passport = await getOrRegisterPassport(email);
  res.json(passport);
});

// Update username/profile details for passport
app.post("/api/passports/:email/profile", async (req, res) => {
  const { email } = req.params;
  const { name } = req.body;
  
  if (!email || !name) {
    res.status(400).json({ error: "E-mail a přezdívka jsou povinné údaje." });
    return;
  }
  
  const authorized = await authorizePassportAsync(req, email);
  if (!authorized) {
    res.status(401).json({ error: "Neautorizovaný přístup k pivnímu pasu. Nesprávné heslo." });
    return;
  }
  
  const saved = await saveProfileName(email, name);
  if (!saved) {
    res.status(404).json({ error: "Pivní pas nebyl nalezen." });
    return;
  }
  
  res.json({
    success: true,
    name: name.trim()
  });
});

// Log a visit to a pub / beer consumption
app.post("/api/passports/:email/visits", async (req, res) => {
  const { email } = req.params;
  const { pubId, pubName } = req.body;
  if (!email || !pubId || !pubName) {
    res.status(400).json({ error: "E-mail, ID hospody a název hospody jsou povinné údaje." });
    return;
  }
  const authorized = await authorizePassportAsync(req, email);
  if (!authorized) {
    res.status(401).json({ error: "Neautorizovaný přístup k pivnímu pasu. Nesprávné heslo." });
    return;
  }
  const updated = await logBeerVisit(email, req.body);
  res.status(201).json(updated);
});

// Delete a visit
app.delete("/api/passports/:email/visits/:visitId", async (req, res) => {
  const { email, visitId } = req.params;
  if (!email || !visitId) {
    res.status(400).json({ error: "E-mail a ID návštěvy jsou povinné údaje." });
    return;
  }
  const authorized = await authorizePassportAsync(req, email);
  if (!authorized) {
    res.status(401).json({ error: "Neautorizovaný přístup k pivnímu pasu. Nesprávné heslo." });
    return;
  }
  const updated = await removeVisit(email, visitId);
  if (!updated) {
    res.status(404).json({ error: "Pivní pas tohoto uživatele neexistuje." });
    return;
  }
  res.json(updated);
});

// Save or set manually chosen Favorite Beer Name
app.post("/api/passports/:email/favorite-beer", async (req, res) => {
  const { email } = req.params;
  const { favoriteBeerName } = req.body;
  if (!email) {
    res.status(400).json({ error: "E-mail je povinný údaj." });
    return;
  }
  const authorized = await authorizePassportAsync(req, email);
  if (!authorized) {
    res.status(401).json({ error: "Neautorizovaný přístup k pivnímu pasu. Nesprávné heslo." });
    return;
  }
  const updated = await setFavoriteBeer(email, favoriteBeerName);
  res.json(updated);
});

// Bulk sync-restore representing fallbacks protect against Render.com ephemeral disk wipes
app.post("/api/sync-restore", async (req, res) => {
  const { pubs, passports } = req.body;
  
  if (Array.isArray(pubs) && pubs.length > 0) {
    if (isSqlMode && mssqlPool) {
      try {
        for (const p of pubs) {
          const check = await mssqlPool.request().input("id", sql.VarChar(50), p.id).query("SELECT id FROM pubs WHERE id = @id");
          if (check.recordset.length === 0) {
            await mssqlPool.request()
              .input("id", sql.VarChar(50), p.id)
              .input("name", sql.NVarChar(100), p.name)
              .input("lat", sql.Float, p.lat)
              .input("lng", sql.Float, p.lng)
              .input("address", sql.NVarChar(255), p.address)
              .input("notes", sql.NVarChar(sql.MAX), p.notes)
              .input("updatedAt", sql.VarChar(50), p.updatedAt || new Date().toISOString())
              .query(`
                INSERT INTO pubs (id, name, lat, lng, address, notes, updatedAt)
                VALUES (@id, @name, @lat, @lng, @address, @notes, @updatedAt)
              `);
            
            if (Array.isArray(p.beers)) {
              for (const b of p.beers) {
                await mssqlPool.request()
                  .input("id", sql.VarChar(50), b.id)
                  .input("pubId", sql.VarChar(50), p.id)
                  .input("name", sql.NVarChar(100), b.name)
                  .input("degrees", sql.NVarChar(20), b.degrees)
                  .input("price", sql.Float, b.price)
                  .input("style", sql.NVarChar(100), b.style)
                  .input("brewery", sql.NVarChar(100), b.brewery)
                  .input("description", sql.NVarChar(sql.MAX), b.description)
                  .query(`
                    INSERT INTO beers (id, pubId, name, degrees, price, style, brewery, description)
                    VALUES (@id, @pubId, @name, @degrees, @price, @style, @brewery, @description)
                  `);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in sync-restore pubs to SQL:", err);
      }
    } else {
      writePubsToDb(pubs);
    }
    console.log(`[Sync] Restored ${pubs.length} pubs.`);
  }
  
  if (passports && typeof passports === "object" && Object.keys(passports).length > 0) {
    if (isSqlMode && mssqlPool) {
      try {
        for (const emailKey of Object.keys(passports)) {
          const pass = passports[emailKey];
          const lowerEmail = emailKey.toLowerCase().trim();
          
          const check = await mssqlPool.request().input("email", sql.NVarChar(100), lowerEmail).query("SELECT email FROM passports WHERE email = @email");
          if (check.recordset.length === 0) {
            await mssqlPool.request()
              .input("email", sql.NVarChar(100), lowerEmail)
              .input("userName", sql.NVarChar(100), pass.userName || lowerEmail.split("@")[0])
              .input("password", sql.NVarChar(100), pass.password || "")
              .input("favoriteBeerName", sql.NVarChar(100), pass.favoriteBeerName || "")
              .query("INSERT INTO passports (email, userName, password, favoriteBeerName) VALUES (@email, @userName, @password, @favoriteBeerName)");
            
            if (Array.isArray(pass.visits)) {
              for (const v of pass.visits) {
                await mssqlPool.request()
                  .input("id", sql.VarChar(50), v.id)
                  .input("email", sql.NVarChar(100), lowerEmail)
                  .input("pubId", sql.VarChar(50), v.pubId)
                  .input("pubName", sql.NVarChar(100), v.pubName)
                  .input("beerId", sql.VarChar(50), v.beerId || null)
                  .input("beerName", sql.NVarChar(100), v.beerName || null)
                  .input("degrees", sql.NVarChar(20), v.degrees || null)
                  .input("style", sql.NVarChar(100), v.style || null)
                  .input("brewery", sql.NVarChar(100), v.brewery || null)
                  .input("timestamp", sql.VarChar(50), v.timestamp)
                  .query(`
                    INSERT INTO visits (id, email, pubId, pubName, beerId, beerName, degrees, style, brewery, timestamp)
                    VALUES (@id, @email, @pubId, @pubName, @beerId, @beerName, @degrees, @style, @brewery, @timestamp)
                  `);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in sync-restore passports to SQL:", err);
      }
    } else {
      const currentPassports = readPassportsFromDb();
      const merged = { ...currentPassports, ...passports };
      writePassportsToDb(merged);
    }
    console.log(`[Sync] Restored ${Object.keys(passports).length} passports.`);
  }
  
  res.json({ success: true });
});

// Vite middleware integration for full-stack build
async function startServer() {
  // Let's call initSqlDatabase first
  await initSqlDatabase();

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

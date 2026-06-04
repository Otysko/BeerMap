/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Sparkles, MessageSquare, Trash2, Loader2, RefreshCw, AlertCircle, X } from "lucide-react";

// Helper to format basic markdown (headers, item lines, bold, italic, code) cleanly in React
export function formatMessageText(text: string) {
  if (!text) return "";

  const renderInline = (str: string) => {
    if (!str) return "";
    if (!str.includes("**") && !str.includes("*") && !str.includes("`")) {
      return str;
    }
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={i} className="font-bold text-amber-500">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <em key={i} className="italic text-amber-100/90 font-normal">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={i} className="font-mono bg-slate-950/80 px-1 py-0.5 rounded text-amber-400 text-xs border border-amber-500/10">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-slate-200">
      {lines.map((line, idx) => {
        // Headers (e.g., # Header, ## Header, ### Header)
        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const content = headerMatch[2];
          return (
            <div key={idx} className="font-display font-bold text-amber-500 text-xs uppercase tracking-wider mt-4 mb-2 first:mt-0 leading-snug">
              {renderInline(content)}
            </div>
          );
        }

        // List items (starts with *, -, + or bullet point •)
        const listMatch = line.match(/^(\s*[-*+•]\s+)(.*)$/);
        if (listMatch) {
          const content = listMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 ml-1 text-slate-300">
              <span className="text-amber-500 select-none text-[10px] mt-1.5">●</span>
              <div className="flex-grow">{renderInline(content)}</div>
            </div>
          );
        }

        // Handle general empty lines to render clean structural spacing
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }

        // Standard text lines
        return (
          <div key={idx} className="break-words leading-relaxed">
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userLatLng: { lat: number; lng: number } | null;
  favoriteBeerName?: string;
}

// 30 rich Czech beer questions to select randomly
function getPresetQueriesList(beer: string) {
  return [
    { label: "💰 Levné pivo?", text: "Ukaž mi nejlevnější piva na mapě a kolik stojí." },
    { label: "🍺 Hladinka & Šnyt?", text: "Vysvětli mi české styly čepování: hladinka, šnyt, mlíko a čochtan." },
    { label: `🔍 Kde točí ${beer}?`, text: `Zkontroluj v naší databázi, ve kterých hospodách točí pivo ${beer}.` },
    { label: "🥩 Co k svíčkové?", text: "Jaké pivo se nejlépe hodí k tradiční svíčkové na smetaně?" },
    { label: "🥖 Co k hermelínu?", text: "Doporuč mi nejvhodnější pivo k nakládanému hermelínu." },
    { label: "🏰 Historie piva", text: "Pověz mi stručnou historii vaření piva v českých zemích." },
    { label: "🌾 Svrchní kvašení?", text: "Jaký je rozdíl mezi svrchně a spodně kvašeným pivem?" },
    { label: "🧼 Čisté sklo?", text: "Podle čeho poznám, že je sklenice na pivo v hospodě opravdu perfektně čistá?" },
    { label: "🍺 Stupňovitost piva?", text: "Co přesně vyjadřuje stupňovitost piva (např. 12°) a kolik má pak alkoholu?" },
    { label: "🌳 Zahrádky?", text: "Máš tip na nějaké fajn hospůdky s letní venkovní zahrádkou?" },
    { label: "❓ Kvasnicové pivo?", text: "Jak se liší nefiltrované pivo od kvasnicového?" },
    { label: "🧄 Česneková topinka?", text: "Jaké pivo nejlépe spláchne pořádně česnekovou topinku?" },
    { label: "🍖 Pečené koleno?", text: "Ukaž mi nejlepší pivní párování k pečenému vepřovému kolenu." },
    { label: "🥔 Bramboráky?", text: "Hodí se pivo k poctivým českým bramborákům s majoránkou?" },
    { label: "🍺 Bernard vs. Plzeň?", text: "Jaký je rozdíl v chuti a postupu mezi ležáky Bernard a Pilsner Urquell?" },
    { label: "❄️ Teplota piva?", text: "Jaká je ideální teplota pro servírování českého světlého ležáku?" },
    { label: "🧖‍♂️ Pivní lázně?", text: "Mají pivní lázně opravdu nějaké léčebné nebo blahodárné účinky?" },
    { label: "🌱 Hořkost piva?", text: "Které odrůdy českého chmele dávají pivu tu nejlepší hořkost?" },
    { label: "🍺 Tankové pivo?", text: "V čem je tankové pivo lepší než pivo z klasických sudů (sudové)?" },
    { label: "🚫 Nealkoholické pivo?", text: "Z čeho a jak se vyrábí nealkoholické pivo a chutná dnes už stejně?" },
    { label: "🥴 Na kocovinu?", text: "Dej mi nejlepší hospodské rady a vyprošťováky na ranní kocovinu podle starých štamgastů." },
    { label: "🍲 Pivní sýr?", text: "Tradiční pivní sýr jako předkrm - jak se správně připravuje a čím ho zapít?" },
    { label: "🧙‍♂️ Patron sládků?", text: "Kdo je staročeský patron sládků a jaký má historický vztah k českému pivovarnictví?" },
    { label: "📏 Výška pěny?", text: "Na kolik prstů má správně sahat pěna u poctivě načepované hladinky?" },
    { label: "🍯 Medové pivo?", text: "Co jsou to speciální ochucená piva, jako například medové nebo borůvkové?" },
    { label: "🧪 Co je to mladina?", text: "Vysvětli mi, co dělají sládci ve varně a co je to mladina." },
    { label: "🌬️ Vzduch vs. dusík?", text: "Proč se říká, že pivo tlačené vzduchovým kompresorem rychleji větrá než pivo tlačené dusíkem?" },
    { label: "🍽️ Pivní guláš?", text: "Dej mi bleskový recept na poctivý domácí pivní guláš z hovězí kližky." },
    { label: "🍻 Runda v hospodě?", text: "Co znamená v české hospodské kultuře 'platit rundu' a jaká jsou u toho nepsaná pravidla?" },
    { label: "🥨 Slané k pivu?", text: "Proč se k pivu tradičně přikusují slané preclíky nebo arašídy?" },
    { label: "🧊 Ledový Eisbock?", text: "Slyšel jsem o vymrazovaném pivu. Jak takový Eisbock vzniká?" }
  ];
}

export default function AiAssistant({ isOpen, onClose, userLatLng, favoriteBeerName }: AiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic favorite beer resolution
  const favBeer = favoriteBeerName?.trim() || "Plzeň";

  // Pre-selected/randomized presets
  const [selectedPresets, setSelectedPresets] = useState<{ label: string; text: string }[]>([]);

  const handleRandomizePresets = () => {
    const list = getPresetQueriesList(favBeer);
    // Find the favorite beer query (always 3rd element in generator list: index 2)
    const favQuery = list[2];
    const remaining = list.filter((_, idx) => idx !== 2);
    // Shuffle remaining list
    const shuffled = [...remaining].sort(() => 0.5 - Math.random());
    // Take 3 random ones and append favorite beer query so we always show 4
    const selected = [favQuery, ...shuffled.slice(0, 3)];
    // Randomize order of the selected 4
    setSelectedPresets(selected.sort(() => 0.5 - Math.random()));
  };

  // Initialize with a warm greeting from the virtual Bartender and load initial presets
  useEffect(() => {
    handleRandomizePresets();
    if (messages.length === 0) {
      setMessages([
        {
          role: "model",
          text: "Dej bůh štěstí, kamaráde! 🍺 Vítám tě v našem virtuálním výčepu.\n\nJsem **Hospodský Kecal** — tvůj věrný pivní průvodce. Znám historii českého piva, vím, kam zajít na poctivý nefiltr, jaké jídlo si dát k dvanáctce, i co přesně znamená čepovat pivo na 'šnyt' nebo 'mlíko'.\n\nMám pod palcem i naši aktuální mapu hospod! Zeptej se mě třeba:\n- *Kde čepují nejlevnější pivo?*\n- *Kam mám jít na Plzeň?*\n- *Co si dát v restauraci k guláši?*\n\nCo ti dnes natočím za radu?",
          timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [favBeer]);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input.trim();
    if (!textToSend || loading) return;

    if (!customText) setInput("");
    setError("");

    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Package messages for historical context
      // Note: mapping role 'model' matches Gemini expectation
      const messageHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messageHistory,
          userLatLng,
        }),
      });

      let errorMessage = "Bartender API error";
      if (!res.ok) {
        try {
          const errData = await res.json();
          if (errData && errData.fallback) {
            errorMessage = errData.fallback;
          } else if (errData && errData.error) {
            errorMessage = errData.error;
          }
        } catch { /* ignore JSON parse error */ }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      const bartenderMsg: ChatMessage = {
        role: "model",
        text: data.text || "Vypadlo mi tágo, zeptej se znova, prosím.",
        timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, bartenderMsg]);
    } catch (err: any) {
      console.error(err);
      const isKeyMissing = err.message && (err.message.includes("GEMINI_API_KEY") || err.message.includes("sanitaci") || err.message.includes("key is missing") || err.message.includes("API key"));
      
      setError(err.message || "Asi jsem trochu přebral a motá se mi hlava. Dej mi chvilku, nebo zkus zprávu poslat znova!");
      
      // Standalone mockup backup so the chat works even during errors
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: isKeyMissing
            ? "🍻 **Chyba nastavení**: Vypadá to, že tvůj drahý Hospodský Kecal nemá k dispozici svůj mozkový pohon — chybí klíč **`GEMINI_API_KEY`**.\n\n**Jak to zachránit bez odhalení kódu?**\n1. Otevři svou administraci na **Render.com** (nebo jiném hostingu).\n2. Jdi do nastavení své aplikace a najdi záložku **Environment Variables** (nebo *Environment*).\n3. Přidej novou proměnnou:\n   - **Klíč (Key):** `GEMINI_API_KEY`\n   - **Hodnota (Value):** *(Vlož svůj tajný klíč z Google AI Studio)*\n4. Ulož změny a nechej aplikaci znovu sestavit (*Redeploy*).\n\nTím se tvůj klíč bezpečně uloží v šifrovaném prostředí Renderu a nikdo ho neuvidí ve tvém veřejném kódu na GitHubu! Do té doby ti rádi natočíme pivo tady na mapě!"
            : "Sakra, asi jsem přebral a momentálně nejsem schopen smysluplně odpovědět! 🍻 Točí se se mnou celý lokál a pípa stávkuje. \n\nDej si mezitím jedno studené točené, prohlédni si naše skvělé hospůdky na mapě nebo zkus napsat za chviličku znovu, až spláchnu tenhle ležák sklenicí čisté vody!",
          timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Chcete vymazat historii povídání s výčepním?")) {
      setMessages([
        {
          role: "model",
          text: "Začínáme s čistým stolem! 🧼 Trubky propláchnuté, sklenice čisté. O čem si pokecáme teď?",
          timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setError("");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-l border-amber-500/30 text-slate-100 shadow-2xl overflow-hidden">
      
      {/* Drawer Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-500/20 to-slate-900 border-b border-amber-500/20 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-lg ring-4 ring-amber-500/10">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-amber-500 uppercase tracking-wider leading-none">
              Hospodský Kecal
            </h2>
            <span className="text-[10px] text-emerald-400 font-bold block mt-1">● AI znalec piva online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            title="Smazat chat"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-slate-950/25">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col w-full max-w-[85%] ${
              m.role === "user" ? "ml-auto items-end" : "mr-auto items-start animate-fadeIn"
            }`}
          >
            <span className="text-[10px] text-slate-500 font-mono mb-1 px-1">
              {m.role === "user" ? "Vy" : "Hospodský Kecal"} • {m.timestamp}
            </span>
            <div
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words overflow-hidden max-w-full shadow-md ${
                m.role === "user"
                  ? "bg-slate-800 border border-slate-700 text-slate-100 rounded-tr-none"
                  : "bg-slate-900 border border-amber-500/15 text-slate-200 rounded-tl-none pr-6"
              }`}
              style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
            >
              {formatMessageText(m.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col items-start max-w-[85%] animate-pulse">
            <span className="text-[10px] text-slate-500 font-mono mb-1">
              Výčepní přemýšlí...
            </span>
            <div className="bg-slate-900 border border-amber-500/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              <span className="text-slate-400 text-xs">Urovnávám si myšlenky u pípy...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-500/20 text-red-300 text-xs rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      <div className="px-4 py-2 border-t border-amber-500/20 bg-slate-950/50 flex-shrink-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
            Rychlé dotazy k pivu:
          </span>
          <button
            type="button"
            onClick={handleRandomizePresets}
            title="Zamíchat otázky"
            className="flex items-center gap-1 text-[9px] text-amber-500/80 hover:text-amber-400 transition font-bold uppercase cursor-pointer"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Protočit
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selectedPresets.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q.text)}
              disabled={loading}
              className="text-[11px] font-medium bg-slate-850 hover:bg-amber-500/20 hover:text-amber-300 disabled:bg-slate-900 disabled:text-slate-600 px-2.5 py-1 rounded-xl border border-slate-800 transition-colors cursor-pointer text-left"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-amber-500/20 bg-slate-900 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zeptej se na cokoliv o pivu a hospodách..."
            disabled={loading}
            className="flex-grow bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-4 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-10 h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}

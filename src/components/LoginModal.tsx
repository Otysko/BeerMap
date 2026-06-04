import React, { useState, useEffect, useRef } from "react";
import { X, Mail, User, ShieldAlert, Sparkles } from "lucide-react";
import { UserProfile } from "../types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [hasGoogleCredentials, setHasGoogleCredentials] = useState(false);

  // References to isolate Google's dynamic DOM additions from React's Virtual DOM eyes
  const googleBtnParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let client_id = "";
    try {
      if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_CLIENT_ID) {
        client_id = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
      }
    } catch (e) {}

    // Check if a real client ID exists (not sample placeholders)
    if (client_id && !client_id.includes("sampleclientid") && !client_id.includes("YOUR_") && !client_id.includes("MY_")) {
      setHasGoogleCredentials(true);
    } else {
      setHasGoogleCredentials(false);
    }
  }, []);

  // Parse JWT token from Google Identity credential
  const parseGoogleJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT parse failed:", e);
      return null;
    }
  };

  // Dynamically load Google GIS script and isolate containers when Google GSI is active
  useEffect(() => {
    if (!isOpen || !hasGoogleCredentials) return;

    const scriptId = "google-gsi-client-script";
    const existingScript = document.getElementById(scriptId);

    // Create a button container dynamically under our parent ref to isolate DOM additions
    const btnContainer = document.createElement("div");
    btnContainer.id = "google-signin-btn-div";
    btnContainer.style.width = "320px";
    btnContainer.style.height = "45px";
    btnContainer.style.display = "flex";
    btnContainer.style.justifyContent = "center";
    btnContainer.style.alignItems = "center";

    if (googleBtnParentRef.current) {
      googleBtnParentRef.current.innerHTML = "";
      googleBtnParentRef.current.appendChild(btnContainer);
    }

    const initializeGoogleSignIn = () => {
      if (typeof window !== "undefined" && (window as any).google) {
        setIsGisLoaded(true);
        try {
          let client_id = "";
          try {
            if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_CLIENT_ID) {
              client_id = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
            }
          } catch (envErr) {}

          if (!(window as any).google.accounts?.id) {
            console.warn("Google GSI accounts SDK not fully loaded.");
            return;
          }

          (window as any).google.accounts.id.initialize({
            client_id: client_id,
            callback: (response: any) => {
              const decoded = parseGoogleJwt(response.credential);
              if (decoded && decoded.email) {
                const user: UserProfile = {
                  email: decoded.email,
                  name: decoded.name || decoded.email.split("@")[0],
                  picture: decoded.picture || undefined,
                };
                onLoginSuccess(user);
                onClose();
              } else {
                setErrorMsg("Během Google přihlašování se nepodařilo načíst detaily profilu.");
              }
            },
            cancel_on_tap_outside: true,
          });

          // Render Google Button in our dynamically-appended container
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: "dark",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: 320,
          });
        } catch (err) {
          console.error("Error setting up Google GSI:", err);
        }
      }
    };

    if (!existingScript) {
      try {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          try {
            initializeGoogleSignIn();
          } catch (e) {
            console.error("Uncaught error inside GSI onload:", e);
          }
        };
        script.onerror = (e) => {
          console.warn("Failed to load Google Identity Services script:", e);
        };
        document.body.appendChild(script);
      } catch (scriptErr) {
        console.warn("Error inserting Google script:", scriptErr);
      }
    } else {
      const t = setTimeout(() => {
        try {
          initializeGoogleSignIn();
        } catch (e) {
          console.error("Uncaught error inside GSI timer:", e);
        }
      }, 150);
      return () => clearTimeout(t);
    }

    // Explicit cleanup cleans the innerHTML manually BEFORE React dismantles the DOM wrapper, preventing removeChild crashes completely!
    return () => {
      if (googleBtnParentRef.current) {
        googleBtnParentRef.current.innerHTML = "";
      }
    };
  }, [isOpen, hasGoogleCredentials]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedName = nameInput.trim();

    if (!trimmedEmail) {
      setErrorMsg("Zadejte prosím platný e-mail.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setErrorMsg("E-mail musí obsahovat znak zavináče (@).");
      return;
    }
    if (!trimmedName) {
      setErrorMsg("Zadejte prosím své jméno nebo přezdívku.");
      return;
    }

    const isBlondMale = trimmedName.toLowerCase().includes("david") || trimmedName.toLowerCase().includes("kuncar");
    const mockProfilePicture = isBlondMale
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}`;

    const user: UserProfile = {
      email: trimmedEmail,
      name: trimmedName,
      picture: mockProfilePicture,
    };

    onLoginSuccess(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl relative max-h-[92dvh] flex flex-col">
        
        {/* Decorative elements */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-amber-500/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍺</span>
            <h2 className="text-lg font-bold font-display text-slate-100">
              Přihlášení do Pivního pasu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto flex-grow">
          <p className="text-xs text-slate-350 leading-relaxed font-sans">
            Založ si vlastní **Osobní Pivní Pas**! Můžeš sbírat úspěchy, odemykat až 20 různých pivních odznáčků a uchovávat si kompletní přehled navštívených míst a piv, která jsi osobně vypil.
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-200 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Real Google Sign-In Component Area */}
          {hasGoogleCredentials && (
            <div className="space-y-3.5 flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">
                Přihlásit se přes Google
              </span>
              
              <div className="relative w-[320px] h-[45px] flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md font-display">
                <div ref={googleBtnParentRef} className="w-[320px] h-[45px] flex items-center justify-center" />
                {!isGisLoaded && (
                  <div className="absolute inset-0 bg-slate-950 flex items-center justify-center gap-2 text-xs text-slate-400 pointer-events-none">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Google klient se připravuje...</span>
                  </div>
                )}
              </div>

              <div className="relative flex py-2 items-center w-full">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nebo přímé přihlášení</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </div>
          )}

          {/* Quick Manual Login Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5 font-sans">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 font-sans">
                <Mail className="w-3.5 h-3.5 text-amber-500/80" /> E-mailová adresa (pro uložení dat)
              </label>
              <input
                type="text"
                placeholder="napr. stamgast@seznam.cz"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500/50 outline-none text-slate-100 placeholder-slate-600 transition"
              />
            </div>

            <div className="space-y-1.5 font-sans">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-500/80" /> Jméno nebo přezdívka
              </label>
              <input
                type="text"
                placeholder="napr. Pepa Novák"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:border-amber-500/50 outline-none text-slate-100 placeholder-slate-600 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl font-bold font-display text-sm hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              Aktivovat Pivní pas
            </button>
          </form>

        </div>

        {/* Modal Footer Info */}
        <div className="bg-slate-950/80 px-6 py-3.5 border-t border-slate-850/80 text-[10px] text-slate-500 text-center flex-shrink-0">
          Vaše pivní skóre se bezpečně ukládá v našem sládkově archivu podle vašeho uníkátního profilu.
        </div>

      </div>
    </div>
  );
}


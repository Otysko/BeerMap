import React, { useState, useEffect } from "react";
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

  // Resilient check for iframes to prevent Cross-Origin SecurityErrors in strict mobile contexts
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        setIsIframe(window.self !== window.top);
      }
    } catch (e) {
      console.warn("Exception checking window context, defaulting to iframe sandbox:", e);
      setIsIframe(true);
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

  // Dynamically load Google GIS script
  useEffect(() => {
    if (!isOpen) return;

    // Inside sandboxed iframe environments, Google GSI scripts fail under strict security policy contexts.
    // We bypass GSI injection inside iframes to keep execution stable and 100% crash-proof.
    if (isIframe) {
      return;
    }

    const scriptId = "google-gsi-client-script";
    const existingScript = document.getElementById(scriptId);

    const initializeGoogleSignIn = () => {
      if (typeof window !== "undefined" && (window as any).google) {
        setIsGisLoaded(true);
        try {
          let client_id = "103681466023-sampleclientid.apps.googleusercontent.com"; // fallback
          try {
            if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_CLIENT_ID) {
              client_id = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
            }
          } catch (envErr) {
            console.warn("Could not read import.meta.env, using default credentials.", envErr);
          }
          
          if (!(window as any).google.accounts?.id) {
            console.warn("Google GSI accounts SDK not fully loaded inside proxy.");
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

          // Render Google Button in placeholder element
          const gBtnContainer = document.getElementById("google-signin-btn-div");
          if (gBtnContainer) {
            (window as any).google.accounts.id.renderButton(gBtnContainer, {
              theme: "dark",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              width: 320,
            });
          }
        } catch (err) {
          console.error("Error setting up Google GSI (this is expected in highly secure/sandboxed iframes):", err);
          // Don't crash the modal, the user can use manual login
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
            console.error("Uncaught error inside initializeGoogleSignIn onload:", e);
          }
        };
        script.onerror = (e) => {
          console.warn("Failed to load Google Identity Services client in this frame:", e);
        };
        document.body.appendChild(script);
      } catch (scriptErr) {
        console.warn("Error inserting Google Identity Services script:", scriptErr);
      }
    } else {
      // Small timeout to allow element rendering
      const t = setTimeout(() => {
        try {
          initializeGoogleSignIn();
        } catch (e) {
          console.error("Uncaught error inside initializeGoogleSignIn timeout:", e);
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, isIframe]);

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
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Decorative elements */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-amber-500/20">
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <p className="text-xs text-slate-350 leading-relaxed">
            Založ si vlastní **Osobní Pivní Pas**! Můžeš sbírat úspěchy, odemykat až 20 různých pivních odznáčků a uchovávat si kompletní přehled navštívených míst a piv, která jsi osobně vypil.
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-200 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Real Google Sign-In Component Area */}
          <div className="space-y-3.5 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">
              Přihlásit se jedním kliknutím
            </span>
            
            <div className="relative w-[320px] h-[45px] flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md font-display">
              {/* This GSI container is safely separated from React's eyes using dangerouslySetInnerHTML, making it 100% immune to virtual DOM reconciliation conflicts or removeChild/appendChild crashes */}
              <div
                dangerouslySetInnerHTML={{
                  __html: '<div id="google-signin-btn-div" style="width: 320px; height: 45px; display: flex; justify-content: center; align-items: center;"></div>'
                }}
              />
              
              {!isGisLoaded && !isIframe && (
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center gap-2 text-xs text-slate-400 pointer-events-none">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Google klient se připravuje...</span>
                </div>
              )}

              {isIframe && (
                <button
                  type="button"
                  onClick={() => {
                    onLoginSuccess({
                      email: "david.kuncar93@gmail.com",
                      name: "David Kuncar",
                      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac",
                    });
                    onClose();
                  }}
                  className="absolute inset-0 bg-slate-950 hover:bg-slate-900 flex items-center justify-center gap-3 transition cursor-pointer"
                >
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"
                    />
                  </svg>
                  <span className="text-xs font-bold text-slate-250">
                    Přihlásit se jako David (Google Demo)
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nebo přímé přihlášení</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Quick Manual Login Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
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

            <div className="space-y-1.5">
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
        <div className="bg-slate-950/80 px-6 py-3.5 border-t border-slate-850/80 text-[10px] text-slate-500 text-center">
          Vaše pivní skóre se bezpečně ukládá v našem sládkově archivu podle vašeho uníkátního profilu.
        </div>

      </div>
    </div>
  );
}

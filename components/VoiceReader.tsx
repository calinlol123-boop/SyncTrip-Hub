"use client";

import { useState, useEffect } from "react";

export default function VoiceReader() {
  const [isActive, setIsActive] = useState(false);

  // Funcția care citește efectiv textul
  const citesteTextul = (text: string) => {
    if (typeof window !== "undefined" && isActive) {
      // Oprim orice citire aflată în desfășurare ca să nu se suprapună vocile
      window.speechSynthesis.cancel();

      const mesaj = new SpeechSynthesisUtterance(text);
      mesaj.lang = "ro-RO"; // Setăm limba română
      mesaj.rate = 1.0;     // Viteza normală
      mesaj.pitch = 1.0;    // Tonul vocii
      
      window.speechSynthesis.speak(mesaj);
    }
  };

  // Detectăm când utilizatorul dă click pe orice element cu text
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!isActive) return;

      const element = e.target as HTMLElement;
      // Luăm textul din elementul pe care s-a dat click
      const textDeCitit = element.innerText || element.getAttribute("placeholder");

      if (textDeCitit) {
        citesteTextul(textDeCitit);
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [isActive]);

  return (
    <div className="fixed bottom-10 left-10 z-50">
      <button
        onClick={() => {
          const nouaStare = !isActive;
          setIsActive(nouaStare);
          // Notificăm utilizatorul audio despre starea funcției
          if (nouaStare) {
            // Un mic truc: forțăm o citire scurtă ca să activăm sistemul
            const welcome = new SpeechSynthesisUtterance("Asistent audio activat. Dați click pe orice text.");
            welcome.lang = "ro-RO";
            window.speechSynthesis.speak(welcome);
          } else {
            window.speechSynthesis.cancel();
          }
        }}
        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-tighter transition-all shadow-2xl border-2 ${
          isActive 
            ? "bg-red-600 border-red-500 text-white animate-pulse" 
            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-blue-500 hover:text-white"
        }`}
      >
        <span className="text-xl">{isActive ? "🛑" : "🔊"}</span>
        <span className="text-[10px] tracking-widest">
          {isActive ? "Dezactivează Vocea" : "Ascultă Site-ul"}
        </span>
      </button>
    </div>
  );
}
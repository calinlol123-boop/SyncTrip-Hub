"use client";

import { useState, useEffect } from "react";

export default function FontSizeControl() {
  // Pornim de la 100% (mărimea normală)
  const [zoom, setZoom] = useState(100);

  // De fiecare dată când "zoom" se schimbă, aplicăm setarea pe tot site-ul
  useEffect(() => {
    // Luăm elementul rădăcină al site-ului (html) și îi schimbăm font-size
    // Deoarece folosim Tailwind, toate elementele se vor mări automat
    document.documentElement.style.fontSize = `${zoom}%`;
  }, [zoom]);

  const mareste = () => {
    if (zoom < 150) setZoom(zoom + 10); // Limită maximă 150%
  };

  const micsoreaza = () => {
    if (zoom > 80) setZoom(zoom - 10); // Limită minimă 80%
  };

  const reset = () => setZoom(100);

  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-2">
      {/* Etichetă mică deasupra butoanelor */}
      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-right mr-2">
        Ajustare Vizuală
      </span>
      
      <div className="bg-slate-900 border-2 border-slate-800 p-2 rounded-2xl shadow-2xl flex items-center gap-2">
        {/* Buton Micșorare */}
        <button
          onClick={micsoreaza}
          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black transition-all active:scale-90"
          title="Micșorează textul"
        >
          A-
        </button>

        {/* Buton Reset (Arată procentul actual) */}
        <button
          onClick={reset}
          className="px-3 h-10 bg-slate-950 text-blue-500 rounded-xl font-black text-xs transition-all hover:text-white"
          title="Resetare la 100%"
        >
          {zoom}%
        </button>

        {/* Buton Mărire */}
        <button
          onClick={mareste}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-all active:scale-90"
          title="Mărește textul"
        >
          A+
        </button>
      </div>
    </div>
  );
}
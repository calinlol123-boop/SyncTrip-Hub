"use client";

import { useState, useEffect } from "react";

export default function HighContrastToggle() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Aplicăm sau scoatem clasa "high-contrast" de pe elementul HTML
  useEffect(() => {
    const root = document.documentElement;
    if (isHighContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [isHighContrast]);

  return (
    <div className="fixed bottom-28 right-10 z-50">
      <button
        onClick={() => setIsHighContrast(!isHighContrast)}
        className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all border-2 shadow-2xl flex items-center justify-center ${
          isHighContrast 
            ? "bg-yellow-400 border-yellow-400 text-black shadow-yellow-400/20" 
            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-white"
        }`}
        title="Toggle High Contrast"
      >
        🌓
      </button>
    </div>
  );
}
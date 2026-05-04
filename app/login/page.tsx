"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isLogin) {
      // LOGARE
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.push("/");
        router.refresh();
      }
    } else {
      // ÎNREGISTRARE
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setMessage(error.message);
      else setMessage("Verifică-ți email-ul pentru confirmare!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-black">
      <div className="max-w-md w-full bg-slate-900 border-2 border-slate-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <h1 className="text-4xl text-white mb-2 italic tracking-tighter uppercase text-center">
          SyncTrip <span className="text-blue-500">Hub</span>
        </h1>
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.4em] mb-10 text-center">
          {isLogin ? "Bun venit înapoi" : "Creează cont premium"}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="NUME COMPLET"
              className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold placeholder:text-slate-800"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="EMAIL"
            className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold placeholder:text-slate-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="PAROLĂ"
            className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold placeholder:text-slate-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl text-white font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Procesare..." : isLogin ? "Conectare" : "Creează Cont"}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-[10px] text-slate-500 hover:text-blue-500 uppercase tracking-[0.2em] transition-all"
        >
          {isLogin ? "Nu ai cont? Înregistrează-te" : "Ai deja cont? Loghează-te"}
        </button>

        {message && (
          <div className="mt-6 p-4 bg-slate-950 border border-blue-500/30 rounded-2xl text-blue-400 text-xs text-center animate-pulse uppercase">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
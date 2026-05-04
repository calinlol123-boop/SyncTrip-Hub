"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function DocumentVault({ trip_id }: { trip_id: string }) {
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const supabase = createClient();

  // Încărcăm documentele la pornire sau când se schimbă vacanța
  useEffect(() => {
    fetchDocs();
  }, [trip_id]);

  async function fetchDocs() {
    const { data, error } = await supabase
      .from("documente_trip")
      .select("*")
      .eq("trip_id", trip_id)
      .order("creat_at", { ascending: false });
    
    if (error) {
      console.error("Eroare la preluarea documentelor:", error.message);
    } else if (data) {
      setDocs(data);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      
      // ✅ GENERARE NUME UNIC: Folosim timestamp + nume curățat de spații
      // Asta previne eroarea de tip "Duplicate file" și suprascrierea fișierelor altor utilizatori
      const fileExt = file.name.split(".").pop();
      const cleanOriginalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const uniqueFileName = `${Date.now()}-${cleanOriginalName}.${fileExt}`;
      const filePath = `${trip_id}/${uniqueFileName}`;

      console.log("🚀 Începere upload pentru:", file.name);

      // 1. Încărcăm fișierul fizic în Supabase Storage
      const { data: storageData, error: uploadError } = await supabase.storage
        .from("documente")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("❌ EROARE STORAGE:", uploadError);
        throw uploadError;
      }

      // 2. Obținem URL-ul public pentru acces instantaneu
      const { data: { publicUrl } } = supabase.storage
        .from("documente")
        .getPublicUrl(filePath);

      // 3. Salvăm referința fișierului în baza de date (tabelul documente_trip)
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: dbError } = await supabase.from("documente_trip").insert({
        trip_id,
        user_id: user?.id,
        nume_fisier: file.name,
        url_fisier: publicUrl,
        tip_fisier: file.type
      });

      if (dbError) {
        console.error("❌ EROARE BAZĂ DATE:", dbError);
        throw dbError;
      }

      console.log("✅ Fișier salvat cu succes în Hub!");
      
      // Reîmprospătăm lista de pe ecran
      fetchDocs();
      alert("Documentul a fost salvat cu succes!");

    } catch (error: any) {
      console.error("Eroare completă proces upload:", error);
      alert(`Eroare la încărcare: ${error.message || "Verifică politicile de stocare în Supabase"}`);
    } finally {
      setUploading(false);
      // Resetăm input-ul pentru a permite încărcarea aceluiași fișier dacă e nevoie
      e.target.value = "";
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      {/* Accent decorativ premium */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
      
      <h2 className="text-xl font-black uppercase italic text-blue-500 mb-6 tracking-tighter text-center">
        Document <span className="text-white">Vault</span>
      </h2>
      
      {/* Zona de Drop/Click pentru Upload */}
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-800 rounded-[2rem] cursor-pointer hover:border-blue-500 hover:bg-blue-600/5 transition-all group mb-8">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] group-hover:text-blue-400 transition-colors">
            {uploading ? "Sincronizare fișier..." : "Încarcă Bilet / PDF / Foto"}
          </p>
          {!uploading && (
            <span className="mt-2 text-[18px] opacity-50 group-hover:opacity-100 transition-opacity">📁</span>
          )}
        </div>
        <input 
          type="file" 
          className="hidden" 
          onChange={handleUpload} 
          disabled={uploading} 
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
      </label>

      {/* Lista de Documente Sincronizate */}
      <div className="space-y-3">
        {docs.length === 0 && !uploading && (
          <p className="text-center text-[10px] text-slate-700 uppercase font-black py-4 tracking-widest">
            Seiful este gol
          </p>
        )}
        
        {docs.map((doc) => (
          <a
            key={doc.id}
            href={doc.url_fisier}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group shadow-lg"
          >
            <div className="flex flex-col truncate mr-4">
              <span className="text-[10px] font-black uppercase text-slate-300 group-hover:text-white truncate transition-colors leading-tight">
                {doc.nume_fisier}
              </span>
              <span className="text-[8px] text-slate-600 font-bold uppercase mt-1">
                {new Date(doc.creat_at).toLocaleDateString('ro-RO')}
              </span>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all flex items-center">
              <span className="text-blue-500 group-hover:text-white text-[9px] font-black tracking-widest uppercase">
                Vezi
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
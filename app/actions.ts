'use server'

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// 1. Configurare API Key (Acceptăm ambele variante de nume)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// 2. Configurare Supabase Admin (Folosim Service Role pentru a trece de RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// --- 🌦️ HELPER VREME (Portat din codul tău) ---
async function getVremeInfo(oras: string, dataISO: string) {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${oras}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results) return "vreme variabilă";
    
    const { latitude, longitude } = geoData.results[0];
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${dataISO}&end_date=${dataISO}`);
    const wData = await wRes.json();
    
    if (wData.daily) {
      return `Temp: ${wData.daily.temperature_2m_min[0]}-${wData.daily.temperature_2m_max[0]}°C, Șanse ploaie: ${wData.daily.precipitation_probability_max[0]}%`;
    }
    return "vreme specifică sezonului";
  } catch (e) { return "vreme imprevizibilă"; }
}

// --- 📅 GENERARE PLAN AI (Cu formatare bogată și iconițe) ---
export async function genereazaPlanAI(tripId: string, numeVacanta: string, dataSelectata: string, activitatiExistente: string[]) {
  if (!apiKey) return { success: false, error: "Cheia API lipsește!" };
  
  const prognoza = await getVremeInfo(numeVacanta, dataSelectata);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    const listaRepetitii = activitatiExistente.length > 0 
      ? `NU include următoarele (deja planificate): ${activitatiExistente.join(", ")}.` 
      : "";

    const prompt = `Ești un ghid turistic expert. Generează un itinerar premium pentru ${numeVacanta} pe data de ${dataSelectata}.
    PROGNOZA METEO: ${prognoza}. (Dacă plouă, prioritizează interiorul).
    ${listaRepetitii}
    
    Vreau exact 5 elemente: 4 cu ORE FIXE și al 5-lea cu ora "EXTRA".

    FORMATARE DESCRIERE (FOARTE IMPORTANT):
    Pentru primele 4, respectă acest format în descriere:
    ⏱️ [timp] | 💰 [preț]
    💡 [info scurt și interesant]
    🍴 Localuri: [Nume 1], [Nume 2]

    Pentru elementul EXTRA, descrierea trebuie să fie:
    Alte sugestii:
    - [Sugestie 1]
    - [Sugestie 2]

    Returnează STRICT JSON: [{"ora": "HH:mm sau EXTRA", "titlu": "Nume Obiectiv", "descriere": "textul cu iconițe"}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const planAI = JSON.parse(text);

    // Salvare automată
    await supabaseAdmin.from('activitati').delete().eq('trip_id', tripId).eq('data_activitate', dataSelectata);
    
    const { error } = await supabaseAdmin.from('activitati').insert(
      planAI.map((a: any) => ({
        trip_id: tripId,
        data_activitate: dataSelectata,
        ora: a.ora,
        titlu: a.titlu,
        descriere: a.descriere
      }))
    );

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Eroare Plan AI:", error);
    return { success: false, error: error.message };
  }
}

// --- 🎒 GENERARE BAGAJE AI (Cu reguli stricte de cantitate) ---
export async function genereazaBagajAI(tripId: string, numeVacanta: string, dataSosire: string, numarZile: number) {
  if (!apiKey) return { success: false, error: "Cheia API lipsește!" };
  
  const luna = dataSosire ? new Date(dataSosire).toLocaleString('ro-RO', { month: 'long' }) : "curentă";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Ești un expert în travel packing. Pentru o vacanță de ${numarZile} ZILE în ${numeVacanta} (luna ${luna}), generează o listă de minim 35 de obiecte.
    
    REGULI:
    1. Fără cifre la DOCUMENTE, ELECTRONICE, MAKE-UP.
    2. Pune cantitatea în paranteză DOAR pentru: Lenjerie intimă, Șosete și Tricouri. (ex: 'Șosete (${numarZile} perechi)').
    3. Categorii: VESTIMENTATIE, IGIENA, MAKE-UP, ELECTRONICE, DOCUMENTE, ACCESORII UTILE.

    Returnează DOAR array JSON: [{"obiect": "Nume", "categorie": "CATEGORIE"}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const bagajeAI = JSON.parse(text);

    // Salvare automată
    await supabaseAdmin.from('bagaje').delete().eq('trip_id', tripId);

    const { error } = await supabaseAdmin.from('bagaje').insert(
      bagajeAI.map((b: any) => ({
        trip_id: tripId,
        obiect: b.obiect,
        categorie: (b.categorie || "General").toUpperCase().trim(),
        bifat: false
      }))
    );

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- 🗑️ ADMIN: ȘTERGERE UTILIZATOR ---
export async function deleteUserById(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
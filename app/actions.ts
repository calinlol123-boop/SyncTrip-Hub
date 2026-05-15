'use server'

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from 'next/cache';

// 1. Configurare instanțe (Folosim cheia din .env)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Modelul stabil care funcționează sigur
const MODEL_NAME = "gemini-2.5-flash"; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// --- 🌦️ HELPER VREME (Extern API) ---
async function getVremeInfo(oras: string, dataISO: string) {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${oras}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData || !geoData.results) return "vreme variabilă";
    
    const { latitude, longitude } = geoData.results[0];
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${dataISO}&end_date=${dataISO}`);
    const wData = await wRes.json();
    
    if (wData.daily) {
      return `Temp: ${wData.daily.temperature_2m_min[0]}-${wData.daily.temperature_2m_max[0]}°C, Plouă: ${wData.daily.precipitation_probability_max[0]}%`;
    }
    return "vreme specifică sezonului";
  } catch (e) { return "vreme imprevizibilă"; }
}

// --- 📅 GENERARE MANUALĂ (Din Dashboard / Buton ✨ PLAN AI) ---
export async function genereazaPlanAI(tripId: string, numeVacanta: string, dataSelectata: string, activitatiExistente: string[]) {
  if (!apiKey) return { success: false, error: "Cheia API lipsește!" };
  const prognoza = await getVremeInfo(numeVacanta, dataSelectata);
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Ești un ghid turistic expert. Generează un itinerar premium pentru ${numeVacanta} pe data de ${dataSelectata}. PROGNOZA METEO: ${prognoza}. Returnează STRICT JSON fără text extra: [{"ora": "HH:mm", "titlu": "...", "descriere": "..."}]`;
    
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJson = rawText.match(/\[[\s\S]*\]/)?.[0] || rawText;
    const planAI = JSON.parse(cleanJson);

    await supabaseAdmin.from('activitati').delete().eq('trip_id', tripId).eq('data_activitate', dataSelectata);
    await supabaseAdmin.from('activitati').insert(planAI.map((a: any) => ({
        trip_id: tripId,
        data_activitate: dataSelectata,
        ...a
    })));
    
    revalidatePath(`/dashboard/trip/${tripId}`);
    return { success: true };
  } catch (error: any) { 
    console.error("Eroare Generare Plan:", error);
    return { success: false, error: error.message }; 
  }
}

// --- 🎒 GENERARE BAGAJE AI ---
export async function genereazaBagajAI(tripId: string, numeVacanta: string, dataSosire: string, numarZile: number) {
  if (!apiKey) return { success: false, error: "Cheia API lipsește!" };
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Generează o listă de bagaje pentru ${numarZile} zile în ${numeVacanta}. Returnează DOAR array JSON: [{"obiect": "...", "categorie": "..."}]`;
    
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJson = rawText.match(/\[[\s\S]*\]/)?.[0] || rawText;
    const bagajeAI = JSON.parse(cleanJson);

    await supabaseAdmin.from('bagaje').delete().eq('trip_id', tripId);
    await supabaseAdmin.from('bagaje').insert(bagajeAI.map((b: any) => ({
        trip_id: tripId,
        obiect: b.obiect,
        categorie: (b.categorie || "General").toUpperCase().trim(),
        bifat: false
    })));
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

// --- 🗑️ ADMIN ---
export async function deleteUserById(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

// --- 🚀 GRUPURI ---
export async function joinTripAction(joinCode: string, userId: string) {
  const { data: trip } = await supabaseAdmin.from('vacante').select('id').eq('join_code', joinCode.toLowerCase().trim()).single();
  if (!trip) return { error: "Cod invalid!" };
  const { error: joinError } = await supabaseAdmin.from('trip_participants').insert([{ trip_id: trip.id, user_id: userId, role: 'member' }]);
  if (joinError) return { error: "Ești deja membru." };
  revalidatePath('/dashboard');
  return { success: true };
}



// app/actions.ts - MODIFICĂ FUNCȚIA processAiBackgroundSync

// ========================================================
// 🤖 CORE: DEMOCRATIC CONSENSUS ENGINE (VOT MAJORITAR)
// ========================================================

async function processAiBackgroundSync(tripId: string, numeVacanta: string, dataActiva: string) {
  try {
    // 1. Calculăm pragul de majoritate (Câți oameni sunt în total în grup)
    const { count: nrParticipanti } = await supabaseAdmin
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    const pragVoturi = Math.floor((nrParticipanti || 1) / 2) + 1;

    // 2. Recuperăm ultimele 20 de mesaje și planul curent
    const { data: messages } = await supabaseAdmin.from('chat_messages').select('user_name, mesaj').eq('trip_id', tripId).order('creat_at', { ascending: false }).limit(20);
    const { data: currentActs } = await supabaseAdmin.from('activitati').select('ora, titlu, descriere').eq('trip_id', tripId).eq('data_activitate', dataActiva);

    if (!messages) return false;
    const history = messages.reverse().map(m => `${m.user_name}: ${m.mesaj}`).join("\n");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // 3. PROMPTUL DE ARBITRU DEMOCRATIC
    const prompt = `Ești Arbitrul Democratic pentru SyncTrip. Grupul are ${nrParticipanti} membrii.
    ISTORIC RECENT:
    ${history}
    
    MISIUNE:
    1. Detectează dacă un utilizator a propus o schimbare de itinerar.
    2. Identifică câți utilizatori DIFERIȚI au confirmat propunerea (ex: "da", "ok", "+1", "sunt de acord", "hai", "confirm").
    3. Dacă s-a atins majoritatea de minim ${pragVoturi} persoane, execuți schimbarea.
    4. Dacă nu e consens sau nu e cerută nicio schimbare clară, răspunde STRICT cu: IGNORE.

    DACĂ EXISTĂ CONSENS:
    Returnează STRICT un obiect JSON: 
    {
      "confirmare": "Mesaj scurt despre decizia grupului (ex: Majoritatea a decis schimbarea programului la ora 12! ✅)",
      "itinerar": [{"ora":"HH:mm", "titlu":"...", "descriere":"..."}]
    }
    Include mereu 5 elemente în itinerar (cel nou înlocuind cel vechi).`;

    const result = await model.generateContent(prompt);
    const resp = result.response.text().trim();

    if (resp.includes("IGNORE")) return false;

    // 4. Extracție și Execuție Modificări
    const cleanJson = resp.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0];
    if (cleanJson) {
      const parsed = JSON.parse(cleanJson);
      const noulItinerar = parsed.itinerar || parsed;
      const textConfirmare = parsed.confirmare || "Itinerar sincronizat cu succes! 🚀";

      // A. Update bază de date Activități
      await supabaseAdmin.from('activitati').delete().eq('trip_id', tripId).eq('data_activitate', dataActiva);
      await supabaseAdmin.from('activitati').insert(noulItinerar.map((p: any) => ({
        trip_id: tripId,
        data_activitate: dataActiva,
        ...p
      })));

      // B. ✅ NOTIFICARE ÎN CHAT (Mesajul de la Asistent)
      await supabaseAdmin.from('chat_messages').insert([{
        trip_id: tripId,
        user_name: 'SYNCTRIP ASSISTANT', // Mesaj special pentru UI
        mesaj: textConfirmare
      }]);

      return true;
    }
    return false;
  } catch (e) {
    console.error("ERRORE CONSENS AI:", e);
    return false;
  }
}

/**
 * Gateway principal pentru trimiterea mesajelor
 */
export async function sendChatMessage(
  tripId: string, 
  userId: string, 
  userName: string, 
  mesaj: string,
  dataActiva: string,
  numeVacanta: string,
  isSmartMode: boolean
) {
  try {
    // 1. Salvare mesaj în bază (pentru toată lumea)
    const { error: dbErr } = await supabaseAdmin.from('chat_messages').insert([{ 
      trip_id: tripId, 
      user_id: userId, 
      user_name: userName, 
      mesaj 
    }]);
    if (dbErr) throw dbErr;

    let updated = false;

    // 2. Modul Smart (Consens Engine)
    if (isSmartMode && mesaj.length > 2) {
      // Aceasta apelează AI-ul care decide dacă grupul vrea schimbarea
      updated = await processAiBackgroundSync(tripId, numeVacanta, dataActiva);
    }

    if (updated) {
       // Refresh server cache
       revalidatePath(`/dashboard/trip/${tripId}`);
    }

    return { success: true, updated };
  } catch (e: any) { 
    console.error("SEND MESSAGE ERROR:", e);
    return { error: e.message }; 
  }
}
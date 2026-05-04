'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client' // ✅ Actualizat pentru Auth
import { genereazaPlanAI } from '@/app/actions'
import PackingList from '../../../components/PackingList'
import DocumentVault from '../../../components/DocumentVault' // ✅ Import Nou
import Link from 'next/link'

export default function PaginaVacanta() {
  const params = useParams()
  const [nume, setNume] = useState('Se încarcă...')
  const [dataSosire, setDataSosire] = useState('')
  const [numarZile, setNumarZile] = useState(1)
  const [listaDate, setListaDate] = useState<string[]>([])
  const [ziSelectata, setZiSelectata] = useState('')
  const [activitati, setActivitati] = useState<any[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [nouaOra, setNouaOra] = useState('')
  const [nouaDescriere, setNouaDescriere] = useState('')
  
  const supabase = createClient() // ✅ Folosim clientul nou

  // ✅ STATE ACTUALIZAT CU MIN/MAX
  const [vreme, setVreme] = useState<{ temp: number; min: number; max: number; ploaie: number; hourly: any[] } | null>(null)

  async function incarca() {
    const { data: v } = await supabase.from('vacante').select('nume, data_sosire, data_plecare').eq('id', params.id).single()
    if (v) {
      setNume(v.nume)
      if (v.data_sosire && v.data_plecare) {
        setDataSosire(v.data_sosire)
        const start = new Date(v.data_sosire); const end = new Date(v.data_plecare);
        const dates = []; let curr = new Date(start);
        while (curr <= end) { dates.push(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate() + 1); }
        setListaDate(dates); setNumarZile(dates.length);
        if (!ziSelectata) setZiSelectata(dates[0]);
      }
    }
    const { data: act } = await supabase.from('activitati').select('*').eq('trip_id', params.id).order('ora', { ascending: true })
    if (act) setActivitati(act)
  }

  async function fetchVreme(oras: string, dataISO: string) {
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${oras}&count=1`);
      const geoData = await geoRes.json();
      if (!geoData.results) return;
      const { latitude, longitude } = geoData.results[0];
      
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${dataISO}&end_date=${dataISO}`);
      const wData = await wRes.json();
      
      if (wData.daily && wData.hourly) {
        const oreRelevante = [9, 12, 15, 18, 21];
        const prognozaOre = oreRelevante.map(ora => ({
          ora: ora + ":00",
          temp: Math.round(wData.hourly.temperature_2m[ora])
        }));

        setVreme({
          temp: Math.round(wData.hourly.temperature_2m[14]),
          max: Math.round(wData.daily.temperature_2m_max[0]),
          min: Math.round(wData.daily.temperature_2m_min[0]),
          ploaie: wData.daily.precipitation_probability_max[0],
          hourly: prognozaOre
        });
      }
    } catch (e) { console.error(e); }
  }

  useEffect(() => { incarca() }, [params.id])
  useEffect(() => { if (nume !== 'Se încarcă...' && ziSelectata) fetchVreme(nume, ziSelectata); }, [nume, ziSelectata]);

  async function adaugaManual(e: React.FormEvent) {
    e.preventDefault(); if (!nouaOra || !nouaDescriere) return;
    await supabase.from('activitati').insert([{ trip_id: params.id, ora: nouaOra, descriere: nouaDescriere, data_activitate: ziSelectata }]);
    setNouaOra(''); setNouaDescriere(''); incarca();
  }

  async function handleAI() {
    setLoadingAI(true);
    try {
      const vizitate = activitati.map(a => a.descriere.split('\n')[0]);
      // Trimitem și trip_id pentru salvare automată conform noului actions.ts
      const res = await genereazaPlanAI(params.id as string, nume, ziSelectata, vizitate);
      if (res.success) {
        await incarca();
      }
    } catch (err) { console.error(err); } finally { setLoadingAI(false); }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans selection:bg-blue-500">
      <div className="max-w-7xl mx-auto">
        <Link href="/" className="text-slate-500 hover:text-white text-[10px] tracking-widest font-black uppercase transition-colors">← DASHBOARD</Link>
        
        <div className="flex flex-col lg:flex-row justify-between items-start mt-8 gap-10">
          <div className="flex-1">
            <h1 className="text-7xl md:text-9xl font-black text-blue-500 uppercase tracking-tighter leading-none">{nume}</h1>
            <div className="flex items-center gap-3 mt-6 ml-1">
              <div className="h-[2px] w-12 bg-blue-500/50"></div>
              <p className="text-slate-500 font-black tracking-[0.4em] uppercase text-[10px] italic">
                Vacanță de {numarZile} zile
              </p>
            </div>
          </div>

          {vreme && (
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] flex flex-col gap-6 backdrop-blur-xl shadow-2xl min-w-[360px]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-6">
                   <span className="text-6xl">{vreme.ploaie > 30 ? '🌧️' : '☀️'}</span>
                   <div>
                     <p className="text-5xl font-black text-white">{vreme.temp}°C</p>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-2">
                        MAX: <span className="text-white">{vreme.max}°</span> | MIN: <span className="text-white">{vreme.min}°</span>
                     </p>
                   </div>
                </div>
                <div className="bg-blue-600/10 px-5 py-3 rounded-2xl border border-blue-500/20 text-center">
                   <p className="text-blue-500 font-black text-2xl leading-none">{vreme.ploaie}%</p>
                   <p className="text-[9px] text-slate-500 font-black uppercase mt-2">Ploaie</p>
                </div>
              </div>
              
              <div className="flex justify-between px-1 border-t border-slate-800 pt-6">
                {vreme.hourly.map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <span className="text-[9px] text-slate-500 font-black uppercase">{h.ora}</span>
                    <div className="w-1.5 h-4 bg-slate-800 rounded-full overflow-hidden flex items-end">
                       <div className="bg-blue-500 w-full" style={{ height: `${(h.temp / vreme.max) * 100}%` }}></div>
                    </div>
                    <span className="text-[13px] font-black text-slate-200">{h.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-10 overflow-x-auto pb-6 no-scrollbar">
          {listaDate.map((data) => (
            <button key={data} onClick={() => setZiSelectata(data)} className={`px-6 py-4 rounded-[2rem] font-black transition-all flex flex-col items-center min-w-[120px] border-2 ${ziSelectata === data ? 'bg-blue-600 border-blue-500 text-white shadow-xl scale-105' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
              <span className="text-[9px] uppercase font-black tracking-widest mb-1 opacity-60">{new Date(data).toLocaleDateString('ro-RO', { weekday: 'short' })}</span>
              <span className="text-xl tracking-tighter">{new Date(data).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mt-8">
          <section>
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Itinerar</h2>
               <button onClick={handleAI} disabled={loadingAI} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50">✨ PLAN AI</button>
             </div>
             <form onSubmit={adaugaManual} className="mb-10 flex gap-2 bg-slate-900 border border-slate-800 p-3 rounded-3xl shadow-inner">
                <input placeholder="ORA" value={nouaOra} onChange={(e) => setNouaOra(e.target.value)} className="w-24 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-500" />
                <input placeholder="PLAN MANUAL..." value={nouaDescriere} onChange={(e) => setNouaDescriere(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-500" />
                <button type="submit" className="bg-slate-800 hover:bg-slate-700 px-6 rounded-2xl font-black text-xl transition-all border border-slate-700">+</button>
             </form>
             <div className="space-y-8">
                {activitati.filter(a => a.data_activitate === ziSelectata).length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-900 rounded-[3rem]">
                    <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.5em]">Nicio activitate planificată</p>
                  </div>
                )}
                {activitati.filter(a => a.data_activitate === ziSelectata).map(a => {
                   const isExtra = a.ora.toLowerCase() === "extra";
                   const linii = a.descriere.split('\n'); const titlu = linii[0]; const rest = linii.slice(1).join('\n');
                   return (
                     <div key={a.id} className="p-8 bg-slate-900/50 border border-slate-800 rounded-[3rem] shadow-2xl hover:border-blue-500/30 transition-all relative group">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
                          <span className="text-blue-500 font-black text-[10px] tracking-[0.3em] uppercase">{a.ora}</span>
                        </div>
                        {isExtra ? (
                          <div className="text-slate-400 text-lg whitespace-pre-line leading-relaxed font-bold italic">{a.descriere}</div>
                        ) : (
                          <>
                            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter leading-none uppercase italic group-hover:translate-x-2 transition-transform">{titlu}</h3>
                            {rest && <p className="text-slate-500 text-[14px] whitespace-pre-line leading-relaxed font-bold tracking-tight">{rest}</p>}
                          </>
                        )}
                     </div>
                   )
                })}
             </div>
          </section>

          {/* COLOANA DREAPTA: BAGAJE + DOCUMENT VAULT */}
          <section className="lg:sticky lg:top-12 self-start space-y-10">
             <PackingList tripId={params.id as string} tripName={nume} dataSosire={dataSosire} numarZile={numarZile} />
             
             {/* ✅ ADAUGAT DOCUMENT VAULT AICI */}
             <DocumentVault trip_id={params.id as string} />
          </section>
        </div>
      </div>
    </main>
  )
}
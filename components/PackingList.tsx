'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { genereazaBagajAI } from '@/app/actions'

interface PackingListProps { 
  tripId: string; 
  tripName: string; 
  dataSosire: string; 
  numarZile: number; 
}

export default function PackingList({ tripId, tripName, dataSosire, numarZile }: PackingListProps) {
  const [bagaje, setBagaje] = useState<any[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const categoriiSet = ["VESTIMENTATIE", "IGIENA", "MAKE-UP", "ELECTRONICE", "DOCUMENTE", "ACCESORII UTILE"];

  async function incarca() {
    setLoading(true)
    const { data } = await supabase
      .from('bagaje')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });
    
    if (data) setBagaje(data)
    setLoading(false)
  }

  useEffect(() => {
    incarca()
  }, [tripId])

  async function handleAI() {
    if (!tripName) return alert("Numele vacanței lipsește.");
    setLoadingAI(true);
    
    try {
      // ✅ Serverul face toată treaba (AI + Salvare în DB)
      const res = await genereazaBagajAI(tripId, tripName, dataSosire, numarZile);
      
      if (res.success) {
        await incarca(); // Doar reîmprospătăm ecranul
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("Eroare de comunicare cu serverul.");
    } finally {
      setLoadingAI(false);
    }
  }

  async function toggleBifat(id: string, stareActuala: boolean) {
    const { error } = await supabase.from('bagaje').update({ bifat: !stareActuala }).eq('id', id);
    if (!error) {
      setBagaje(prev => prev.map(b => b.id === id ? { ...b, bifat: !stareActuala } : b));
    }
  }

  const clean = (txt: string) => txt?.toUpperCase().trim() || "";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden font-black selection:bg-blue-500">
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-20"></div>
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl tracking-tighter uppercase italic text-white">Packing List</h2>
        <button 
          onClick={handleAI} 
          disabled={loadingAI} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-900/20"
        >
          {loadingAI ? '🤖 Sincronizare...' : '✨ Sugestii AI'}
        </button>
      </div>

      <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {loading && bagaje.length === 0 ? (
          <p className="text-center py-10 text-[10px] text-slate-700 font-black uppercase animate-pulse">Se încarcă...</p>
        ) : (
          categoriiSet.map(cat => {
            const items = bagaje.filter(b => clean(b.categorie) === clean(cat));
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-4">
                <h3 className="text-[10px] font-black text-blue-500 tracking-[0.3em] uppercase px-1 border-l-2 border-blue-500/30 pl-3">{cat}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleBifat(item.id, item.bifat)} 
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group cursor-pointer ${
                        item.bifat ? 'bg-blue-600/5 border-blue-500/10 opacity-40' : 'bg-slate-950 border-slate-800 hover:border-blue-500/30 shadow-lg'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${item.bifat ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800'}`}>
                        {item.bifat && <span className="text-[10px]">✓</span>}
                      </div>
                      <span className={`flex-1 text-xs font-black uppercase tracking-tight transition-all ${item.bifat ? 'text-slate-600 line-through' : 'text-slate-200'}`}>
                        {item.obiect}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}
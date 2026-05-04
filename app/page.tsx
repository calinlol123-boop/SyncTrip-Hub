'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteUserById } from '@/app/actions' // ✅ Importăm acțiunea de ștergere

export default function Home() {
  const [numeNou, setNumeNou] = useState('')
  const [dataSosire, setDataSosire] = useState('')
  const [dataPlecare, setDataPlecare] = useState('')
  const [vacante, setVacante] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  const router = useRouter()

  async function incarcaVacante() {
    setLoading(true)
    const { data, error } = await supabase
      .from('vacante')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error("Eroare la încărcarea vacanțelor:", error.message)
    } else if (data) {
      setVacante(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    incarcaVacante()
  }, [])

  // ✅ FUNCȚIA DE ȘTERGERE CONT (PENTRU TESTARE RAPIDĂ)
  const handleStergeCont = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert("Nu ești logat.")
      return
    }

    const confirmare = confirm("⚠️ ATENȚIE: Această acțiune va șterge DEFINITIV contul tău și TOATE vacanțele create. Sigur vrei să continui?")
    
    if (confirmare) {
      const res = await deleteUserById(user.id)
      if (res.success) {
        alert("Contul a fost șters. Te poți înregistra din nou cu același email.")
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
      } else {
        alert("Eroare la ștergere: " + res.error)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function stergeVacanta(id: string) {
    if (!confirm("Ești sigur că vrei să ștergi această vacanță? Această acțiune nu poate fi anulată.")) return

    const { error } = await supabase.from('vacante').delete().eq('id', id)

    if (!error) {
      setVacante(vacante.filter(v => v.id !== id))
    } else {
      alert("Eroare la ștergere: " + error.message)
    }
  }

  async function adauga(e: React.FormEvent) {
    e.preventDefault()
    if (!numeNou || !dataSosire || !dataPlecare) {
      alert("Te rugăm să completezi toate câmpurile pentru vacanță!")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("Sesiune expirată. Te rugăm să te loghezi din nou.")
      router.push('/login')
      return
    }

    const { error } = await supabase.from('vacante').insert([
      { 
        nume: numeNou, 
        data_sosire: dataSosire, 
        data_plecare: dataPlecare,
        user_id: user.id 
      }
    ])

    if (!error) {
      setNumeNou('')
      setDataSosire('')
      setDataPlecare('')
      incarcaVacante()
    } else {
      alert("A apărut o eroare la salvare: " + error.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 font-black selection:bg-blue-500">
      <div className="max-w-4xl mx-auto">
        {/* Header cu Branding și Butoane de Control */}
        <div className="flex justify-between items-center mb-16">
          <h1 className="text-4xl md:text-6xl tracking-tighter italic uppercase">
            SyncTrip <span className="text-blue-500">Hub</span>
          </h1>
          <div className="flex gap-3">
            {/* Buton Ștergere Cont - Stil vizual de alertă */}
            <button 
              onClick={handleStergeCont}
              className="text-[10px] bg-red-950/20 border border-red-900/50 text-red-500 px-5 py-3 rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest"
            >
              Șterge Cont
            </button>
            <button 
              onClick={handleLogout}
              className="text-[10px] bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl hover:bg-white hover:text-black transition-all uppercase tracking-widest"
            >
              Ieșire
            </button>
          </div>
        </div>
        
        {/* Formular de adăugare */}
        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[3rem] mb-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <h2 className="text-blue-500 text-xs uppercase tracking-[0.3em] mb-6">Planificator Nou</h2>
          
          <form onSubmit={adauga} className="space-y-6">
            <input 
              type="text" 
              value={numeNou} 
              onChange={(e) => setNumeNou(e.target.value)} 
              placeholder="Destinație (Ex: Tokyo 2024)" 
              className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold placeholder:text-slate-800" 
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-500 ml-2 uppercase">Dată Sosire</label>
                <input 
                  type="date" 
                  value={dataSosire} 
                  onChange={(e) => setDataSosire(e.target.value)} 
                  className="bg-slate-950 border border-slate-800 p-5 rounded-2xl outline-none focus:border-blue-500 transition-all uppercase text-sm" 
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-500 ml-2 uppercase">Dată Plecare</label>
                <input 
                  type="date" 
                  value={dataPlecare} 
                  onChange={(e) => setDataPlecare(e.target.value)} 
                  className="bg-slate-950 border border-slate-800 p-5 rounded-2xl outline-none focus:border-blue-500 transition-all uppercase text-sm" 
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-2xl text-white font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95"
            >
              Creează Vacanța
            </button>
          </form>
        </div>

        {/* Lista de Vacanțe */}
        <h2 className="text-xl uppercase italic mb-8 border-l-4 border-blue-500 pl-4 tracking-tighter">Călătoriile Tale</h2>
        
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-10 animate-pulse text-slate-600 uppercase text-xs tracking-widest">Sincronizare Hub...</div>
          ) : vacante.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-800 text-slate-600 uppercase text-[10px] tracking-widest">
              Nicio vacanță salvată.
            </div>
          ) : (
            vacante.map((v) => (
              <div 
                key={v.id} 
                className="group p-6 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 hover:border-blue-500/50 transition-all shadow-xl relative overflow-hidden"
              >
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-2xl md:text-3xl uppercase italic group-hover:text-blue-500 transition-colors">{v.nume}</span>
                  <span className="text-[10px] text-slate-500 mt-2 tracking-[0.2em] font-mono">
                    {v.data_sosire} <span className="text-blue-600 mx-2">→</span> {v.data_plecare}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => stergeVacanta(v.id)}
                    className="p-4 bg-slate-950 rounded-2xl text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all border border-slate-800"
                    title="Șterge Vacanța"
                  >
                    🗑️
                  </button>
                  
                  <Link 
                    href={`/trip/${v.id}`} 
                    className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-white/5 active:scale-95"
                  >
                     Vezi Itinerar
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
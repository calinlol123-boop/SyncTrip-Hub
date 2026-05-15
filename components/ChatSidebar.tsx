'use client'

import { useState, useEffect, useRef } from 'react';
// ✅ Folosim clientul tău de Supabase pentru browser
import { createClient } from '@/utils/supabase/client'; 
import { sendChatMessage } from '@/app/actions';

interface Message {
  id: string;
  user_name: string;
  mesaj: string;
  user_id: string;
  creat_at: string;
}

export default function ChatSidebar({ 
  tripId, 
  userId, 
  userName, 
  numeVacanta, 
  dataActiva 
}: { 
  tripId: string, 
  userId: string, 
  userName: string,
  numeVacanta: string,
  dataActiva: string 
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSmartMode, setIsSmartMode] = useState(false); // Mod AI
  const [isProcessing, setIsProcessing] = useState(false); // Stare de procesare
  
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Funcție de scroll la ultimul mesaj
  const scrollToBottom = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1. Încărcarea mesajelor existente
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('creat_at', { ascending: true });
    
    if (error) {
      console.error("Eroare preluare mesaje:", error.message);
    } else if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 200);
    }
  };

  useEffect(() => {
    fetchMessages();

    // 2. Abonare Realtime pentru mesaje live
    const channel = supabase
      .channel(`chat_room_${tripId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `trip_id=eq.${tripId}` 
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
        });
        // Corecție aici: un singur argument de timp
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => { 
        supabase.removeChannel(channel); 
    };
  }, [tripId, dataActiva]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isProcessing) return;

    const textMesaj = newMessage;
    setNewMessage(""); 
    setIsProcessing(true);

    try {
      const result = await sendChatMessage(
        tripId, 
        userId, 
        userName, 
        textMesaj, 
        dataActiva, 
        numeVacanta, 
        isSmartMode
      );
      
      // Dacă AI-ul a modificat programul:
      if (result && result.updated) {
         // ✅ ACUM NU mai dezactivăm modul Smart (setIsSmartMode(false) a fost sters)
         // Dăm refresh la itinerar
         window.location.reload(); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      // Menținem isSmartMode așa cum l-a lăsat utilizatorul (Pornit)
    }
  };

  return (
    <div className="flex flex-col h-[580px] w-full bg-slate-950/80 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
      
      {/* Header Vizual */}
      <div className="p-6 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="font-black text-white uppercase text-[10px] tracking-widest italic">SyncTrip Live Hub</h2>
          <div className="flex items-center gap-1.5 mt-1 text-[7px] font-bold uppercase">
              <div className={`w-1 h-1 rounded-full ${isSmartMode ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <span className={isSmartMode ? "text-blue-400" : "text-slate-600"}>
                {isSmartMode ? "AI Ghost Monitor ON" : "Mod Chat Normal"}
              </span>
          </div>
        </div>

        {/* Toggle pentru AI (Protejăm bugetul API Gemini Free) */}
        <button 
          onClick={() => setIsSmartMode(!isSmartMode)}
          className={`flex items-center p-1.5 px-4 rounded-xl transition-all border ${
            isSmartMode 
            ? 'bg-blue-600 border-blue-400 text-white' 
            : 'bg-slate-900 border-slate-700 text-slate-500 opacity-60'
          }`}
        >
           <span className="text-[9px] font-black uppercase mr-2 tracking-tighter">
              {isSmartMode ? 'SMART ✨' : 'Standard'}
           </span>
           <div className={`w-3 h-3 rounded-md transition-all ${isSmartMode ? 'bg-white animate-pulse' : 'bg-slate-700'}`}></div>
        </button>
      </div>

      {messages.map((m, idx) => {
  const isSystem = m.user_name === 'SYNCTRIP ASSISTANT';

  if (isSystem) {
    return (
      <div key={idx} className="flex justify-center my-4 animate-bounce">
        <div className="bg-blue-600/20 border border-blue-500/50 px-4 py-1.5 rounded-full shadow-lg shadow-blue-900/10">
          <p className="text-[9px] font-black text-blue-400 uppercase italic tracking-widest flex items-center gap-2">
            ✨ {m.mesaj}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div key={idx} className={`flex flex-col ${m.user_id === userId ? 'items-end' : 'items-start'}`}>
      <span className="text-[7px] text-slate-600 font-black uppercase mb-1 px-2">{m.user_name}</span>
      <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[11px] font-bold ${
        m.user_id === userId ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
      }`}>
        {m.mesaj}
      </div>
    </div>
  );
})}
      {/* Input și Trimitere */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/40 border-t border-slate-800/40">
        {isProcessing && isSmartMode && (
           <div className="flex items-center gap-2 mb-2 px-1 text-[7px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                Agentul analizează propunerea...
           </div>
        )}
        <div className="flex gap-2">
            <input 
              autoComplete="off"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isSmartMode ? "Ce vrei să schimbi în plan?" : "Vorbește cu grupul..."}
              disabled={isProcessing}
              className={`flex-1 bg-slate-950 border transition-all rounded-xl px-5 py-4 text-[11px] font-bold text-white outline-none ${
                isSmartMode ? 'border-blue-500/50 focus:border-blue-500 shadow-blue-500/10' : 'border-slate-800'
              }`}
            />
            <button 
                type="submit" 
                disabled={isProcessing || !newMessage.trim()}
                className="w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-xl bg-blue-600 hover:bg-blue-500 active:scale-90"
            >
              {isProcessing ? "⏳" : <span className="text-xl rotate-45 mb-1 mr-1 text-white">✈️</span>}
            </button>
        </div>
      </form>
    </div>
  );
}
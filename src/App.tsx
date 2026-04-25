/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { AppState, Role, AppState as IAppState } from './types';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Trophy, 
  Settings, 
  LogIn, 
  LogOut,
  Menu,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- CONFIGURAZIONE ---
const ADMIN_EMAILS = ['cristian.laporta04@gmail.com', 'Cinziavenuti1985@libero.it']; 

export default function App() {
  const [state, setState] = useState<IAppState>({
    utente: null,
    ruolo: 'ospite',
    squadre: [],
    partite: [],
    capitani: [],
    config: {
      id: 1,
      nome: 'Torneo Memorial',
      num_gironi: 2,
      andata_ritorno: false,
      riposo_minimo_giorni: 1,
      fase_attuale: 'setup'
    },
    loading: true
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- LOGICA AUTH & Inizializzazione ---
  useEffect(() => {
    const init = async () => {
      // Caricamento offline cache
      const cache = localStorage.getItem('torneo_cache');
      let cachedState = null;
      if (cache) {
        cachedState = JSON.parse(cache);
        setState(prev => ({ ...prev, ...cachedState, loading: false }));
      }

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          await handleAuthChange({ email: user.email, user_metadata: { avatar_url: user.photoURL } }, cachedState?.capitani || []);
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      });
      return unsubscribe;
    };
    const unsubscribePromise = init();
    return () => {
      unsubscribePromise.then(unsub => unsub?.());
    };
  }, []);

  const handleAuthChange = async (user: any | null, capitaniList: Capitano[] = state.capitani) => {
    let ruolo: Role = 'ospite';
    let currentCapitani = capitaniList;

    if (user) {
      ruolo = 'ospite_autenticato';
      if (ADMIN_EMAILS.includes(user.email)) {
        ruolo = 'admin';
      } else {
        try {
           const querySnapshot = await getDocs(collection(db, 'capitani'));
           const data: any = [];
           querySnapshot.forEach((doc) => {
             data.push({ id: doc.id, ...doc.data() });
           });
           if (data.length > 0) currentCapitani = data;
        } catch (e) {}
        
        const isCapitano = currentCapitani.find(c => c.email === user.email);
        if (isCapitano) ruolo = 'capitano';
      }
    }

    setState(prev => ({ 
      ...prev, 
      utente: user, 
      ruolo, 
      capitani: currentCapitani,
      loading: false 
    }));
  };

  const login = () => {
    setShowLoginModal(true);
  };

  const simulateLogin = (type: 'admin' | 'capitano' | 'user') => {
    setShowLoginModal(false);
    let email = 'user@example.com';
    let avatar = 'https://i.pravatar.cc/150?u=user';
    
    if (type === 'admin') {
      email = ADMIN_EMAILS[0];
      avatar = 'https://i.pravatar.cc/150?u=admin';
    } else if (type === 'capitano') {
      email = 'capitano@example.com';
      avatar = 'https://i.pravatar.cc/150?u=capitano';
      // Aggiungiamo un capitano mock se non esiste
      if (!state.capitani.find(c => c.email === email)) {
        const mockCapitano: Capitano = {
          id: 'mock-cap', email, squadra_id: 'mock-squadra', autorizzato_da: 'admin', creato_at: new Date().toISOString()
        };
        setState(prev => ({...prev, capitani: [...prev.capitani, mockCapitano]}));
      }
    }
    
    handleAuthChange({ email, user_metadata: { avatar_url: avatar } });
  };

  const logout = async () => {
    try { await signOut(auth); } catch (e) {}
    handleAuthChange(null);
    setActiveTab('dashboard');
  };

  // --- GESTIONE STATO GLOBALE ---
  const updateState = (newState: Partial<IAppState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState };
      localStorage.setItem('torneo_cache', JSON.stringify({
        squadre: updated.squadre,
        partite: updated.partite,
        capitani: updated.capitani,
        config: updated.config
      }));
      return updated;
    });
  };

  // --- RENDERING ---
  if (state.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-tournament-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tournament-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-tournament-bg)] pb-24">
      {/* Header Fisso */}
      <header className="sticky top-0 z-50 flex h-16 sm:h-20 items-center justify-between border-b border-[color:var(--color-tournament-border)] bg-black/90 backdrop-blur-md px-4 sm:px-6 text-white">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[color:var(--color-tournament-primary)] text-black">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" weight="fill" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black leading-none tracking-tighter uppercase">
              {state.config.nome}
            </h1>
            <div className="status-pulse mt-1">
              <span className="status-dot"></span>
              {activeTab.toUpperCase()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {state.utente ? (
            <div className="flex items-center gap-3">
              <img 
                src={state.utente.user_metadata?.avatar_url || ''} 
                alt="Avatar" 
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-[color:var(--color-tournament-border)]"
              />
              <button 
                onClick={logout}
                className="rounded-full p-2 text-zinc-500 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="px-4 py-2 bg-zinc-800 rounded text-xs text-zinc-300 font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
            >
              ACCEDI
            </button>
          )}
        </div>
      </header>

      {/* Contenuto Main con Animazione */}
      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardView state={state} login={login} setActiveTab={setActiveTab} />}
            {activeTab === 'squadre' && <SquadreView state={state} />}
            {activeTab === 'calendario' && <CalendarioView state={state} updateState={updateState} />}
            {activeTab === 'classifica' && <ClassificaView state={state} />}
            {activeTab === 'admin' && <AdminView state={state} updateState={updateState} />}
            {activeTab === 'mia_squadra' && <MiaSquadraView state={state} updateState={updateState} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav-glass">
        {/* ... TabButtons renderizzati originariamente, preservati più in basso se possibile ... */}
        <TabButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={22} />} 
          label="Home" 
        />
        <TabButton 
          active={activeTab === 'squadre'} 
          onClick={() => setActiveTab('squadre')} 
          icon={<Users size={22} />} 
          label="Squadre" 
        />
        <TabButton 
          active={activeTab === 'calendario'} 
          onClick={() => setActiveTab('calendario')} 
          icon={<Calendar size={22} />} 
          label="Calendario" 
        />
        <TabButton 
          active={activeTab === 'classifica'} 
          onClick={() => setActiveTab('classifica')} 
          icon={<Trophy size={22} />} 
          label="Classifica" 
        />
        {state.ruolo === 'admin' ? (
          <TabButton 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')} 
            icon={<Settings size={22} />} 
            label="Admin" 
          />
        ) : state.ruolo === 'capitano' ? (
          <TabButton 
            active={activeTab === 'mia_squadra'} 
            onClick={() => setActiveTab('mia_squadra')} 
            icon={<UserIcon size={22} />} 
            label="Squadra" 
          />
        ) : null}
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card-bold w-full max-w-sm relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-6">Simula Accesso</h2>
            
            <div className="space-y-3">
              <button 
                onClick={() => simulateLogin('admin')}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700 flex justify-between px-4 items-center"
              >
                <span>Accesso Admin</span>
                <Settings size={16} className="text-[color:var(--color-tournament-primary)]"/>
              </button>
              
              <button 
                onClick={() => simulateLogin('capitano')}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700 flex justify-between px-4 items-center"
              >
                <span>Accesso Capitano</span>
                <UserIcon size={16} className="text-[color:var(--color-tournament-primary)]"/>
              </button>

              <button 
                 onClick={async () => {
                  setShowLoginModal(false);
                  try {
                    await signInWithPopup(auth, new GoogleAuthProvider());
                  } catch (error: any) {
                    alert("OAuth error: " + error.message);
                  }
                 }}
                className="w-full bg-[color:var(--color-tournament-primary)] text-black font-black py-3 rounded-xl transition-colors mt-4"
              >
                Vero Login Google (Test)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTI UI MINORI ---

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 transition-all ${
        active ? 'text-[color:var(--color-tournament-primary)]' : 'text-zinc-500'
      }`}
    >
      <div className={`${active ? 'scale-110 mb-0.5' : ''} transition-transform`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTab" 
          className="absolute -top-4 h-0.5 w-6 rounded-full bg-[color:var(--color-tournament-primary)] shadow-[0_0_10px_#3ecf8e]" 
        />
      )}
    </button>
  );
}

// --- VISTE DINAMICHE ---

function DashboardView({ state, login, setActiveTab }: { state: IAppState, login: () => void, setActiveTab: (tab: string) => void }) {
  if (state.ruolo === 'admin') return <AdminDashboardView state={state} setActiveTab={setActiveTab} />;
  if (state.ruolo === 'capitano') return <CapitanoDashboardView state={state} setActiveTab={setActiveTab} />;
  return <PublicDashboardView state={state} login={login} />;
}

function PublicDashboardView({ state, login }: { state: IAppState, login: () => void }) {
  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-[clamp(44px,12vw,120px)] leading-[0.85] font-black tracking-tighter text-white uppercase italic">
            Torneo<br/><span className="text-[color:var(--color-tournament-primary)]">Memorial</span>
          </h1>
          <p className="mt-4 sm:mt-8 text-zinc-400 text-sm sm:text-lg max-w-sm leading-relaxed font-medium">
            Gestione completa per il torneo. Segui i calendari, le classifiche e i risultati aggiornati in tempo reale.
          </p>
          
          {!state.utente && (
            <div className="mt-8 p-6 card-bold w-full max-w-sm">
              <h2 className="label-bold text-white mb-2 border-b border-zinc-800 pb-2">ACCESSO RISERVATO</h2>
              <p className="text-xs text-[color:var(--color-tournament-primary)] mb-6 font-mono font-bold">» Admin & Capitani</p>
              <button onClick={login} className="btn-primary-bold flex items-center justify-center gap-3 py-4">
                <LogIn size={18} />
                <span className="mt-0.5">Accedi con Google</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[350px] card-bold flex flex-col">
          <h2 className="label-bold mb-6">Status Competizione</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-bold text-[9px]">Competizione</label>
              <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 font-mono text-sm text-[color:var(--color-tournament-primary)] truncate">
                {state.config.nome.toUpperCase().replace(/\s+/g, '_')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="label-bold text-[9px]">Gironi</label>
                <div className="bg-black/50 p-4 rounded-xl text-center border border-zinc-800 font-mono text-sm">
                  {state.config.num_gironi}
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-bold text-[9px]">Fase</label>
                <div className="bg-[color:var(--color-tournament-primary)]/10 p-4 rounded-xl flex items-center justify-center border border-[color:var(--color-tournament-primary)]/30 status-pulse">
                  <span className="status-dot"></span>
                  <span className="text-[10px] font-bold">{state.config.fase_attuale.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardView({ state, setActiveTab }: { state: IAppState, setActiveTab: (t:string)=>void }) { 
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-[color:var(--color-tournament-border)] pb-6">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-white">Dashboard <span className="text-[color:var(--color-tournament-primary)]">Admin</span></h1>
        <p className="text-xs font-mono text-zinc-500">SYSTEM_ADMIN_ACTIVE • OVERRIDE_ENABLED</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard label="Iscritti" value={state.squadre.length.toString()} unit="SQUADRE" />
        <StatCard label="Match" value={state.partite.length.toString()} unit="PARTITE" />
        <StatCard label="Stato" value={state.config.fase_attuale.toUpperCase()} unit="FASE" />
        <StatCard label="Campione" value="--" unit="PREVISTO" />
      </div>

      <h2 className="label-bold mt-8 mb-4 border-b border-zinc-800 pb-2">AZIONI RAPIDE</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => setActiveTab('admin')} className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-all hover:bg-zinc-900 group">
          <Settings className="mb-4 text-[color:var(--color-tournament-primary)] transition-transform group-hover:rotate-90" size={32} />
          <h3 className="text-xl font-black uppercase text-white tracking-widest">Pannello Admin</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-2">CONFIG_AND_SETUP</p>
        </button>
      </div>
    </div>
  ); 
}

function CapitanoDashboardView({ state, setActiveTab }: { state: IAppState, setActiveTab: (t:string) => void }) {
  const miaSquadra = state.capitani.find(c => c.email === state.utente?.email);
  const dataSquadra = state.squadre.find(s => s.id === miaSquadra?.squadra_id);
  const nomeSquadra = dataSquadra?.nome || "LA TUA SQUADRA";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-[color:var(--color-tournament-border)] pb-6 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-[color:var(--color-tournament-primary)]">{nomeSquadra}</h1>
        <p className="text-xs font-mono text-zinc-500">CAPTAIN_ACCESS_GRANTED • ROSTER_EDIT_ENABLED</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard label="Punti" value="0" unit="CLASSIFICA" />
        <StatCard label="Vinte" value="0" unit="MATCH" />
        <StatCard label="Perse" value="0" unit="MATCH" />
      </div>

      <button onClick={() => setActiveTab('mia_squadra')} className="w-full card-bold text-center py-20 flex flex-col items-center justify-center group overflow-hidden relative border-zinc-800 hover:border-[color:var(--color-tournament-primary)] transition-colors cursor-pointer">
         <div className="relative z-10 flex flex-col items-center">
            <UserIcon className="text-zinc-600 group-hover:text-[color:var(--color-tournament-primary)] mb-4 transition-colors" size={48} />
            <h2 className="text-2xl font-black uppercase tracking-widest text-white group-hover:text-[color:var(--color-tournament-primary)] transition-colors">Schiera Formazione</h2>
            <p className="text-xs text-zinc-500 font-mono mt-2">Seleziona il modulo e inserisci i giocatori</p>
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-tournament-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </button>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <div className="card-bold h-full">
      <h3 className="label-bold">{label}</h3>
      <div className="flex items-baseline gap-1 sm:gap-2">
        <span className="text-3xl sm:text-4xl font-black">{value}</span>
        <span className="text-[10px] sm:text-xs font-bold text-zinc-500">{unit}</span>
      </div>
    </div>
  );
}

function SquadreView({ state }: { state: IAppState }) { 
  if (state.squadre.length === 0) return <div className="card-bold text-center text-zinc-500">Nessuna squadra iscritta.</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black uppercase text-white mb-6">Squadre Iscritte</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {state.squadre.map(s => (
          <div key={s.id} className="card-bold flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-700" style={{ backgroundColor: s.colore_maglia }}></div>
            <div>
              <h3 className="font-bold text-white text-lg">{s.nome}</h3>
              <p className="text-xs text-zinc-500 font-mono">Girone {s.girone}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ); 
}

function CalendarioView({ state, updateState }: { state: IAppState, updateState: (s: Partial<IAppState>) => void }) { 
  if (state.partite.length === 0) return <div className="card-bold text-center text-zinc-500">Il calendario non è ancora stato generato.</div>;
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase text-white mb-6 border-b border-[color:var(--color-tournament-border)] pb-2">Calendario Partite</h2>
      
      {state.partite.map((p, idx) => {
        const casa = state.squadre.find(s => s.id === p.casa_id);
        const trasferta = state.squadre.find(s => s.id === p.trasferta_id);
        
        return (
          <div key={p.id} className="card-bold py-4">
            <div className="flex justify-between items-center mb-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
              <span>{new Date(p.data).toLocaleDateString()} {p.orario}</span>
              <span className="text-[color:var(--color-tournament-primary)]">{p.fase} - Girone {p.girone}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-right font-bold text-white text-lg truncate">{casa?.nome || p.casa_id}</div>
              
              <div className="flex items-center justify-center gap-2 bg-black/50 px-4 py-2 rounded-xl border border-zinc-800">
                <span className="text-xl font-black">{p.completata ? p.gol_casa : '-'}</span>
                <span className="text-zinc-600">:</span>
                <span className="text-xl font-black">{p.completata ? p.gol_trasferta : '-'}</span>
              </div>
              
              <div className="flex-1 text-left font-bold text-white text-lg truncate">{trasferta?.nome || p.trasferta_id}</div>
            </div>
            {state.ruolo === 'admin' && !p.completata && (
              <div className="mt-4 border-t border-zinc-800 pt-4 text-center">
                 <button onClick={() => {
                   const ris = prompt("Inserisci risultato (es. 2-1)");
                   if (ris && ris.includes('-')) {
                     const [gC, gT] = ris.split('-');
                     const updatedPartite = [...state.partite];
                     updatedPartite[idx] = { ...p, gol_casa: parseInt(gC), gol_trasferta: parseInt(gT), completata: true };
                     updateState({ partite: updatedPartite });
                   }
                 }} className="mx-auto block text-xs bg-[color:var(--color-tournament-primary)]/10 text-[color:var(--color-tournament-primary)] hover:bg-[color:var(--color-tournament-primary)] hover:text-black font-bold py-1 px-3 rounded-full transition-colors">
                   INSERISCI RISULTATO
                 </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  ); 
}

function ClassificaView({ state }: { state: IAppState }) { 
  if (state.squadre.length === 0) return <div className="card-bold text-center text-zinc-500">Ancora nessuna classifica.</div>;
  
  // Calcolo classifiche in base alle partite completate
  const classifiche = [1, 2].map(girone => {
    const squadreGirone = state.squadre.filter(s => s.girone === girone);
    const stats = squadreGirone.map(s => {
      let punti = 0, gf = 0, gs = 0, pg = 0;
      state.partite.filter(p => p.completata && p.girone === girone && (p.casa_id === s.id || p.trasferta_id === s.id)).forEach(p => {
        pg++;
        if (p.casa_id === s.id) {
          gf += p.gol_casa!; gs += p.gol_trasferta!;
          if (p.gol_casa! > p.gol_trasferta!) punti += 3;
          else if (p.gol_casa === p.gol_trasferta) punti += 1;
        } else {
          gf += p.gol_trasferta!; gs += p.gol_casa!;
          if (p.gol_trasferta! > p.gol_casa!) punti += 3;
          else if (p.gol_casa === p.gol_trasferta) punti += 1;
        }
      });
      return { ...s, punti, gf, gs, pg, dr: gf - gs };
    }).sort((a, b) => b.punti - a.punti || b.dr - a.dr || b.gf - a.gf);
    return { girone, stats };
  });

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black uppercase text-white border-b border-[color:var(--color-tournament-border)] pb-2">Classifiche Live</h2>
      {classifiche.map(cl => (
        <div key={cl.girone} className="card-bold overflow-hidden p-0">
          <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800">
             <h3 className="font-bold text-[color:var(--color-tournament-primary)] text-sm uppercase tracking-widest">Girone {cl.girone}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-zinc-500 uppercase tracking-widest bg-black/50 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Squadra</th>
                  <th className="px-2 py-3 text-center">PT</th>
                  <th className="px-2 py-3 text-center">G</th>
                  <th className="px-2 py-3 text-center">DR</th>
                </tr>
              </thead>
              <tbody>
                {cl.stats.map((s, idx) => (
                  <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-3 font-bold flex items-center gap-2">
                       <span className="text-zinc-500 w-4">{idx + 1}.</span>
                       <span className="text-white truncate">{s.nome}</span>
                    </td>
                    <td className="px-2 py-3 text-center font-black text-[color:var(--color-tournament-primary)]">{s.punti}</td>
                    <td className="px-2 py-3 text-center text-zinc-400">{s.pg}</td>
                    <td className="px-2 py-3 text-center text-zinc-400">{s.dr > 0 ? `+${s.dr}` : s.dr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  ); 
}

function AdminView({ state, updateState }: { state: IAppState, updateState: (s: Partial<IAppState>) => void }) { 
  const [nuovaSquadra, setNuovaSquadra] = useState({ nome: '', girone: 1, colore: '#ffffff' });

  const aggiungiSquadra = () => {
    if (!nuovaSquadra.nome) return;
    const s: Squadra = {
      id: `sq_${Date.now()}`,
      nome: nuovaSquadra.nome,
      girone: nuovaSquadra.girone,
      colore_maglia: nuovaSquadra.colore,
      colore_secondario: '#000',
      creato_at: new Date().toISOString()
    };
    updateState({ squadre: [...state.squadre, s] });
    setNuovaSquadra({ nome: '', girone: 1, colore: '#ffffff' });
  };

  const generaCalendarioMock = () => {
    if (state.squadre.length < 2) return alert("Aggiungi almeno 2 squadre");
    const arr: Partita[] = [];
    const sqG1 = state.squadre.filter(s => s.girone === 1);
    const sqG2 = state.squadre.filter(s => s.girone === 2);
    
    // Semplice generazione finta per far vedere l'UI (tutti contro tutti una volta nel girone)
    const generaPerGirone = (squadre: Squadra[], numG: number) => {
      for(let i=0; i<squadre.length; i++){
        for(let j=i+1; j<squadre.length; j++){
          arr.push({
            id: `p_${Date.now()}_${i}_${j}`,
            casa_id: squadre[i].id,
            trasferta_id: squadre[j].id,
            data: new Date().toISOString(),
            orario: "20:00",
            girone: numG,
            fase: 'girone',
            completata: false
          });
        }
      }
    };
    generaPerGirone(sqG1, 1);
    generaPerGirone(sqG2, 2);
    
    updateState({ partite: arr });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black uppercase text-white border-b border-[color:var(--color-tournament-border)] pb-2">Admin Setup</h1>
      
      <div className="card-bold space-y-4">
        <h2 className="label-bold">Aggiungi Squadra</h2>
        <div className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Nome Squadra" 
            value={nuovaSquadra.nome}
            onChange={e => setNuovaSquadra({...nuovaSquadra, nome: e.target.value})}
            className="w-full bg-black/50 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-[color:var(--color-tournament-primary)]"
          />
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Girone</label>
              <select 
                value={nuovaSquadra.girone} 
                onChange={e => setNuovaSquadra({...nuovaSquadra, girone: parseInt(e.target.value)})}
                className="w-full bg-black/50 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none"
              >
                <option value={1}>Girone 1</option>
                <option value={2}>Girone 2</option>
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Colore Maglia</label>
              <input 
                type="color" 
                value={nuovaSquadra.colore}
                onChange={e => setNuovaSquadra({...nuovaSquadra, colore: e.target.value})}
                className="w-full h-[50px] rounded-xl cursor-pointer border-0 p-0"
              />
            </div>
          </div>
          <button onClick={aggiungiSquadra} className="bg-[color:var(--color-tournament-primary)] text-black font-bold uppercase tracking-widest py-3 rounded-xl hover:brightness-90 transition">
            Salva Squadra
          </button>
        </div>
      </div>

      <div className="card-bold space-y-4">
        <h2 className="label-bold">Azione Calendario</h2>
        <p className="text-xs text-zinc-400 mb-4">Genera le partite in base alle squadre attualmente iscritte.</p>
        <button onClick={generaCalendarioMock} className="w-full bg-zinc-800 text-white font-bold uppercase tracking-widest py-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition">
          Genera Calendario Base
        </button>
      </div>

      <div className="card-bold space-y-4 border-red-900/30 bg-red-950/10">
        <h2 className="label-bold text-red-500">Danger Zone</h2>
        <button onClick={() => {
          if (confirm("Vuoi davvero eliminare tutti i dati locali?")) {
            localStorage.removeItem('torneo_cache');
            window.location.reload();
          }
        }} className="w-full bg-red-900/20 text-red-500 font-bold uppercase tracking-widest py-3 rounded-xl hover:bg-red-900/40 transition">
          Reset Hard Cache
        </button>
      </div>
    </div>
  ); 
}

function MiaSquadraView({ state, updateState }: { state: IAppState, updateState: (s: Partial<IAppState>) => void }) { 
  const miaSquadraRef = state.capitani.find(c => c.email === state.utente?.email);
  const miaSquadra = state.squadre.find(s => s.id === miaSquadraRef?.squadra_id);

  if (!miaSquadra) return (
    <div className="card-bold text-center space-y-4 py-12">
      <h2 className="text-xl font-bold text-white">Nessuna squadra associata</h2>
      <p className="text-sm text-zinc-500">L'admin non ti ha ancora collegato a nessuna squadra.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="card-bold text-center border-[color:var(--color-tournament-primary)]/50">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">{miaSquadra.nome}</h1>
        <p className="text-[10px] text-[color:var(--color-tournament-primary)] font-mono mt-2">DASHBOARD CAPITANO</p>
      </div>

      <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-green-800 to-green-950 rounded-3xl border-4 border-white/10 overflow-hidden mt-6">
        {/* Campo simulato */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/20"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full"></div>
        
        <div className="absolute inset-0 flex flex-col justify-evenly">
          <div className="flex justify-center">
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">ST</div>
          </div>
          <div className="flex justify-around px-8">
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">LW</div>
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">RW</div>
          </div>
          <div className="flex justify-around px-4">
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">CM</div>
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">CM</div>
          </div>
          <div className="flex justify-around px-2">
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">LB</div>
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">CB</div>
             <div className="w-12 h-12 bg-zinc-200 rounded-full border-4 border-green-900 flex items-center justify-center font-black">RB</div>
          </div>
        </div>
      </div>
    </div>
  ); 
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { AppState, Role, AppState as IAppState, Capitano, Squadra, Partita } from './types';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  Settings,
  LogIn,
  LogOut,
  Menu,
  User as UserIcon,
  AlertCircle,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Trophy as TrophyIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from './components/ThemeToggle';
import { useToast } from './components/Toast';
import { useTheme } from './hooks/useTheme';

// --- CONFIGURAZIONE ---
const ADMIN_EMAILS = ['cristian.laporta04@gmail.com', 'Cinziavenuti1985@libero.it']; 

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const { toasts, dismissToast, success, error, info, ToastContainer } = useToast();

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

      const pseudoUserStr = localStorage.getItem('torneo_pseudo_user');
      let pUser = null;
      if (pseudoUserStr) pUser = JSON.parse(pseudoUserStr);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          await handleAuthChange({ email: user.email, user_metadata: { avatar_url: user.photoURL } }, cachedState?.capitani || []);
        } else if (pUser) {
          await handleAuthChange(pUser, cachedState?.capitani || []);
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
      if (ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase())) {
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
        
        const isCapitano = currentCapitani.find(c => c.email.toLowerCase() === user.email.toLowerCase());
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

  const logout = async () => {
    try { await signOut(auth); } catch (e) {}
    localStorage.removeItem('torneo_pseudo_user');
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
      <div className="flex min-h-screen flex-col bg-[color:var(--color-tournament-bg)]">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-50 flex h-16 sm:h-20 items-center justify-between border-b border-[color:var(--color-tournament-border)] bg-[color:var(--color-tournament-nav-bg)] backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="skeleton h-8 w-8 sm:h-10 sm:w-10 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-5 w-32 sm:w-48" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
          <div className="skeleton h-10 w-10 rounded-full" />
        </header>
        {/* Main Content Skeleton */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
          <div className="skeleton h-64 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-32 w-full rounded-3xl" />
            <div className="skeleton h-32 w-full rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-tournament-bg)] pb-24">
      {/* Header Fisso */}
      <header className="sticky top-0 z-50 flex h-16 sm:h-20 items-center justify-between border-b border-[color:var(--color-tournament-border)] bg-[color:var(--color-tournament-nav-bg)] backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[color:var(--color-tournament-primary)] text-black shadow-lg shadow-[color:var(--color-tournament-primary)]/20">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" weight="fill" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black leading-none tracking-tighter uppercase text-[color:var(--color-tournament-text)]">
              {state.config.nome}
            </h1>
            <div className="status-pulse mt-1">
              <span className="status-dot"></span>
              <span className="text-[color:var(--color-tournament-text-muted)]">{activeTab.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          {state.utente ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={state.utente.user_metadata?.avatar_url || ''}
                alt="Avatar"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-[color:var(--color-tournament-primary)]"
              />
              <button
                onClick={logout}
                className="rounded-full p-2 text-[color:var(--color-tournament-text-muted)] hover:text-[color:var(--color-tournament-primary)] hover:bg-[color:var(--color-tournament-card)] transition-all"
                title="Logout"
              >
                <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="px-3 sm:px-4 py-2 bg-[color:var(--color-tournament-primary)] text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--color-tournament-primary-hover)] transition-all active:scale-95"
            >
              ACCEDI
            </button>
          )}
        </div>
      </header>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
            {activeTab === 'admin' && <AdminView state={state} updateState={updateState} setActiveTab={setActiveTab} />}
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
              className="absolute top-4 right-4 text-[color:var(--color-tournament-text-muted)] hover:text-[color:var(--color-tournament-text)]"
            >
              ✕
            </button>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[color:var(--color-tournament-text)] mb-6">Accesso</h2>
            
            <div className="space-y-6">
              
              <div>
                <h3 className="label-bold mb-3">Login Capitani</h3>
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    id="capitanoNome"
                    placeholder="Nome e Cognome Capitano" 
                    className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-3 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)] placeholder-[color:var(--color-tournament-text-muted)] text-sm"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('capitanoNome') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const nomeCognome = input.value.trim();
                        const found = state.capitani.find(c => c.email.toLowerCase() === nomeCognome.toLowerCase());
                        if (found) {
                          const pUser = { email: found.email, user_metadata: { avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(found.email)}&background=random` } };
                          localStorage.setItem('torneo_pseudo_user', JSON.stringify(pUser));
                          setShowLoginModal(false);
                          handleAuthChange(pUser);
                        } else {
                          alert(`Capitano "${nomeCognome}" non trovato. Contatta l'amministratore per farti registrare.`);
                        }
                      }
                    }}
                    className="w-full bg-[color:var(--color-tournament-primary)] text-black font-black py-3 rounded-xl transition-colors uppercase tracking-widest text-xs hover:brightness-110"
                  >
                    Entra come Capitano
                  </button>
                </div>
              </div>

              <div className="border-t border-[color:var(--color-tournament-border)] pt-6">
                <h3 className="label-bold mb-3">Login Staff / Admin</h3>
                <button 
                   onClick={async () => {
                    setShowLoginModal(false);
                    try {
                      await signInWithPopup(auth, new GoogleAuthProvider());
                    } catch (error: any) {
                      alert("OAuth error: " + error.message);
                    }
                   }}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mx-2" />
                  Accedi con Google
                </button>
              </div>

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
        active ? 'text-[color:var(--color-tournament-primary)]' : 'text-[color:var(--color-tournament-text-muted)]'
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
          <h1 className="text-[clamp(44px,12vw,120px)] leading-[0.85] font-black tracking-tighter text-[color:var(--color-tournament-text)] uppercase italic">
            Torneo<br/><span className="text-[color:var(--color-tournament-primary)]">Memorial</span>
          </h1>
          <p className="mt-4 sm:mt-8 text-[color:var(--color-tournament-text-muted)] text-sm sm:text-lg max-w-sm leading-relaxed font-medium">
            Gestione completa per il torneo. Segui i calendari, le classifiche e i risultati aggiornati in tempo reale.
          </p>
          
          {!state.utente && (
            <div className="mt-8 p-6 card-bold w-full max-w-sm">
              <h2 className="label-bold text-[color:var(--color-tournament-text)] mb-2 border-b border-[color:var(--color-tournament-border)] pb-2">ACCESSO RISERVATO</h2>
              <p className="text-xs text-[color:var(--color-tournament-primary)] mb-6 font-mono font-bold">» Admin & Capitani</p>
              <button onClick={login} className="btn-primary-bold flex items-center justify-center gap-3 py-4">
                <LogIn size={18} />
                <span className="mt-0.5">Accedi al Torneo</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[350px] card-bold flex flex-col">
          <h2 className="label-bold mb-6">Status Competizione</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-bold text-[9px]">Competizione</label>
              <div className="bg-[color:var(--color-tournament-card)] p-4 rounded-xl border border-[color:var(--color-tournament-border)] font-mono text-sm text-[color:var(--color-tournament-primary)] truncate">
                {state.config.nome.toUpperCase().replace(/\s+/g, '_')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="label-bold text-[9px]">Gironi</label>
                <div className="bg-[color:var(--color-tournament-card)] p-4 rounded-xl text-center border border-[color:var(--color-tournament-border)] font-mono text-sm">
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
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-[color:var(--color-tournament-text)]">Dashboard <span className="text-[color:var(--color-tournament-primary)]">Admin</span></h1>
        <p className="text-xs font-mono text-[color:var(--color-tournament-text-muted)]">SYSTEM_ADMIN_ACTIVE • OVERRIDE_ENABLED</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard label="Iscritti" value={state.squadre.length.toString()} unit="SQUADRE" />
        <StatCard label="Match" value={state.partite.length.toString()} unit="PARTITE" />
        <StatCard label="Stato" value={state.config.fase_attuale.toUpperCase()} unit="FASE" />
        <StatCard label="Campione" value="--" unit="PREVISTO" />
      </div>

      <h2 className="label-bold mt-8 mb-4 border-b border-[color:var(--color-tournament-border)] pb-2">AZIONI RAPIDE</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => setActiveTab('admin')} className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-all hover:bg-[color:var(--color-tournament-card)] group">
          <Settings className="mb-4 text-[color:var(--color-tournament-primary)] transition-transform group-hover:rotate-90" size={32} />
          <h3 className="text-xl font-black uppercase text-[color:var(--color-tournament-text)] tracking-widest">Pannello Admin</h3>
          <p className="text-[10px] text-[color:var(--color-tournament-text-muted)] font-mono mt-2">CONFIG_AND_SETUP</p>
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
        <p className="text-xs font-mono text-[color:var(--color-tournament-text-muted)]">CAPTAIN_ACCESS_GRANTED • ROSTER_EDIT_ENABLED</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard label="Punti" value="0" unit="CLASSIFICA" />
        <StatCard label="Vinte" value="0" unit="MATCH" />
        <StatCard label="Perse" value="0" unit="MATCH" />
      </div>

      <button onClick={() => setActiveTab('mia_squadra')} className="w-full card-bold text-center py-20 flex flex-col items-center justify-center group overflow-hidden relative border-[color:var(--color-tournament-border)] hover:border-[color:var(--color-tournament-primary)] transition-colors cursor-pointer">
         <div className="relative z-10 flex flex-col items-center">
            <UserIcon className="text-[color:var(--color-tournament-text-muted)] group-hover:text-[color:var(--color-tournament-primary)] mb-4 transition-colors" size={48} />
            <h2 className="text-2xl font-black uppercase tracking-widest text-[color:var(--color-tournament-text)] group-hover:text-[color:var(--color-tournament-primary)] transition-colors">Schiera Formazione</h2>
            <p className="text-xs text-[color:var(--color-tournament-text-muted)] font-mono mt-2">Seleziona il modulo e inserisci i giocatori</p>
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
        <span className="text-[10px] sm:text-xs font-bold text-[color:var(--color-tournament-text-muted)]">{unit}</span>
      </div>
    </div>
  );
}

function SquadreView({ state }: { state: IAppState }) { 
  if (state.squadre.length === 0) return <div className="card-bold text-center text-[color:var(--color-tournament-text-muted)]">Nessuna squadra iscritta.</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black uppercase text-[color:var(--color-tournament-text)] mb-6">Squadre Iscritte</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {state.squadre.map(s => (
          <div key={s.id} className="card-bold flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full border-2 border-[color:var(--color-tournament-border)]" style={{ backgroundColor: s.colore_maglia }}></div>
            <div>
              <h3 className="font-bold text-[color:var(--color-tournament-text)] text-lg">{s.nome}</h3>
              <p className="text-xs text-[color:var(--color-tournament-text-muted)] font-mono">Girone {s.girone}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ); 
}

function CalendarioView({ state, updateState }: { state: IAppState, updateState: (s: Partial<IAppState>) => void }) { 
  const [risultatoEditing, setRisultatoEditing] = useState<{p: Partita, idx: number} | null>(null);
  const [gCasa, setGCasa] = useState('');
  const [gTrasferta, setGTrasferta] = useState('');

  if (state.partite.length === 0) return <div className="card-bold text-center text-[color:var(--color-tournament-text-muted)]">Il calendario non è ancora stato generato.</div>;
  
  const sortedPartite = [...state.partite].sort((a, b) => {
    const dateA = new Date(`${a.data}T${a.orario}`);
    const dateB = new Date(`${b.data}T${b.orario}`);
    return dateA.getTime() - dateB.getTime();
  });

  let currentFase = '';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase text-[color:var(--color-tournament-text)] mb-6 border-b border-[color:var(--color-tournament-border)] pb-2">Calendario Partite</h2>
      
      {sortedPartite.map((p) => {
        const casa = state.squadre.find(s => s.id === p.casa_id);
        const trasferta = state.squadre.find(s => s.id === p.trasferta_id);
        const idx = state.partite.findIndex(sp => sp.id === p.id);
        
        const isNewFase = p.fase !== currentFase;
        if (isNewFase) currentFase = p.fase;
        
        return (
          <React.Fragment key={p.id}>
            {isNewFase && (
               <div className="mt-8 mb-4">
                 <h3 className="text-xl font-black text-[color:var(--color-tournament-primary)] uppercase tracking-widest bg-[color:var(--color-tournament-primary)]/10 px-4 py-2 rounded-lg border border-[color:var(--color-tournament-primary)]/30 inline-block">
                   {p.fase}
                 </h3>
               </div>
            )}
            <div className="card-bold py-4">
            <div className="flex justify-between items-center mb-3 text-[10px] uppercase font-bold text-[color:var(--color-tournament-text-muted)] tracking-widest">
              {state.ruolo === 'admin' ? (
                 <div className="flex gap-2">
                   <input type="date" style={{colorScheme: 'dark'}} value={p.data} onChange={e => {
                      const updatedPartite = [...state.partite];
                      updatedPartite[idx] = { ...p, data: e.target.value };
                      updateState({ partite: updatedPartite });
                   }} className="bg-transparent border-b border-transparent focus:border-[color:var(--color-tournament-primary)] focus:outline-none" />
                   <input type="time" style={{colorScheme: 'dark'}} value={p.orario} onChange={e => {
                      const updatedPartite = [...state.partite];
                      updatedPartite[idx] = { ...p, orario: e.target.value };
                      updateState({ partite: updatedPartite });
                   }} className="bg-transparent border-b border-transparent focus:border-[color:var(--color-tournament-primary)] focus:outline-none" />
                 </div>
              ) : (
                <span>{new Date(p.data).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })} {p.orario}</span>
              )}
              <span className="text-[color:var(--color-tournament-primary)]">
                {p.fase} {p.girone ? `- Girone ${p.girone}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              {state.ruolo === 'admin' ? (
                 <select value={p.casa_id} onChange={e => {
                    const updatedPartite = [...state.partite];
                    updatedPartite[idx] = { ...p, casa_id: e.target.value };
                    updateState({ partite: updatedPartite });
                 }} className="bg-transparent text-right font-bold text-[color:var(--color-tournament-text)] text-lg truncate w-24 sm:w-32 focus:outline-none border-b border-transparent hover:border-zinc-700">
                   {state.squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                 </select>
              ) : (
                <div className="flex-1 text-right font-bold text-[color:var(--color-tournament-text)] text-lg truncate">{casa?.nome || p.casa_id}</div>
              )}
              
              <div className="flex items-center justify-center gap-2 bg-[color:var(--color-tournament-card)] px-4 py-2 rounded-xl border border-[color:var(--color-tournament-border)] shrink-0">
                <span className="text-xl font-black">{p.completata ? p.gol_casa : '-'}</span>
                <span className="text-[color:var(--color-tournament-text-muted)]">:</span>
                <span className="text-xl font-black">{p.completata ? p.gol_trasferta : '-'}</span>
              </div>
              
              {state.ruolo === 'admin' ? (
                 <select value={p.trasferta_id} onChange={e => {
                    const updatedPartite = [...state.partite];
                    updatedPartite[idx] = { ...p, trasferta_id: e.target.value };
                    updateState({ partite: updatedPartite });
                 }} className="bg-transparent text-left font-bold text-[color:var(--color-tournament-text)] text-lg truncate w-24 sm:w-32 focus:outline-none border-b border-transparent hover:border-zinc-700">
                   {state.squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                 </select>
              ) : (
                <div className="flex-1 text-left font-bold text-[color:var(--color-tournament-text)] text-lg truncate">{trasferta?.nome || p.trasferta_id}</div>
              )}
            </div>
            {state.ruolo === 'admin' && (
              <div className="mt-4 border-t border-[color:var(--color-tournament-border)] pt-4 text-center flex justify-center gap-2">
                 <button onClick={() => {
                   setRisultatoEditing({ p, idx });
                   setGCasa(p.gol_casa !== undefined ? p.gol_casa.toString() : '');
                   setGTrasferta(p.gol_trasferta !== undefined ? p.gol_trasferta.toString() : '');
                 }} className="block text-xs bg-[color:var(--color-tournament-primary)]/10 text-[color:var(--color-tournament-primary)] hover:bg-[color:var(--color-tournament-primary)] hover:text-black font-bold py-1 px-3 rounded-full transition-colors">
                   {p.completata ? 'MODIFICA RISULTATO' : 'INSERISCI RISULTATO'}
                 </button>
                 {p.completata && (
                   <button onClick={() => {
                     if (confirm("Vuoi annullare questo risultato?")) {
                       const updatedPartite = [...state.partite];
                       updatedPartite[idx] = { ...p, gol_casa: undefined, gol_trasferta: undefined, completata: false };
                       updateState({ partite: updatedPartite });
                     }
                   }} className="block text-xs bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-[color:var(--color-tournament-text)] font-bold py-1 px-3 rounded-full transition-colors">
                     ANNULLA
                   </button>
                 )}
              </div>
            )}
          </div>
          </React.Fragment>
        );
      })}
      {risultatoEditing && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111] border border-[color:var(--color-tournament-border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-center text-[color:var(--color-tournament-text)] mb-6 uppercase tracking-widest">
              Inserisci Risultato
            </h3>
            
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex-1 text-center">
                <div className="text-sm font-bold text-[color:var(--color-tournament-text-muted)] truncate mb-2">
                  {state.squadre.find(s => s.id === risultatoEditing.p.casa_id)?.nome}
                </div>
                <input 
                  type="number" 
                  min="0"
                  value={gCasa} 
                  onChange={e => setGCasa(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-center text-3xl font-black text-[color:var(--color-tournament-text)] focus:border-[color:var(--color-tournament-primary)] focus:outline-none transition-all"
                />
              </div>
              
              <div className="text-2xl font-black text-[color:var(--color-tournament-text-muted)]">:</div>
              
              <div className="flex-1 text-center">
                <div className="text-sm font-bold text-[color:var(--color-tournament-text-muted)] truncate mb-2">
                  {state.squadre.find(s => s.id === risultatoEditing.p.trasferta_id)?.nome}
                </div>
                <input 
                  type="number" 
                  min="0"
                  value={gTrasferta} 
                  onChange={e => setGTrasferta(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-center text-3xl font-black text-[color:var(--color-tournament-text)] focus:border-[color:var(--color-tournament-primary)] focus:outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setRisultatoEditing(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-[color:var(--color-tournament-text)] bg-white/5 hover:bg-white/10 transition-all uppercase tracking-wider text-xs"
              >
                Annulla
              </button>
              <button 
                onClick={() => {
                  if (gCasa && gTrasferta) {
                    const updatedPartite = [...state.partite];
                    updatedPartite[risultatoEditing.idx] = { 
                      ...risultatoEditing.p, 
                      gol_casa: parseInt(gCasa), 
                      gol_trasferta: parseInt(gTrasferta), 
                      completata: true 
                    };
                    updateState({ partite: updatedPartite });
                    setRisultatoEditing(null);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-black bg-[color:var(--color-tournament-primary)] hover:scale-105 transition-all uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(var(--color-tournament-primary-rgb),0.3)]"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassificaView({ state }: { state: IAppState }) { 
  if (state.squadre.length === 0) return <div className="card-bold text-center text-[color:var(--color-tournament-text-muted)]">Ancora nessuna classifica.</div>;
  
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
      <h2 className="text-2xl font-black uppercase text-[color:var(--color-tournament-text)] border-b border-[color:var(--color-tournament-border)] pb-2">Classifiche Live</h2>
      {classifiche.map(cl => (
        <div key={cl.girone} className="card-bold overflow-hidden p-0">
          <div className="bg-[color:var(--color-tournament-card)] px-4 py-3 border-b border-[color:var(--color-tournament-border)]">
             <h3 className="font-bold text-[color:var(--color-tournament-primary)] text-sm uppercase tracking-widest">Girone {cl.girone}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-[color:var(--color-tournament-text-muted)] uppercase tracking-widest bg-[color:var(--color-tournament-card)] border-b border-[color:var(--color-tournament-border)]">
                <tr>
                  <th className="px-4 py-3">Squadra</th>
                  <th className="px-2 py-3 text-center">PT</th>
                  <th className="px-2 py-3 text-center">G</th>
                  <th className="px-2 py-3 text-center">DR</th>
                </tr>
              </thead>
              <tbody>
                {cl.stats.map((s, idx) => (
                  <tr key={s.id} className="border-b border-[color:var(--color-tournament-border)]/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-3 font-bold flex items-center gap-2">
                       <span className="text-[color:var(--color-tournament-text-muted)] w-4">{idx + 1}.</span>
                       <span className="text-[color:var(--color-tournament-text)] truncate">{s.nome}</span>
                    </td>
                    <td className="px-2 py-3 text-center font-black text-[color:var(--color-tournament-primary)]">{s.punti}</td>
                    <td className="px-2 py-3 text-center text-[color:var(--color-tournament-text-muted)]">{s.pg}</td>
                    <td className="px-2 py-3 text-center text-[color:var(--color-tournament-text-muted)]">{s.dr > 0 ? `+${s.dr}` : s.dr}</td>
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

function AdminView({ state, updateState, setActiveTab }: { state: IAppState, updateState: (s: Partial<IAppState>) => void, setActiveTab: (t:string)=>void }) { 
  const [nuovaSquadra, setNuovaSquadra] = useState({ nome: '', girone: 1, colore: '#ffffff', capitano: '' });

  const aggiungiSquadra = () => {
    if (!nuovaSquadra.nome) return;
    const sId = `sq_${Date.now()}`;
    const s: Squadra = {
      id: sId,
      nome: nuovaSquadra.nome,
      girone: nuovaSquadra.girone,
      colore_maglia: nuovaSquadra.colore,
      colore_secondario: '#000',
      creato_at: new Date().toISOString(),
      giorni_indisponibili: []
    };
    
    let updatedCapitani = state.capitani;
    if (nuovaSquadra.capitano.trim()) {
       updatedCapitani = [...state.capitani, {
         id: `cap_${Date.now()}`,
         email: nuovaSquadra.capitano.trim(), // Usiamo il campo email per conservare Nome e Cognome
         squadra_id: sId,
         autorizzato_da: 'admin',
         creato_at: new Date().toISOString()
       }];
    }

    updateState({ squadre: [...state.squadre, s], capitani: updatedCapitani });
    setNuovaSquadra({ nome: '', girone: 1, colore: '#ffffff', capitano: '' });
  };

  const [nuovaDataTorneo, setNuovaDataTorneo] = useState('');
  const [dataFineRange, setDataFineRange] = useState('');
  const [giorniSettimana, setGiorniSettimana] = useState<number[]>([1,2,3,4,5]);
  const [nuovoOrarioTorneo, setNuovoOrarioTorneo] = useState('20:00');

  const aggiungiDataTorneo = () => {
    if (!nuovaDataTorneo) return;
    const dateAt = state.config.giorni_torneo || [];
    
    let dateDaAggiungere: string[] = [];
    if (dataFineRange) {
      let current = new Date(nuovaDataTorneo);
      const end = new Date(dataFineRange);
      while (current <= end) {
        if (giorniSettimana.includes(current.getDay())) {
          dateDaAggiungere.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      dateDaAggiungere = [nuovaDataTorneo];
    }

    const nuoveDate = dateDaAggiungere.filter(d => !dateAt.includes(d));
    if (nuoveDate.length > 0) {
      updateState({ config: { ...state.config, giorni_torneo: [...dateAt, ...nuoveDate].sort() } });
    }
    
    setNuovaDataTorneo('');
    setDataFineRange('');
  };

  const toggleGiorno = (day: number) => {
    setGiorniSettimana(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const aggiungiOrarioTorneo = () => {
    if (!nuovoOrarioTorneo) return;
    const orariAt = state.config.orari_torneo || [];
    if (!orariAt.includes(nuovoOrarioTorneo)) {
      updateState({ config: { ...state.config, orari_torneo: [...orariAt, nuovoOrarioTorneo].sort() } });
    }
    setNuovoOrarioTorneo('20:00');
  };

  const rimuoviDataTorneo = (d: string) => {
    updateState({ config: { ...state.config, giorni_torneo: (state.config.giorni_torneo || []).filter(x => x !== d) } });
  }
  const rimuoviOrarioTorneo = (o: string) => {
    updateState({ config: { ...state.config, orari_torneo: (state.config.orari_torneo || []).filter(x => x !== o) } });
  }

  const generaCalendarioMock = () => {
    if (state.squadre.length < 2) return alert("Aggiungi almeno 2 squadre");
    const giorni = state.config.giorni_torneo || [];
    const orari = state.config.orari_torneo || [];
    if (giorni.length === 0 || orari.length === 0) {
      return alert("Configura almeno 1 data e 1 orario validi per il torneo prima di generare il calendario.");
    }

    const arr: Partita[] = [];
    let matchId = 0;

    const sqAperturaCasa = state.config.partita_apertura_casa;
    const sqAperturaTrasferta = state.config.partita_apertura_trasferta;

    const availableSlots = giorni.flatMap(d => orari.map(o => ({ data: d, orario: o, usato: false })));

    if (sqAperturaCasa && sqAperturaTrasferta && availableSlots.length > 0) {
      const c = state.squadre.find(s => s.id === sqAperturaCasa);
      const t = state.squadre.find(s => s.id === sqAperturaTrasferta);
      if (c && t) {
        arr.push({
          id: `p_${Date.now()}_apertura`,
          casa_id: c.id,
          trasferta_id: t.id,
          data: availableSlots[0].data,
          orario: availableSlots[0].orario,
          girone: c.girone,
          fase: 'fase a gironi',
          completata: false
        });
        availableSlots[0].usato = true;
      }
    }

    const andataMatches: {s1: Squadra, s2: Squadra, girone: number, fase: Partita['fase']}[] = [];
    
    const sqG1 = state.squadre.filter(s => s.girone === 1);
    const sqG2 = state.squadre.filter(s => s.girone === 2);

    const buildMatches = (squadre: Squadra[], numG: number) => {
      const a = [];
      for(let i=0; i<squadre.length; i++){
        for(let j=i+1; j<squadre.length; j++){
          if ((squadre[i].id === sqAperturaCasa && squadre[j].id === sqAperturaTrasferta) ||
              (squadre[i].id === sqAperturaTrasferta && squadre[j].id === sqAperturaCasa)) {
            continue;
          }
          a.push({ s1: squadre[i], s2: squadre[j], girone: numG, fase: 'fase a gironi' });
        }
      }
      return { andata: a };
    };
    
    const g1 = buildMatches(sqG1, 1);
    const g2 = buildMatches(sqG2, 2);

    for(let i=0; i<Math.max(g1.andata.length, g2.andata.length); i++) {
        if(g1.andata[i]) andataMatches.push(g1.andata[i]);
        if(g2.andata[i]) andataMatches.push(g2.andata[i]);
    }

    const matchesToSchedule = [...andataMatches];

    for (const match of matchesToSchedule) {
       const slot = availableSlots.find(s => {
          if (s.usato) return false;
          if (match.s1.giorni_indisponibili?.includes(s.data)) return false;
          if (match.s2.giorni_indisponibili?.includes(s.data)) return false;

          const dDate = new Date(s.data);
          const dPrima = new Date(dDate); dPrima.setDate(dDate.getDate() - 1);
          const dDopo = new Date(dDate); dDopo.setDate(dDate.getDate() + 1);
          const dPrimaStr = dPrima.toISOString().split('T')[0];
          const dDopoStr = dDopo.toISOString().split('T')[0];

          const canPlay = !arr.some(p => 
             (p.casa_id === match.s1.id || p.trasferta_id === match.s1.id || p.casa_id === match.s2.id || p.trasferta_id === match.s2.id) &&
             (p.data === s.data || p.data === dPrimaStr || p.data === dDopoStr)
          );
          return canPlay;
       });

       if (slot) {
          slot.usato = true;
          arr.push({
             id: `p_${Date.now()}_${++matchId}`,
             casa_id: match.s1.id,
             trasferta_id: match.s2.id,
             data: slot.data,
             orario: slot.orario,
             girone: match.girone,
             fase: match.fase,
             completata: false
          });
       } else {
          console.warn(`Impossibile trovare slot per ${match.s1.nome} vs ${match.s2.nome}`);
       }
    }
    updateState({ 
      partite: arr,
      config: { ...state.config, fase_attuale: 'gironi' }
    });
  };

  const generaPlayoffMock = () => {
    // Raccoglie la classifica per prendere le prime due di ogni girone
    const classifiche = [1, 2].map(girone => {
      const squadreGirone = state.squadre.filter(s => s.girone === girone);
      const stats = squadreGirone.map(s => {
        let punti = 0, gf = 0, gs = 0;
        state.partite.filter(p => p.completata && p.girone === girone && (p.casa_id === s.id || p.trasferta_id === s.id)).forEach(p => {
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
        return { ...s, punti, dr: gf - gs };
      }).sort((a, b) => b.punti - a.punti || b.dr - a.dr);
      return stats;
    });

    const primeG1 = classifiche[0].slice(0, 2);
    const primeG2 = classifiche[1].slice(0, 2);

    if (primeG1.length < 2 || primeG2.length < 2) {
      return alert("Servono almeno 2 squadre per girone per generare le semifinali.");
    }

    const nuovePartite: Partita[] = [
      {
        id: `p_semi_1_${Date.now()}`,
        casa_id: primeG1[0].id,
        trasferta_id: primeG2[1].id,
        data: new Date().toISOString(),
        orario: "20:00",
        girone: undefined,
        fase: 'semifinale',
        completata: false
      },
      {
        id: `p_semi_2_${Date.now()}`,
        casa_id: primeG2[0].id,
        trasferta_id: primeG1[1].id,
        data: new Date().toISOString(),
        orario: "21:00",
        girone: undefined,
        fase: 'semifinale',
        completata: false
      }
    ];

    updateState({ 
      partite: [...state.partite, ...nuovePartite],
      config: { ...state.config, fase_attuale: 'playoff' }
    });
  };

  const generaFinaleMock = () => {
    const semifinali = state.partite.filter(p => p.fase === 'semifinale');
    if (semifinali.length !== 2) return alert("Devono esserci esattamente 2 semifinali.");
    if (!semifinali.every(p => p.completata)) return alert("Completa prima i risultati di tutte le semifinali.");
    
    const vincitrice1 = semifinali[0].gol_casa! > semifinali[0].gol_trasferta! ? semifinali[0].casa_id : semifinali[0].trasferta_id;
    const vincitrice2 = semifinali[1].gol_casa! > semifinali[1].gol_trasferta! ? semifinali[1].casa_id : semifinali[1].trasferta_id;

    const nuovaFinale: Partita = {
      id: `p_finale_${Date.now()}`,
      casa_id: vincitrice1,
      trasferta_id: vincitrice2,
      data: new Date().toISOString(),
      orario: "21:00",
      girone: undefined,
      fase: 'finale',
      completata: false
    };

    updateState({ 
      partite: [...state.partite, nuovaFinale],
      config: { ...state.config, fase_attuale: 'concluso' }
    });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black uppercase text-[color:var(--color-tournament-text)] border-b border-[color:var(--color-tournament-border)] pb-2">Admin Setup</h1>
      
      <div className="card-bold space-y-4">
        <h2 className="label-bold">Aggiungi Squadra e Capitano</h2>
        <div className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Nome Squadra" 
            value={nuovaSquadra.nome}
            onChange={e => setNuovaSquadra({...nuovaSquadra, nome: e.target.value})}
            className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-3 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)] placeholder-[color:var(--color-tournament-text-muted)]"
          />
          <input 
            type="text" 
            placeholder="Nome e Cognome Capitano (opzionale)" 
            value={nuovaSquadra.capitano}
            onChange={e => setNuovaSquadra({...nuovaSquadra, capitano: e.target.value})}
            className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-3 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)] placeholder-[color:var(--color-tournament-text-muted)] text-sm"
          />
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-[color:var(--color-tournament-text-muted)] uppercase font-bold">Girone</label>
              <select 
                value={nuovaSquadra.girone} 
                onChange={e => setNuovaSquadra({...nuovaSquadra, girone: parseInt(e.target.value)})}
                className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-3 text-[color:var(--color-tournament-text)] focus:outline-none"
              >
                <option value={1}>Girone 1</option>
                <option value={2}>Girone 2</option>
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-[color:var(--color-tournament-text-muted)] uppercase font-bold">Colore Maglia</label>
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
        <h2 className="label-bold">Configurazione Giorni e Orari Torneo</h2>
        <p className="text-xs text-[color:var(--color-tournament-text-muted)]">Specifica in quali giorni e a che ore si possono disputare le partite.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
           <div className="space-y-3">
             <div className="flex gap-2 items-center">
               <input type="date" style={{ colorScheme: 'dark' }} value={nuovaDataTorneo} onChange={e => setNuovaDataTorneo(e.target.value)} className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-2 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)]" />
               <span className="text-xs text-[color:var(--color-tournament-text-muted)] font-bold">a</span>
               <input type="date" style={{ colorScheme: 'dark' }} value={dataFineRange} onChange={e => setDataFineRange(e.target.value)} className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-2 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)]" />
             </div>
             
             {dataFineRange && (
               <div className="flex justify-between mt-2">
                 {[1,2,3,4,5,6,0].map(day => {
                   const labels = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
                   return (
                     <button 
                       key={day} 
                       onClick={() => toggleGiorno(day)} 
                       className={`w-8 h-8 rounded-full text-xs font-bold transition border border-[color:var(--color-tournament-border)] ${giorniSettimana.includes(day) ? 'bg-[color:var(--color-tournament-primary)] text-black' : 'bg-zinc-800 text-[color:var(--color-tournament-text-muted)] hover:bg-zinc-700'}`}
                     >
                       {labels[day].charAt(0)}
                     </button>
                   );
                 })}
               </div>
             )}

             <button onClick={aggiungiDataTorneo} className="w-full bg-zinc-800 text-[color:var(--color-tournament-text)] font-bold px-4 py-2 mt-2 rounded-xl border border-[color:var(--color-tournament-border)] hover:bg-zinc-700 transition">
               Aggiungi {dataFineRange ? 'Range' : 'Data'}
             </button>

             <div className="flex flex-wrap gap-2 pt-2">
               {state.config.giorni_torneo?.map(d => (
                 <span key={d} className="bg-zinc-800 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-[color:var(--color-tournament-border)]">
                   {new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                   <button onClick={() => rimuoviDataTorneo(d)} className="text-[color:var(--color-tournament-text-muted)] hover:text-red-400">✕</button>
                 </span>
               ))}
             </div>
           </div>

           <div className="space-y-3">
             <div className="flex gap-2">
               <input type="time" style={{ colorScheme: 'dark' }} value={nuovoOrarioTorneo} onChange={e => setNuovoOrarioTorneo(e.target.value)} className="w-full bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-2 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)]" />
               <button onClick={aggiungiOrarioTorneo} className="bg-zinc-800 text-[color:var(--color-tournament-text)] font-bold px-4 rounded-xl border border-[color:var(--color-tournament-border)] hover:bg-zinc-700 transition">+</button>
             </div>
             <div className="flex flex-wrap gap-2 pt-2">
               {state.config.orari_torneo?.map(o => (
                 <span key={o} className="bg-zinc-800 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-[color:var(--color-tournament-border)]">
                   {o}
                   <button onClick={() => rimuoviOrarioTorneo(o)} className="text-[color:var(--color-tournament-text-muted)] hover:text-red-400">✕</button>
                 </span>
               ))}
             </div>
           </div>
        </div>
      </div>

      <div className="card-bold space-y-4">
        <h2 className="label-bold">Gestione Squadre e Indisponibilità</h2>
        {state.squadre.length === 0 ? (
          <p className="text-xs text-[color:var(--color-tournament-text-muted)] italic">Nessuna squadra iscritta.</p>
        ) : (
          <div className="space-y-4">
            {state.squadre.map(s => (
              <div key={s.id} className="p-3 border border-[color:var(--color-tournament-border)] rounded-xl bg-black/30">
                 <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2 flex-wrap">
                     <input type="color" value={s.colore_maglia} onChange={(e) => updateState({ squadre: state.squadre.map(sq => sq.id === s.id ? { ...sq, colore_maglia: e.target.value } : sq) })} className="w-5 h-5 rounded-full border border-white/20 p-0 cursor-pointer bg-transparent" title="Cambia colore" />
                     <input type="text" value={s.nome} onChange={(e) => updateState({ squadre: state.squadre.map(sq => sq.id === s.id ? { ...sq, nome: e.target.value } : sq) })} className="font-bold text-[color:var(--color-tournament-text)] text-sm bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-[color:var(--color-tournament-primary)] focus:outline-none w-32" title="Modifica nome" />
                     <select 
                       value={s.girone}
                       onChange={(e) => {
                         const updatedSquadre = state.squadre.map(sq => sq.id === s.id ? { ...sq, girone: parseInt(e.target.value) } : sq);
                         updateState({ squadre: updatedSquadre });
                       }}
                       className="bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-md px-2 py-1 text-[10px] text-[color:var(--color-tournament-text-muted)] uppercase font-bold focus:outline-none cursor-pointer ml-2"
                     >
                       <option value={1}>Girone 1</option>
                       <option value={2}>Girone 2</option>
                     </select>
                   </div>
                   <button 
                     onClick={() => {
                       if(confirm(`Vuoi davvero eliminare la squadra ${s.nome}?`)) {
                         updateState({ 
                           squadre: state.squadre.filter(sq => sq.id !== s.id),
                           partite: state.partite.filter(p => p.casa_id !== s.id && p.trasferta_id !== s.id)
                         });
                       }
                     }}
                     className="text-red-500/70 hover:text-red-400 text-xs font-bold transition px-2"
                     title="Elimina squadra"
                   >
                     ✕
                   </button>
                 </div>
                 {/* Elenco indisponibilità */}
                 <div className="flex flex-wrap gap-2 mt-2 items-center">
                   {s.giorni_indisponibili?.map(d => (
                     <span key={d} className="bg-[color:var(--color-tournament-primary)]/10 border border-[color:var(--color-tournament-primary)]/20 text-[color:var(--color-tournament-primary)] text-xs px-2 py-1 rounded-md flex items-center gap-1">
                       {new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                       <button onClick={() => {
                         const updatedSquadre = state.squadre.map(sq => sq.id === s.id ? { ...sq, giorni_indisponibili: sq.giorni_indisponibili!.filter(od => od !== d) } : sq);
                         updateState({ squadre: updatedSquadre });
                       }} className="hover:text-[color:var(--color-tournament-text)] transition font-bold">✕</button>
                     </span>
                   ))}
                   <input 
                     type="date" 
                     style={{ colorScheme: 'dark' }} 
                     className="bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-md px-2 py-1 text-xs text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)]" 
                     onChange={(e) => {
                       if (e.target.value) {
                         const d = e.target.value;
                         if (!s.giorni_indisponibili?.includes(d)) {
                           const updatedSquadre = state.squadre.map(sq => sq.id === s.id ? { ...sq, giorni_indisponibili: [...(sq.giorni_indisponibili || []), d].sort() } : sq);
                           updateState({ squadre: updatedSquadre });
                         }
                         e.target.value = '';
                       }
                     }} 
                     title="Aggiungi giorno di indisponibilità"
                   />
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-bold space-y-4">
        <h2 className="label-bold">Gestione Fasi / Calendario</h2>
        
        {state.config.fase_attuale !== 'playoff' && (
          <div className="p-4 border border-[color:var(--color-tournament-border)] rounded-xl bg-[color:var(--color-tournament-card)]">
            <h3 className="text-[color:var(--color-tournament-text)] font-bold mb-2">Fase a Gironi</h3>
            {state.partite.length === 0 ? (
              <>
                <p className="text-xs text-[color:var(--color-tournament-text-muted)] mb-4">Genera le partite del girone tenendo conto delle regole e delle indisponibilità.</p>
                
                <div className="mb-4 p-3 bg-black/40 rounded-lg border border-[color:var(--color-tournament-border)]">
                  <h4 className="text-xs font-bold text-[color:var(--color-tournament-primary)] mb-2 uppercase">Partita di Apertura (Opzionale)</h4>
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    <select 
                      value={state.config.partita_apertura_casa || ""}
                      onChange={e => updateState({ config: { ...state.config, partita_apertura_casa: e.target.value } })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-[color:var(--color-tournament-text)] appearance-none focus:outline-none focus:border-[color:var(--color-tournament-primary)]"
                    >
                      <option value="">Squadra in Casa</option>
                      {state.squadre.map(s => <option key={s.id} value={s.id}>{s.nome} (Gir {s.girone})</option>)}
                    </select>
                    <span className="text-[10px] font-bold text-[color:var(--color-tournament-text-muted)]">VS</span>
                    <select 
                      value={state.config.partita_apertura_trasferta || ""}
                      onChange={e => updateState({ config: { ...state.config, partita_apertura_trasferta: e.target.value } })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-[color:var(--color-tournament-text)] appearance-none focus:outline-none focus:border-[color:var(--color-tournament-primary)]"
                    >
                      <option value="">Squadra in Trasferta</option>
                      {state.squadre.map(s => <option key={s.id} value={s.id}>{s.nome} (Gir {s.girone})</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={generaCalendarioMock} className="w-full bg-zinc-800 text-[color:var(--color-tournament-text)] font-bold uppercase tracking-widest py-3 rounded-xl border border-[color:var(--color-tournament-border)] hover:bg-zinc-700 transition">
                  Genera Calendario Gironi
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[color:var(--color-tournament-text-muted)] mb-4">Il calendario è già stato generato. Modifica manualmente le singole partite dalla pagina del calendario.</p>
                <div className="flex gap-2">
                  <button onClick={() => { setActiveTab('calendario'); window.scrollTo(0,0); }} className="flex-1 text-xs sm:text-sm bg-[color:var(--color-tournament-primary)]/10 text-[color:var(--color-tournament-primary)] font-bold uppercase tracking-widest py-3 rounded-xl border border-[color:var(--color-tournament-primary)] hover:bg-[color:var(--color-tournament-primary)] hover:text-black transition shadow-[0_0_15px_rgba(var(--color-tournament-primary-rgb),0.2)]">
                    Modifica Calendario
                  </button>
                  <button onClick={() => { 
                    if(confirm("Vuoi davvero eliminare tutto il calendario generato? Questa operazione è irreversibile.")) {
                      updateState({ partite: [] });
                    }
                  }} className="text-xs sm:text-sm bg-red-900/20 text-red-500 font-bold uppercase tracking-widest py-3 px-4 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-[color:var(--color-tournament-text)] transition" title="Elimina Calendario">
                    Elimina
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {state.config.fase_attuale === 'setup' || state.config.fase_attuale === 'gironi' ? (
          <div className="p-4 border border-[color:var(--color-tournament-border)] rounded-xl bg-[color:var(--color-tournament-card)] mt-4">
            <h3 className="text-[color:var(--color-tournament-primary)] font-bold mb-2">Avanza Fase: Playoff (Semifinali)</h3>
            <p className="text-xs text-[color:var(--color-tournament-text-muted)] mb-4">Chiude la fase a gironi e genera le semifinali con le prime 2 dei gironi.</p>
            <button onClick={generaPlayoffMock} className="w-full bg-[color:var(--color-tournament-primary)]/20 text-[color:var(--color-tournament-primary)] hover:bg-[color:var(--color-tournament-primary)] hover:text-black font-bold uppercase tracking-widest py-3 rounded-xl transition border border-[color:var(--color-tournament-primary)]/50">
              Genera Semifinali
            </button>
          </div>
        ) : null}

        {state.config.fase_attuale === 'playoff' ? (
          <div className="p-4 border border-[color:var(--color-tournament-border)] rounded-xl bg-[color:var(--color-tournament-card)] mt-4">
            <h3 className="text-[color:var(--color-tournament-primary)] font-bold mb-2">Avanza Fase: Finale</h3>
            <p className="text-xs text-[color:var(--color-tournament-text-muted)] mb-4">Genera la finale con le vincitrici delle semifinali.</p>
            <button onClick={generaFinaleMock} className="w-full bg-[color:var(--color-tournament-primary)]/20 text-[color:var(--color-tournament-primary)] hover:bg-[color:var(--color-tournament-primary)] hover:text-black font-bold uppercase tracking-widest py-3 rounded-xl transition border border-[color:var(--color-tournament-primary)]/50">
              Genera Finale
            </button>
          </div>
        ) : null}
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
  const [nuovaData, setNuovaData] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [giorniSettimana, setGiorniSettimana] = useState<number[]>([1,2,3,4,5]);

  if (!miaSquadra) return (
    <div className="card-bold text-center space-y-4 py-12">
      <h2 className="text-xl font-bold text-[color:var(--color-tournament-text)]">Nessuna squadra associata</h2>
      <p className="text-sm text-[color:var(--color-tournament-text-muted)]">L'admin non ti ha ancora collegato a nessuna squadra.</p>
    </div>
  );

  const aggiungiData = () => {
    if (!nuovaData) return;
    const dateAttuali = miaSquadra.giorni_indisponibili || [];
    let dateDaAggiungere: string[] = [];
    
    if (dataFine) {
      let current = new Date(nuovaData);
      const end = new Date(dataFine);
      while (current <= end) {
        if (giorniSettimana.includes(current.getDay())) {
          dateDaAggiungere.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      dateDaAggiungere = [nuovaData];
    }

    const nuoveDate = dateDaAggiungere.filter(d => !dateAttuali.includes(d));
    
    if (nuoveDate.length > 0) {
      const updatedSquadre = state.squadre.map(s => 
        s.id === miaSquadra.id ? { ...s, giorni_indisponibili: [...dateAttuali, ...nuoveDate].sort() } : s
      );
      updateState({ squadre: updatedSquadre });
    }
    setNuovaData('');
    setDataFine('');
  };

  const toggleGiorno = (day: number) => {
    setGiorniSettimana(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const rimuoviData = (dataDaRimuovere: string) => {
    const updatedSquadre = state.squadre.map(s => 
      s.id === miaSquadra.id ? { ...s, giorni_indisponibili: (s.giorni_indisponibili || []).filter(d => d !== dataDaRimuovere) } : s
    );
    updateState({ squadre: updatedSquadre });
  };

  return (
    <div className="space-y-6">
      <div className="card-bold text-center border-[color:var(--color-tournament-primary)]/50">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-[color:var(--color-tournament-text)]">{miaSquadra.nome}</h1>
        <p className="text-[10px] text-[color:var(--color-tournament-primary)] font-mono mt-2">DASHBOARD CAPITANO</p>
      </div>

      <div className="card-bold space-y-4">
         <h2 className="label-bold">Giorni Indisponibili</h2>
         <p className="text-xs text-[color:var(--color-tournament-text-muted)] mb-4">Segnala le date in cui la tua squadra NON può giocare. Queste verranno evitate durante la generazione del calendario.</p>
         
         <div className="space-y-3 mb-4">
             <div className="flex gap-2 items-center">
               <input 
                 type="date" style={{ colorScheme: 'dark' }}
                 value={nuovaData}
                 onChange={e => setNuovaData(e.target.value)}
                 className="flex-1 bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-3 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)]"
               />
               <span className="text-xs text-[color:var(--color-tournament-text-muted)] font-bold">a</span>
               <input 
                 type="date" style={{ colorScheme: 'dark' }}
                 value={dataFine}
                 onChange={e => setDataFine(e.target.value)}
                 className="flex-1 bg-[color:var(--color-tournament-card)] border border-[color:var(--color-tournament-border)] rounded-xl p-3 text-[color:var(--color-tournament-text)] focus:outline-none focus:border-[color:var(--color-tournament-primary)]"
               />
             </div>
             
             {dataFine && (
               <div className="flex justify-between mt-2 px-2">
                 {[1,2,3,4,5,6,0].map(day => {
                   const labels = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
                   return (
                     <button 
                       key={day} 
                       onClick={() => toggleGiorno(day)} 
                       className={`w-8 h-8 rounded-full text-xs font-bold transition border border-[color:var(--color-tournament-border)] ${giorniSettimana.includes(day) ? 'bg-[color:var(--color-tournament-primary)] text-black' : 'bg-[color:var(--color-tournament-card)] text-[color:var(--color-tournament-text-muted)] hover:bg-[color:var(--color-tournament-border)]'}`}
                     >
                       {labels[day].charAt(0)}
                     </button>
                   );
                 })}
               </div>
             )}

             <button onClick={aggiungiData} className="w-full bg-[color:var(--color-tournament-card)] text-[color:var(--color-tournament-text)] font-bold px-4 py-3 mt-2 rounded-xl border border-[color:var(--color-tournament-border)] hover:bg-[color:var(--color-tournament-border)] transition">
               Aggiungi {dataFine ? 'Range' : 'Data'}
             </button>
         </div>

         {miaSquadra.giorni_indisponibili && miaSquadra.giorni_indisponibili.length > 0 ? (
           <div className="flex flex-wrap gap-2">
             {miaSquadra.giorni_indisponibili.map(data => (
               <div key={data} className="bg-[color:var(--color-tournament-primary)]/10 text-[color:var(--color-tournament-primary)] border border-[color:var(--color-tournament-primary)]/30 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                 {new Date(data).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                 <button onClick={() => rimuoviData(data)} className="hover:text-[color:var(--color-tournament-text)] transition font-bold">✕</button>
               </div>
             ))}
           </div>
         ) : (
           <p className="text-xs text-[color:var(--color-tournament-text-muted)] italic">Nessuna data segnalata.</p>
         )}
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


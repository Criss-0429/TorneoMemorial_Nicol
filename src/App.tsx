/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
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

  // --- LOGICA AUTH ---
  useEffect(() => {
    // Gestione sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user ?? null);
    });

    // Ascolto cambiamenti di stato auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (user: any | null) => {
    let ruolo: Role = 'ospite';
    let capitani: any[] = [];

    if (user) {
      ruolo = 'ospite_autenticato';
      if (ADMIN_EMAILS.includes(user.email)) {
        ruolo = 'admin';
      } else {
        // Verifica se l'utente è un capitano autorizzato nel DB
        const { data } = await supabase.from('capitani').select('*');
        capitani = data ?? [];
        const isCapitano = capitani.find(c => c.email === user.email);
        if (isCapitano) ruolo = 'capitano';
      }
    }

    setState(prev => ({ 
      ...prev, 
      utente: user, 
      ruolo, 
      capitani,
      loading: false 
    }));
  };

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Errore login:', error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setActiveTab('dashboard');
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
            {activeTab === 'dashboard' && <DashboardView state={state} login={login} />}
            {activeTab === 'squadre' && <SquadreView />}
            {activeTab === 'calendario' && <CalendarioView />}
            {activeTab === 'classifica' && <ClassificaView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav-glass">
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
      </nav>
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

function DashboardView({ state, login }: { state: IAppState, login: () => void }) {
  if (state.ruolo === 'admin') return <AdminDashboardView state={state} />;
  if (state.ruolo === 'capitano') return <CapitanoDashboardView state={state} />;
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

function AdminDashboardView({ state }: { state: IAppState }) { 
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-[color:var(--color-tournament-border)] pb-6">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-white">Dashboard <span className="text-[color:var(--color-tournament-primary)]">Admin</span></h1>
        <p className="text-xs font-mono text-zinc-500">SYSTEM_ADMIN_ACTIVE • OVERRIDE_ENABLED</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard label="Iscritti" value="16" unit="SQUADRE" />
        <StatCard label="Match" value="48" unit="PARTITE" />
        <StatCard label="Stato" value="GIRONI" unit="FASE" />
        <StatCard label="Campione" value="--" unit="PREVISTO" />
      </div>

      <h2 className="label-bold mt-8 mb-4 border-b border-zinc-800 pb-2">AZIONI DI GESTIONE</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-all hover:bg-zinc-900 group">
          <Users className="mb-4 text-[color:var(--color-tournament-primary)] transition-transform group-hover:scale-110 group-hover:-rotate-3" size={32} />
          <h3 className="text-xl font-black uppercase text-white tracking-widest">Squadre & Capitani</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-2">MANAGE_TEAMS_AUTH_OK</p>
        </button>
        <button className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-all hover:bg-zinc-900 group">
          <Calendar className="mb-4 text-zinc-400 group-hover:text-[color:var(--color-tournament-primary)] transition-transform group-hover:scale-110 group-hover:rotate-3" size={32} />
          <h3 className="text-xl font-black uppercase text-white tracking-widest">Genera Calendario</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-2">MODULE_SCHEDULER_PENDING</p>
        </button>
        <button className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-all hover:bg-zinc-900 group">
          <Trophy className="mb-4 text-zinc-400 group-hover:text-[color:var(--color-tournament-primary)] transition-transform group-hover:scale-110" size={32} />
          <h3 className="text-xl font-black uppercase text-white tracking-widest">Risultati Partite</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-2">INSERT_MATCH_RESULTS</p>
        </button>
        <button className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-all hover:bg-zinc-900 group">
          <Settings className="mb-4 text-zinc-400 group-hover:text-[color:var(--color-tournament-primary)] transition-transform group-hover:rotate-90" size={32} />
          <h3 className="text-xl font-black uppercase text-white tracking-widest">Controllo Fasi</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-2">ADVANCE_TO_PLAYOFFS</p>
        </button>
      </div>
    </div>
  ); 
}

function CapitanoDashboardView({ state }: { state: IAppState }) {
  const miaSquadra = state.capitani.find(c => c.email === state.utente?.email);
  const nomeSquadra = miaSquadra ? `Squadra ${miaSquadra.squadra_id}` : "LA TUA SQUADRA";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-[color:var(--color-tournament-border)] pb-6 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-[color:var(--color-tournament-primary)]">{nomeSquadra}</h1>
        <p className="text-xs font-mono text-zinc-500">CAPTAIN_ACCESS_GRANTED • ROSTER_EDIT_ENABLED</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard label="Giocatori" value="11" unit="ROSA" />
        <StatCard label="Punti" value="6" unit="CLASSIFICA" />
        <StatCard label="Vinte" value="2" unit="MATCH" />
        <StatCard label="Perse" value="0" unit="MATCH" />
      </div>

      <div className="card-bold text-center py-20 flex flex-col items-center justify-center group overflow-hidden relative border-zinc-800 hover:border-[color:var(--color-tournament-primary)] transition-colors cursor-pointer">
         <div className="relative z-10 flex flex-col items-center">
            <UserIcon className="text-zinc-600 group-hover:text-[color:var(--color-tournament-primary)] mb-4 transition-colors" size={48} />
            <h2 className="text-2xl font-black uppercase tracking-widest text-white group-hover:text-[color:var(--color-tournament-primary)] transition-colors">Schiera Formazione</h2>
            <p className="text-xs text-zinc-500 font-mono mt-2">Seleziona il modulo e inserisci i giocatori</p>
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-tournament-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
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

function SquadreView() { return <div className="card-bold text-center text-zinc-500">LIST_FETCHING_MODULE_READY</div>; }
function CalendarioView() { return <div className="card-bold text-center text-zinc-500">CALENDAR_GENERATOR_LOADED</div>; }
function ClassificaView() { return <div className="card-bold text-center text-zinc-500">LIVE_RANKING_ENGINE_SYNCED</div>; }


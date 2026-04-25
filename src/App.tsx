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
const ADMIN_EMAIL = 'cristian.laporta04@gmail.com'; 

export default function App() {
  const [state, setState] = useState<IAppState>({
    utente: null,
    ruolo: 'ospite',
    squadre: [],
    partite: [],
    capitani: [],
    config: {
      id: 1,
      nome: 'Torneo Calcio',
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
      if (user.email === ADMIN_EMAIL) {
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
    <div className="flex min-h-screen flex-col bg-[color:var(--color-tournament-bg)] pb-20">
      {/* Header Fisso */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-[color:var(--color-tournament-border)] bg-black px-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--color-tournament-primary)] text-black">
            <Trophy size={24} weight="fill" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-none tracking-tighter uppercase">
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
                className="h-10 w-10 rounded-full border border-[color:var(--color-tournament-border)]"
              />
              <button 
                onClick={logout}
                className="rounded-full p-2 text-zinc-500 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
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
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardView state={state} />}
            {activeTab === 'squadre' && <SquadreView />}
            {activeTab === 'calendario' && <CalendarioView />}
            {activeTab === 'classifica' && <ClassificaView />}
            {activeTab === 'admin' && <AdminView state={state} />}
            {activeTab === 'mia_squadra' && <MiaSquadraView />}
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

// --- VISTE PLACEHOLDER ---

function DashboardView({ state }: { state: IAppState }) {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row gap-12">
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-[clamp(60px,10vw,120px)] leading-[0.85] font-black tracking-tighter text-white uppercase italic">
            Init<br/><span className="text-[color:var(--color-tournament-primary)]">Torneo</span>
          </h1>
          <p className="mt-8 text-zinc-400 text-lg max-w-sm leading-relaxed font-medium">
            Gestione completa per il tuo torneo di calcio. Real-time stats, formazioni e calendari sincronizzati.
          </p>
        </div>

        <div className="w-full md:w-[400px] card-bold flex flex-col justify-between">
          <div>
            <h2 className="label-bold mb-6">Status della Competizione</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="label-bold text-[9px]">Competizione</label>
                <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 font-mono text-sm text-[color:var(--color-tournament-primary)]">
                  {state.config.nome.toUpperCase().replace(/\s+/g, '_')}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-bold text-[9px]">Gironi</label>
                  <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 font-mono text-sm">
                    {state.config.num_gironi}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label-bold text-[9px]">Fase</label>
                  <div className="bg-[color:var(--color-tournament-primary)]/10 p-4 rounded-xl border border-[color:var(--color-tournament-primary)]/30 status-pulse">
                    <span className="status-dot"></span>
                    {state.config.fase_attuale.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="btn-primary-bold mt-8">
            INIZIA TORNEO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Iscritti" value="16" unit="SQUADRE" />
        <StatCard label="Match" value="48" unit="PARTITE" />
        <StatCard label="Campione" value="--" unit="PREVISTO" />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <div className="card-bold">
      <h3 className="label-bold">{label}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black">{value}</span>
        <span className="text-xs font-bold text-zinc-500">{unit}</span>
      </div>
    </div>
  );
}

function SquadreView() { return <div className="card-bold text-center text-zinc-500">LIST_FETCHING_MODULE_READY</div>; }
function CalendarioView() { return <div className="card-bold text-center text-zinc-500">CALENDAR_GENERATOR_LOADED</div>; }
function ClassificaView() { return <div className="card-bold text-center text-zinc-500">LIVE_RANKING_ENGINE_SYNCED</div>; }
function AdminView({ state }: { state: IAppState }) { 
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black">Admin Panel</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-colors group">
          <Users className="mb-4 text-[color:var(--color-tournament-primary)]" size={32} />
          <h3 className="text-lg font-black">Squadre</h3>
          <p className="text-xs text-zinc-500 font-mono mt-1">MODULE_TEAMS_AUTH_OK</p>
        </button>
        <button className="card-bold text-left hover:border-[color:var(--color-tournament-primary)] transition-colors group">
          <Calendar className="mb-4 text-zinc-400 group-hover:text-[color:var(--color-tournament-primary)]" size={32} />
          <h3 className="text-lg font-black">Calendario</h3>
          <p className="text-xs text-zinc-500 font-mono mt-1">MODULE_SCHEDULER_PENDING</p>
        </button>
      </div>
    </div>
  ); 
}
function MiaSquadraView() { return <div className="card-bold text-center text-[color:var(--color-tournament-primary)] font-black text-2xl py-20 italic underline decoration-4">MY_TEAM_COMMAND_CENTER</div>; }

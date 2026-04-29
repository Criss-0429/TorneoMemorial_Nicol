
export type Role = 'ospite' | 'ospite_autenticato' | 'capitano' | 'admin';
export type Theme = 'light' | 'dark';

export interface Squadra {
  id: string;
  nome: string;
  logo_url?: string;
  girone: number;
  colore_maglia: string;
  colore_secondario: string;
  creato_at: string;
  giorni_indisponibili?: string[]; // Date in formato YYYY-MM-DD in cui la squadra non può giocare
}

export interface Giocatore {
  id: string;
  squadra_id: string;
  nome: string;
  cognome?: string;
  numero_maglia: number;
  ruolo?: 'P' | 'D' | 'C' | 'A';
  foto_url?: string;
}

export interface Partita {
  id: string;
  casa_id: string;
  trasferta_id: string;
  data: string;
  orario: string;
  girone?: number;
  fase: 'andata' | 'ritorno' | 'fase a gironi' | 'girone' | 'spareggio' | 'semifinale' | 'finale' | 'quarti';
  gol_casa?: number;
  gol_trasferta?: number;
  completata: boolean;
}

export interface ConfigTorneo {
  id: number;
  nome: string;
  num_gironi: number;
  andata_ritorno: boolean;
  riposo_minimo_giorni: number;
  fase_attuale: 'setup' | 'gironi' | 'playoff' | 'concluso';
  giorni_torneo?: string[]; // Date valide per le partite YYYY-MM-DD
  orari_torneo?: string[]; // Orari validi per le partite HH:MM
  partita_apertura_casa?: string;
  partita_apertura_trasferta?: string;
}

export interface Capitano {
  id: string;
  email: string;
  squadra_id: string;
  autorizzato_da: string;
  creato_at: string;
}

export interface AppState {
  utente: any | null;
  ruolo: Role;
  squadre: Squadra[];
  partite: Partita[];
  capitani: Capitano[];
  giocatori: Giocatore[];
  config: ConfigTorneo;
  loading: boolean;
}

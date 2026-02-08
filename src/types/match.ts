export type TeamType = 'home' | 'away';
export type CardType = 'yellow' | 'red';

export interface Player {
  id: string;
  name: string;
  number: number | null;
  isOnField: boolean;
  isStarter: boolean;
  isExpelled?: boolean;
  goals: number;
  cards: { yellow: number; red: number };
  // Playtime tracking using timestamp/delta system
  currentEntryTime: number | null; // timestamp when player entered field (null if not on field)
  totalSecondsPlayed: number; // accumulated playtime in seconds
  secondsPlayedPerPeriod: { [period: number]: number }; // playtime per period for accurate partials
}

export interface Team {
  name: string;
  players: Player[];
  score: number;
}

export type EventType =
  | 'period_start'
  | 'period_end'
  | 'goal'
  | 'own_goal'
  | 'substitution'
  | 'yellow_card'
  | 'red_card'
  | 'player_in'
  | 'player_out';

export interface MatchEvent {
  id: string;
  type: EventType;
  timestamp: number; // seconds from period start
  period: number;
  team: 'home' | 'away';
  playerId?: string;
  playerName?: string;
  playerNumber?: number;
  playerOutId?: string;
  playerOutName?: string;
  playerOutNumber?: number;
  playerInId?: string;
  playerInName?: string;
  playerInNumber?: number;
  homeScore?: number;
  awayScore?: number;
  description: string;
  cardType?: CardType;
}

export interface PeriodScore {
  period: number;
  homeScore: number;
  awayScore: number;
}

export interface MatchState {
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  currentPeriod: number;
  periodDuration: number; // in minutes
  totalPeriods: number;
  elapsedTime: number; // seconds (calculated from timestamp-delta)
  isRunning: boolean;
  isPaused: boolean;
  isMatchStarted: boolean;
  isMatchEnded: boolean;
  periodScores: PeriodScore[];
  needsStarterSelection: boolean;
  // Timestamp-delta timer system (fixes background freezing)
  periodStartTimestamp: number | null; // when the period timer started
  accumulatedPauseTime: number; // total ms spent paused in current period
  pauseStartTimestamp: number | null; // when the current pause started (null if not paused)
}


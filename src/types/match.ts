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
  elapsedTime: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
  isMatchStarted: boolean;
  isMatchEnded: boolean;
  periodScores: PeriodScore[];
  needsStarterSelection: boolean;
}


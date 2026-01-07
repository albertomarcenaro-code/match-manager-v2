import { MatchEvent, PeriodScore } from './match';

export interface TournamentPlayer {
  id: string;
  name: string;
  number: number | null;
  totalGoals: number;
  totalMinutes: number;
  totalYellowCards: number;
  totalRedCards: number;
  matchesPlayed: number;
}

export interface TournamentMatch {
  id: string;
  date: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  playerStats: TournamentPlayerMatchStats[];
  events: MatchEvent[];
  periodScores: PeriodScore[];
}

export interface TournamentPlayerMatchStats {
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  goals: number;
  minutes: number;
  yellowCards: number;
  redCards: number;
}

export interface TournamentState {
  id: string;
  name: string;
  teamName: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  isActive: boolean;
  createdAt: string;
}

// Shared tournament statistics aggregation.
// Aggregates stats for the user's "home" team across all matches in a tournament.
// Uniqueness is keyed by player.id when available, falling back to a normalized name.

export interface AggregatedPlayerStats {
  key: string;
  id?: string;
  name: string;
  number: number | null;
  goals: number;
  yellowCards: number;
  redCards: number;
  minutes: number;
  seconds: number;
  matchesPlayed: number;
  perMatchMinutes: Record<string, number | null>;
}

export interface AggregatedTournamentStats {
  wins: number;
  draws: number;
  losses: number;
  players: AggregatedPlayerStats[];
}

interface MatchLike {
  id: string;
  home_score: number;
  away_score: number;
  match_data: any;
}

const normalizeName = (n?: string) => (n || 'Sconosciuto').trim().toLowerCase();
const playerKey = (id?: string, name?: string) =>
  id ? `id:${id}` : `name:${normalizeName(name)}`;

export function aggregateTournamentStats(matches: MatchLike[]): AggregatedTournamentStats {
  let wins = 0, draws = 0, losses = 0;
  const map = new Map<string, AggregatedPlayerStats>();

  const ensure = (id: string | undefined, name: string | undefined, number: number | null = null) => {
    const key = playerKey(id, name);
    let p = map.get(key);
    if (!p) {
      p = {
        key,
        id,
        name: (name || 'Sconosciuto').trim(),
        number,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        minutes: 0,
        seconds: 0,
        matchesPlayed: 0,
        perMatchMinutes: {},
      };
      map.set(key, p);
    } else {
      // Backfill missing fields from later occurrences
      if (!p.id && id) p.id = id;
      if (p.number == null && number != null) p.number = number;
    }
    return p;
  };

  for (const m of matches) {
    if (m.home_score > m.away_score) wins++;
    else if (m.home_score === m.away_score) draws++;
    else losses++;

    const md = (m.match_data && typeof m.match_data === 'object') ? m.match_data : {};
    const homePlayers: any[] = md.homeTeam?.players || md.homePlayers || [];
    const events: any[] = md.events || [];

    // Minutes & roster presence (Mia Squadra only)
    for (const p of homePlayers) {
      const player = ensure(p.id, p.name, typeof p.number === 'number' ? p.number : null);
      const sec = Number(p.totalSecondsPlayed) || 0;
      const playedThisMatch = sec > 0 || p.isOnField;
      if (playedThisMatch) {
        player.seconds += sec;
        player.minutes = Math.round(player.seconds / 60);
        player.matchesPlayed += 1;
        player.perMatchMinutes[m.id] = Math.round(sec / 60);
      } else if (player.perMatchMinutes[m.id] === undefined) {
        player.perMatchMinutes[m.id] = null;
      }
    }

    // Events (only home team — "Mia Squadra")
    for (const ev of events) {
      if (ev.team !== 'home') continue;
      if (ev.type === 'goal') {
        ensure(ev.playerId, ev.playerName, ev.playerNumber ?? null).goals += 1;
      } else if (ev.type === 'yellow_card' || (ev.type === 'card' && ev.cardType === 'yellow')) {
        ensure(ev.playerId, ev.playerName, ev.playerNumber ?? null).yellowCards += 1;
      } else if (ev.type === 'red_card' || (ev.type === 'card' && ev.cardType === 'red')) {
        ensure(ev.playerId, ev.playerName, ev.playerNumber ?? null).redCards += 1;
      }
    }
  }

  // Regola di business: i giocatori senza numero di maglia assegnato non hanno
  // partecipato al torneo → esclusi da TUTTE le classifiche (marcatori, minuti, cartellini).
  const players = [...map.values()]
    .filter(p => typeof p.number === 'number' && p.number !== null)
    .sort((a, b) => b.minutes - a.minutes || b.goals - a.goals);
  return { wins, draws, losses, players };
}

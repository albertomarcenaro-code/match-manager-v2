// Shared tournament statistics aggregation.
// Aggregates stats for the user's "home" team across all matches in a tournament.
// Grouping is keyed primarily by player.id (unique uuid). When a tournament-level
// jersey map is provided, the jersey number AND inclusion in the rankings come
// EXCLUSIVELY from that map — players without an assigned tournament jersey are
// excluded from every leaderboard.

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

export function aggregateTournamentStats(
  matches: MatchLike[],
  jerseys?: Map<string, number> | null,
): AggregatedTournamentStats {
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

  // ---- Second-pass merge: collapse rows that are clearly the same human player
  // (same normalized name + same jersey number) but ended up under different ids
  // because the player was recreated in a later match.
  const merged = new Map<string, AggregatedPlayerStats>();
  for (const p of map.values()) {
    // Prefer tournament-level jersey when available — this drives both the
    // displayed number AND inclusion (no entry => skip later).
    const tournamentNumber = p.id && jerseys ? (jerseys.get(p.id) ?? null) : null;
    const effectiveNumber = tournamentNumber ?? p.number;
    const mergeKey = effectiveNumber != null
      ? `n:${normalizeName(p.name)}|#${effectiveNumber}`
      : `k:${p.key}`;

    const existing = merged.get(mergeKey);
    if (!existing) {
      merged.set(mergeKey, { ...p, number: effectiveNumber });
    } else {
      existing.goals += p.goals;
      existing.yellowCards += p.yellowCards;
      existing.redCards += p.redCards;
      existing.seconds += p.seconds;
      existing.minutes = Math.round(existing.seconds / 60);
      existing.matchesPlayed += p.matchesPlayed;
      for (const [mid, mins] of Object.entries(p.perMatchMinutes)) {
        if (mins != null) existing.perMatchMinutes[mid] = (existing.perMatchMinutes[mid] || 0) + mins;
        else if (existing.perMatchMinutes[mid] === undefined) existing.perMatchMinutes[mid] = null;
      }
      if (!existing.id && p.id) existing.id = p.id;
    }
  }

  // ---- Final filter: a player is part of the tournament rankings ONLY if they
  // have a jersey number assigned for this tournament.
  // - If we have a `jerseys` map: include only players present in it.
  // - Otherwise (legacy): include players whose snapshot number is non-null.
  let players = Array.from(merged.values());
  if (jerseys) {
    players = players.filter(p => p.id ? jerseys.has(p.id) : false);
  } else {
    players = players.filter(p => typeof p.number === 'number' && p.number !== null);
  }

  players.sort((a, b) => b.minutes - a.minutes || b.goals - a.goals);
  return { wins, draws, losses, players };
}

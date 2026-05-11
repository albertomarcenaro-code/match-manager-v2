import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LiveBadge } from '@/components/live/LiveBadge';
import { LiveFooter } from '@/components/live/LiveFooter';
import { Card } from '@/components/ui/card';
import { Loader2, Trophy, Target, Square, Clock } from 'lucide-react';
import logo from '@/assets/logo.webp';
import { cn } from '@/lib/utils';
import { aggregateTournamentStats } from '@/lib/tournamentStats';

interface Tournament {
  id: string;
  name: string;
  team_name: string;
}
interface MatchRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  status: string;
  match_date: string;
  match_data: any;
}

const formatMin = (s: number) => `${Math.floor((s || 0) / 60)}'`;

export default function LiveTournament() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      const [{ data: t }, { data: ms }] = await Promise.all([
        supabase.from('tournaments').select('id, name, team_name').eq('id', id).maybeSingle(),
        supabase.from('matches').select('*').eq('tournament_id', id).order('match_date', { ascending: true }),
      ]);
      if (!mounted) return;
      if (!t) {
        setNotFound(true);
      } else {
        setTournament(t as Tournament);
        setMatches((ms as MatchRow[]) || []);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`live-tournament-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` },
        (payload) => {
          setMatches((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((m) => m.id !== (payload.old as any).id);
            }
            const row = payload.new as MatchRow;
            const idx = prev.findIndex((m) => m.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.match_date.localeCompare(b.match_date));
            const next = [...prev];
            next[idx] = row;
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Aggregate stats from match_data across all matches (Mia Squadra only),
  // keyed strictly by player.id with name fallback for safety.
  const stats = useMemo(() => aggregateTournamentStats(matches), [matches]);
  const scorers = useMemo(() => stats.players.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals), [stats]);
  const minutesRanking = useMemo(() => stats.players.filter(p => p.minutes > 0).sort((a, b) => b.minutes - a.minutes), [stats]);
  const yellows = useMemo(() => stats.players.filter(p => p.yellowCards > 0).sort((a, b) => b.yellowCards - a.yellowCards), [stats]);
  const reds = useMemo(() => stats.players.filter(p => p.redCards > 0).sort((a, b) => b.redCards - a.redCards), [stats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (notFound || !tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Torneo non trovato</h1>
        <Link to="/" className="text-primary font-semibold hover:underline">Torna alla home</Link>
      </div>
    );
  }

  const liveMatch = matches.find((m) => {
    const md = m.match_data || {};
    return md.isMatchStarted && !md.isMatchEnded;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <img src={logo} alt="Match Manager" className="h-7 w-7" />
            <span className="font-bold text-sm text-foreground">Match Manager</span>
          </Link>
          <LiveBadge isLive={!!liveMatch} />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        <div className="text-center">
          <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
          <h1 className="text-xl font-bold text-foreground">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">{tournament.team_name}</p>
        </div>

        {/* Calendario */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Calendario
          </h2>
          {matches.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nessuna partita ancora disponibile.
            </Card>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => {
                const md = m.match_data || {};
                const isLiveNow = md.isMatchStarted && !md.isMatchEnded;
                const isFinal = md.isMatchEnded;
                return (
                  <Link key={m.id} to={`/live/match/${m.id}`} className="block">
                    <Card className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{m.home_team_name}</span>
                            <span className="text-sm font-bold tabular-nums">{m.home_score}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{m.away_team_name}</span>
                            <span className="text-sm font-bold tabular-nums">{m.away_score}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isLiveNow ? (
                            <LiveBadge isLive />
                          ) : isFinal ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase">Finale</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-bold uppercase">Programmata</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Statistiche */}
        {(stats.scorers.length > 0 || stats.yellows.length > 0 || stats.reds.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Statistiche torneo
            </h2>

            {stats.scorers.length > 0 && (
              <Card className="p-4">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" /> Marcatori
                </h3>
                <ul className="space-y-1">
                  {stats.scorers.slice(0, 10).map((s, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate">{s.name}</span>
                      <span className="font-bold tabular-nums text-foreground">{s.goals}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {(stats.yellows.length > 0 || stats.reds.length > 0) && (
              <Card className="p-4">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                  <Square className="h-3.5 w-3.5" /> Disciplinare
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-yellow-600 uppercase mb-1">Gialli</p>
                    <ul className="space-y-0.5">
                      {stats.yellows.slice(0, 8).map((s, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="text-foreground truncate">{s.name}</span>
                          <span className="font-bold tabular-nums">{s.count}</span>
                        </li>
                      ))}
                      {stats.yellows.length === 0 && <li className="text-muted-foreground text-xs">—</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-red-600 uppercase mb-1">Rossi</p>
                    <ul className="space-y-0.5">
                      {stats.reds.slice(0, 8).map((s, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="text-foreground truncate">{s.name}</span>
                          <span className="font-bold tabular-nums">{s.count}</span>
                        </li>
                      ))}
                      {stats.reds.length === 0 && <li className="text-muted-foreground text-xs">—</li>}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </section>
        )}
      </main>

      <LiveFooter />
    </div>
  );
}

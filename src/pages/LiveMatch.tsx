import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LiveBadge } from '@/components/live/LiveBadge';
import { LiveFooter } from '@/components/live/LiveFooter';
import { Card } from '@/components/ui/card';
import { Loader2, Target, Square, RefreshCw, Flag, AlertTriangle, Trophy } from 'lucide-react';
import logo from '@/assets/logo.webp';
import { cn } from '@/lib/utils';

interface MatchRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  status: string;
  match_date: string;
  match_data: any;
  tournament_id: string | null;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatMin = (seconds: number) => `${Math.floor(seconds / 60)}'`;

const periodLabel = (md: any): string => {
  if (!md) return '-';
  if (md.isMatchEnded) return 'Finale';
  if (!md.isMatchStarted) return 'Pre';
  const p = md.currentPeriod || 1;
  return `${p}° tempo`;
};

const statusLabel = (md: any): string => {
  if (!md) return 'In attesa';
  if (md.isMatchEnded) return 'Terminata';
  if (md.isPaused) return 'In pausa';
  if (md.isRunning) return 'In corso';
  if (md.isMatchStarted) return 'Intervallo';
  return 'Da iniziare';
};

export default function LiveMatch() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setMatch(data as MatchRow);
        if ((data as MatchRow).tournament_id) {
          const { data: t } = await supabase
            .from('tournaments')
            .select('name')
            .eq('id', (data as MatchRow).tournament_id!)
            .maybeSingle();
          if (mounted && t) setTournamentName((t as any).name);
        }
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`live-match-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) setMatch(payload.new as MatchRow);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const md = match?.match_data;
  useEffect(() => {
    if (!md?.isRunning || md?.isPaused) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [md?.isRunning, md?.isPaused]);

  const elapsed = useMemo(() => {
    if (!md) return 0;
    const base = md.elapsedTime || 0;
    if (!md.isRunning || md.isPaused || !md.periodStartTimestamp) return base;
    const accPause = md.accumulatedPauseTime || 0;
    return Math.max(0, Math.floor((Date.now() - md.periodStartTimestamp - accPause) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [md, tick]);

  const events: any[] = md?.events || [];
  const periodScores: any[] = md?.periodScores || [];
  const isLive = !!md?.isMatchStarted && !md?.isMatchEnded;
  const isOvertime = isLive && md?.isRunning && elapsed >= (md?.periodDuration || 999) * 60;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Partita non trovata</h1>
        <Link to="/" className="text-primary font-semibold hover:underline">Torna alla home</Link>
      </div>
    );
  }

  const goalEvents = events.filter((e) => e.type === 'goal' || e.type === 'own_goal');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top brand bar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="Icona dell'app Match Manager Live" className="h-7 w-7" />
            <span className="font-bold text-sm text-foreground">Match Manager</span>
          </Link>
          <LiveBadge isLive={isLive} />
        </div>

        {/* Sub-header: period | timer+status | tournament */}
        <div className="max-w-2xl mx-auto px-4 pb-2 grid grid-cols-3 items-center gap-2">
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo</p>
            <p className="text-sm font-bold text-foreground">{periodLabel(md)}</p>
          </div>

          <div className={cn(
            'text-center rounded-lg px-2 py-1 transition-colors',
            isOvertime ? 'bg-destructive text-destructive-foreground' : 'bg-muted/60'
          )}>
            <p className={cn('text-lg font-bold tabular-nums leading-tight', isOvertime ? 'text-destructive-foreground' : 'text-foreground')}>
              {md?.isMatchStarted ? formatTime(elapsed) : '00:00'}
            </p>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wider leading-tight', isOvertime ? 'text-destructive-foreground/80' : 'text-muted-foreground')}>
              {isOvertime ? 'Recupero' : statusLabel(md)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Torneo</p>
            {match.tournament_id && tournamentName ? (
              <Link
                to={`/public-tournament/${match.tournament_id}`}
                className="text-sm font-bold text-primary hover:underline truncate block"
              >
                {tournamentName}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground truncate">Amichevole</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-center text-foreground">
          {match.home_team_name} vs {match.away_team_name}
        </h1>
        {/* Scoreboard */}
        <Card className="p-4 sm:p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="h-3 w-3 rounded-full bg-green-600 flex-shrink-0" />
                <span className="font-semibold text-base sm:text-lg text-foreground truncate">
                  {match.home_team_name}
                </span>
              </div>
              <span className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground flex-shrink-0">
                {match.home_score}
              </span>
            </div>
            <div className="border-t border-border/50" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="h-3 w-3 rounded-full bg-gray-500 flex-shrink-0" />
                <span className="font-semibold text-base sm:text-lg text-foreground truncate">
                  {match.away_team_name}
                </span>
              </div>
              <span className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground flex-shrink-0">
                {match.away_score}
              </span>
            </div>
          </div>

          {periodScores.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap gap-2 justify-center">
              {periodScores.map((ps: any) => (
                <span key={ps.period} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                  {ps.period}°: {ps.homeScore}-{ps.awayScore}
                </span>
              ))}
            </div>
          )}
        </Card>

        {goalEvents.length > 0 && (
          <Card className="p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" /> Marcatori
            </h2>
            <ul className="space-y-1.5">
              {goalEvents.map((e: any) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span className={cn('h-2 w-2 rounded-full flex-shrink-0', e.team === 'home' ? 'bg-green-600' : 'bg-gray-500')} />
                  <span className="tabular-nums text-muted-foreground text-xs w-12 flex-shrink-0">
                    {formatMin(e.timestamp || 0)}
                  </span>
                  <span className="font-medium text-foreground truncate">
                    {e.type === 'own_goal' ? 'AG ' : ''}{e.playerName || 'N/D'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                    {e.period}°
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {events.length > 0 && (
          <Card className="p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Cronologia
            </h2>
            <ul className="space-y-1.5">
              {[...events].reverse().map((e: any) => (
                <li key={e.id} className="flex items-center gap-2 text-xs">
                  <EventIcon type={e.type} />
                  <span className="tabular-nums text-muted-foreground w-12 flex-shrink-0">
                    {formatMin(e.timestamp || 0)}
                  </span>
                  <span className="text-foreground truncate flex-1">{e.description}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {match.tournament_id && tournamentName && (
          <Link
            to={`/public-tournament/${match.tournament_id}`}
            className="flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline py-2"
          >
            <Trophy className="h-4 w-4" />
            Vai al torneo: {tournamentName}
          </Link>
        )}
      </main>

      <LiveFooter />
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  const cls = 'h-3.5 w-3.5 flex-shrink-0';
  switch (type) {
    case 'goal':
    case 'own_goal':
      return <Target className={cn(cls, 'text-green-600')} />;
    case 'yellow_card':
      return <Square className={cn(cls, 'text-yellow-500 fill-yellow-500')} />;
    case 'red_card':
      return <Square className={cn(cls, 'text-red-600 fill-red-600')} />;
    case 'substitution':
      return <RefreshCw className={cn(cls, 'text-blue-500')} />;
    case 'period_start':
    case 'period_end':
      return <Flag className={cn(cls, 'text-muted-foreground')} />;
    default:
      return <AlertTriangle className={cn(cls, 'text-muted-foreground')} />;
  }
}

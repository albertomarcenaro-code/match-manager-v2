import { useRef, useState } from 'react';
import { MatchEvent } from '@/types/match';
import { cn } from '@/lib/utils';
import { Target, RefreshCw, Play, Flag, Square } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  onDeleteEvent?: (eventId: string) => void;
}

const LONG_PRESS_MS = 550;

export function EventTimeline({ events, homeTeamName, awayTeamName, onDeleteEvent }: EventTimelineProps) {
  const [pendingDelete, setPendingDelete] = useState<MatchEvent | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  // Group period_start events into a single entry
  const groupedEvents = events.reduce((acc, event, index) => {
    if (event.type === 'period_start') {
      const periodInEvents = events.filter(
        (e, i) => i > index && e.period === event.period && e.type === 'player_in'
      );
      if (periodInEvents.length > 0) {
        const homeStarters = periodInEvents
          .filter(e => e.team === 'home')
          .map(e => e.playerName?.split('(')[0].trim())
          .filter(Boolean);
        const awayStarters = periodInEvents
          .filter(e => e.team === 'away')
          .map(e => e.playerName?.split('(')[0].trim())
          .filter(Boolean);
        acc.push({
          ...event,
          description: event.description,
          _groupedStarters: { home: homeStarters, away: awayStarters },
        });
      } else {
        acc.push(event);
      }
    } else if (event.type === 'player_in' || event.type === 'player_out') {
      return acc;
    } else {
      acc.push(event);
    }
    return acc;
  }, [] as (MatchEvent & { _groupedStarters?: { home: string[]; away: string[] } })[]);

  const getEventIcon = (type: MatchEvent['type']) => {
    switch (type) {
      case 'goal': return <Target className="h-4 w-4" />;
      case 'own_goal': return <Target className="h-4 w-4 rotate-180" />;
      case 'substitution': return <RefreshCw className="h-4 w-4" />;
      case 'period_start': return <Play className="h-4 w-4" />;
      case 'period_end': return <Flag className="h-4 w-4" />;
      case 'yellow_card': return <Square className="h-4 w-4 fill-warning text-warning" />;
      case 'red_card': return <Square className="h-4 w-4 fill-destructive text-destructive" />;
      default: return null;
    }
  };

  const getIconContainerStyles = (type: MatchEvent['type'], team: 'home' | 'away') => {
    const teamBorder = team === 'home' ? 'border-team-home' : 'border-team-away';
    switch (type) {
      case 'goal': return cn('bg-secondary/10 border-2', teamBorder, 'text-secondary');
      case 'own_goal': return cn('bg-destructive/10 border-2', teamBorder, 'text-destructive');
      case 'yellow_card': return cn('bg-warning/10 border-2', teamBorder, 'text-warning-foreground');
      case 'red_card': return cn('bg-destructive/10 border-2', teamBorder, 'text-destructive');
      case 'period_start':
      case 'period_end': return 'bg-muted/50 border-2 border-muted-foreground/30 text-muted-foreground';
      case 'substitution': return cn('bg-muted/30 border-2', teamBorder, 'text-muted-foreground');
      default: return cn('bg-muted border-2', teamBorder);
    }
  };

  const isDeletable = (e: MatchEvent) =>
    !!onDeleteEvent &&
    (e.type === 'goal' || e.type === 'own_goal' || e.type === 'yellow_card' || e.type === 'red_card' || e.type === 'substitution');

  const startPress = (event: MatchEvent) => {
    if (!isDeletable(event)) return;
    triggeredRef.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      triggeredRef.current = true;
      setPendingDelete(event);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  if (events.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          La cronaca apparirà qui durante la partita
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Cronaca Live
        </h3>
        {onDeleteEvent && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Tieni premuto su un evento per eliminarlo
          </p>
        )}
      </div>

      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {groupedEvents.map((event, idx) => {
          const deletable = isDeletable(event);
          return (
            <div
              key={event.id}
              onPointerDown={() => startPress(event)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => { if (deletable) e.preventDefault(); }}
              className={cn(
                "flex items-start gap-3 p-3 animate-slide-up select-none",
                deletable && "cursor-pointer active:bg-accent/40 touch-none",
                idx === groupedEvents.length - 1 && event.type !== 'period_end' ? 'bg-accent/50' : ''
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="w-12 flex-shrink-0 text-right">
                <span className="text-sm font-mono font-medium text-muted-foreground">
                  {event.type === 'period_start' ? '-' : formatTime(event.timestamp)}
                </span>
              </div>

              <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0",
                getIconContainerStyles(event.type, event.team)
              )}>
                {getEventIcon(event.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{event.description}</p>
                {event.type === 'period_start' && (event as any)._groupedStarters && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {(event as any)._groupedStarters.home.length > 0 && (
                      <p><span className="font-medium">{homeTeamName}:</span> {(event as any)._groupedStarters.home.join(', ')}</p>
                    )}
                    {(event as any)._groupedStarters.away.length > 0 && (
                      <p><span className="font-medium">{awayTeamName}:</span> {(event as any)._groupedStarters.away.join(', ')}</p>
                    )}
                  </div>
                )}
                {(event.type === 'period_end') && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {homeTeamName} {event.homeScore} - {event.awayScore} {awayTeamName}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare questo evento?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.description}
              <br /><br />
              Sei sicuro di voler annullare questo evento? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete && onDeleteEvent) onDeleteEvent(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Elimina evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { MatchEvent } from '@/types/match';
import { cn } from '@/lib/utils';
import { Target, RefreshCw, Play, Flag, Square } from 'lucide-react';

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

export function EventTimeline({ events, homeTeamName, awayTeamName }: EventTimelineProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs > 0 ? secs.toString().padStart(2, '0') : ''}`;
  };

  const getEventIcon = (type: MatchEvent['type']) => {
    switch (type) {
      case 'goal':
        return <Target className="h-4 w-4" />;
      case 'own_goal':
        return <Target className="h-4 w-4 rotate-180" />;
      case 'substitution':
        return <RefreshCw className="h-4 w-4" />;
      case 'period_start':
        return <Play className="h-4 w-4" />;
      case 'period_end':
        return <Flag className="h-4 w-4" />;
      case 'yellow_card':
        return <Square className="h-4 w-4 fill-warning text-warning" />;
      case 'red_card':
        return <Square className="h-4 w-4 fill-destructive text-destructive" />;
      default:
        return null;
    }
  };

  const getEventStyles = (type: MatchEvent['type']) => {
    switch (type) {
      case 'goal':
        return 'bg-secondary/10 border-secondary/30 text-secondary';
      case 'own_goal':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'yellow_card':
        return 'bg-warning/10 border-warning/30 text-warning-foreground';
      case 'red_card':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'period_start':
      case 'period_end':
        return 'bg-primary/10 border-primary/30 text-primary';
      default:
        return 'bg-muted border-border';
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

  // Group events by period
  const eventsByPeriod: Record<number, MatchEvent[]> = {};
  events.forEach(event => {
    if (!eventsByPeriod[event.period]) {
      eventsByPeriod[event.period] = [];
    }
    eventsByPeriod[event.period].push(event);
  });

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Cronaca Live
        </h3>
      </div>
      
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {Object.entries(eventsByPeriod).map(([period, periodEvents]) => (
          <div key={period}>
            {periodEvents.map((event, idx) => (
              <div
                key={event.id}
                className={cn(
                  "flex items-start gap-3 p-3 animate-slide-up",
                  idx === periodEvents.length - 1 && event.type !== 'period_end' ? 'bg-accent/50' : ''
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Time */}
                <div className="w-12 flex-shrink-0 text-right">
                  <span className="text-sm font-mono font-medium text-muted-foreground">
                    {event.type === 'period_start' ? '-' : formatTime(event.timestamp)}
                  </span>
                </div>

                {/* Icon */}
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full border flex-shrink-0",
                  getEventStyles(event.type)
                )}>
                  {getEventIcon(event.type)}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.description}</p>
                  {(event.type === 'period_end') && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {homeTeamName} {event.homeScore} - {event.awayScore} {awayTeamName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

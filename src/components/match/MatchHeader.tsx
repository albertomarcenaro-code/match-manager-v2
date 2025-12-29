import { MatchState, MatchEvent } from '@/types/match';

interface MatchHeaderProps {
  state: MatchState;
}

export function MatchHeader({ state }: MatchHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinute = (seconds: number) => {
    return `${Math.floor(seconds / 60)}'`;
  };

  // Get goals for a specific period
  const getGoalsForPeriod = (period: number): MatchEvent[] => {
    return state.events.filter(e => 
      e.period === period && (e.type === 'goal' || e.type === 'own_goal')
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      {/* Main Score Header */}
      <div className="gradient-header text-primary-foreground p-4">
        {/* Teams and Score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 text-center px-2">
            <p className="text-xs uppercase tracking-wider opacity-80">Casa</p>
            <h2 className="font-bold team-name-fluid">{state.homeTeam.name}</h2>
          </div>
          
          <div className="px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold tabular-nums">{state.homeTeam.score}</span>
              <span className="text-2xl opacity-60">-</span>
              <span className="text-4xl font-bold tabular-nums">{state.awayTeam.score}</span>
            </div>
          </div>
          
          <div className="flex-1 text-center px-2">
            <p className="text-xs uppercase tracking-wider opacity-80">Ospiti</p>
            <h2 className="font-bold team-name-fluid">{state.awayTeam.name}</h2>
          </div>
        </div>

        {/* Timer and Period Info */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider opacity-70">Tempo</p>
            <p className="font-semibold">
              {state.currentPeriod > 0 ? `${state.currentPeriod}°` : '-'}
            </p>
          </div>

          <div className="bg-primary-foreground/10 backdrop-blur px-6 py-2 rounded-lg">
            <p className={`text-3xl font-bold tabular-nums ${state.isRunning && !state.isPaused ? 'animate-pulse-ring' : ''}`}>
              {formatTime(state.elapsedTime)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-wider opacity-70">Stato</p>
            <p className="font-semibold text-sm">
              {state.isMatchEnded ? 'Terminata' : 
               state.isPaused ? 'In pausa' : 
               state.isRunning ? 'In corso' : 
               !state.isMatchStarted ? 'Da iniziare' : 'Intervallo'}
            </p>
          </div>
        </div>
      </div>

      {/* Period Scores with Scorers */}
      {state.periodScores.length > 0 && (
        <div className="p-3 bg-muted/50 space-y-3">
          {state.periodScores.map((ps) => {
            const periodGoals = getGoalsForPeriod(ps.period);
            const homeGoals = periodGoals.filter(g => 
              (g.type === 'goal' && g.team === 'home') || (g.type === 'own_goal' && g.team === 'away')
            );
            const awayGoals = periodGoals.filter(g => 
              (g.type === 'goal' && g.team === 'away') || (g.type === 'own_goal' && g.team === 'home')
            );

            return (
              <div key={ps.period} className="text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <span className="text-team-home">T{ps.period}: {ps.homeScore}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-team-away">{ps.awayScore}</span>
                </div>
                <div className="flex justify-center gap-6 mt-1 text-xs text-muted-foreground">
                  {/* Home scorers */}
                  <div className="text-left">
                    {homeGoals.map((g, i) => (
                      <span key={g.id} className="inline-flex items-center gap-1">
                        {i > 0 && ', '}
                        <span className="font-medium text-team-home">
                          {g.playerNumber} {g.playerName?.split(' ')[0]}
                        </span>
                        <span>{formatMinute(g.timestamp)}</span>
                        {g.type === 'own_goal' && <span className="text-destructive">(AG)</span>}
                      </span>
                    ))}
                  </div>
                  {/* Away scorers */}
                  <div className="text-right">
                    {awayGoals.map((g, i) => (
                      <span key={g.id} className="inline-flex items-center gap-1">
                        {i > 0 && ', '}
                        <span className="font-medium text-team-away">
                          {g.playerNumber} {g.playerName?.split(' ')[0]}
                        </span>
                        <span>{formatMinute(g.timestamp)}</span>
                        {g.type === 'own_goal' && <span className="text-destructive">(AG)</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

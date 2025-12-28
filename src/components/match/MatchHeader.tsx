import { MatchState } from '@/types/match';

interface MatchHeaderProps {
  state: MatchState;
}

export function MatchHeader({ state }: MatchHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="gradient-header text-primary-foreground p-4 rounded-xl shadow-card">
      {/* Teams and Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-wider opacity-80">Casa</p>
          <h2 className="font-bold text-lg truncate">{state.homeTeam.name}</h2>
        </div>
        
        <div className="px-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold tabular-nums">{state.homeTeam.score}</span>
            <span className="text-2xl opacity-60">-</span>
            <span className="text-4xl font-bold tabular-nums">{state.awayTeam.score}</span>
          </div>
        </div>
        
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-wider opacity-80">Ospiti</p>
          <h2 className="font-bold text-lg truncate">{state.awayTeam.name}</h2>
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

      {/* Period Scores */}
      {state.periodScores.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary-foreground/20">
          <div className="flex justify-center gap-4 text-xs">
            {state.periodScores.map((ps) => (
              <div key={ps.period} className="text-center opacity-80">
                <span className="block font-medium">{ps.period}° tempo</span>
                <span>{ps.homeScore} - {ps.awayScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

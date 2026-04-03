import { useState, ReactNode } from 'react';
import { Play, Pause, Flag, StopCircle, RotateCcw, Timer } from 'lucide-react';
import { MatchState } from '@/types/match';
import { PeriodDurationDialog } from './PeriodDurationDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  state: MatchState;
  onStartPeriod: (duration: number) => void;
  onPause: () => void;
  onResume: () => void;
  onEndPeriod: () => void;
  onEndMatch: () => void;
  onUndo: () => void;
}

interface CircleButtonProps {
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  color: 'green' | 'gray' | 'red' | 'outline' | 'overtime';
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
  children?: ReactNode;
}

const colorMap = {
  green: 'bg-secondary text-secondary-foreground shadow-md',
  gray: 'bg-muted-foreground text-white shadow-md',
  red: 'bg-destructive text-destructive-foreground shadow-md',
  outline: 'bg-card text-foreground border-2 border-border shadow-md',
  overtime: 'bg-destructive text-destructive-foreground shadow-md animate-pulse',
};

function CircleButton({ onClick, icon, label, color, disabled, className, asChild, children }: CircleButtonProps) {
  const Wrapper = asChild ? 'div' : 'button';
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
      {asChild ? (
        <div className="flex flex-col items-center gap-1.5">
          {children}
          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
        </div>
      ) : (
        <>
          <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 disabled:opacity-40 disabled:pointer-events-none',
              colorMap[color],
              className
            )}
          >
            {icon}
          </button>
          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
        </>
      )}
    </div>
  );
}

export function TimerControls({
  state,
  onStartPeriod,
  onPause,
  onResume,
  onEndPeriod,
  onEndMatch,
  onUndo,
}: TimerControlsProps) {
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);

  const canStartPeriod = !state.isRunning && !state.isMatchEnded && !state.needsStarterSelection;
  const canEndPeriod = state.isRunning;
  const hasEvents = state.events.length > 0;
  const isOvertime = state.elapsedTime >= state.periodDuration * 60;
  const showEndMatch = canEndPeriod || (!state.isRunning && state.isMatchStarted && !state.isMatchEnded);

  const handleStartClick = () => {
    setDurationDialogOpen(true);
  };

  const handleDurationConfirm = (duration: number) => {
    onStartPeriod(duration);
  };

  return (
    <div className="p-3 bg-card rounded-xl shadow-card space-y-2">
      <div className="flex flex-row justify-around items-start w-full">
        {/* Start / Play / Pause */}
        {!state.isRunning && canStartPeriod && (
          <CircleButton
            onClick={handleStartClick}
            icon={<Play className="h-6 w-6 ml-0.5" />}
            label={state.currentPeriod === 0 ? 'Inizia' : `${state.currentPeriod + 1}° tempo`}
            color="green"
          />
        )}

        {state.isRunning && !state.isPaused && (
          <CircleButton
            onClick={onPause}
            icon={<Pause className="h-6 w-6" />}
            label="Pausa"
            color="green"
          />
        )}

        {state.isRunning && state.isPaused && (
          <CircleButton
            onClick={onResume}
            icon={<Play className="h-6 w-6 ml-0.5" />}
            label="Riprendi"
            color="green"
          />
        )}

        {/* End Period */}
        {canEndPeriod && (
          <CircleButton asChild label="" color={isOvertime ? 'overtime' : 'gray'}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90',
                      isOvertime ? colorMap.overtime : colorMap.gray
                    )}
                  >
                    <Timer className="h-6 w-6" />
                  </button>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                    {isOvertime ? 'Ferma' : 'Fine tempo'}
                  </span>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminare il {state.currentPeriod}° tempo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Il tempo verrà registrato con il punteggio attuale: {state.homeTeam.score} - {state.awayTeam.score}
                    {isOvertime && (
                      <span className="block mt-2 text-destructive font-medium">
                        Tempo regolamentare superato di {Math.floor((state.elapsedTime - state.periodDuration * 60) / 60)} minuti
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={onEndPeriod}>Conferma</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CircleButton>
        )}

        {/* End Match */}
        {showEndMatch && (
          <CircleButton asChild label="" color="red">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex flex-col items-center gap-1.5">
                  <button className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90',
                    colorMap.red
                  )}>
                    <StopCircle className="h-6 w-6" />
                  </button>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">Fine partita</span>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminare la partita?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La partita verrà conclusa con il punteggio finale: {state.homeTeam.score} - {state.awayTeam.score}
                    {state.isRunning && (
                      <span className="block mt-2 text-muted-foreground">
                        Il tempo corrente verrà automaticamente concluso.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (state.isRunning) {
                        onEndPeriod();
                      }
                      onEndMatch();
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Termina partita
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CircleButton>
        )}

        {/* Undo */}
        {hasEvents && !state.isMatchEnded && (
          <CircleButton asChild label="" color="outline">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex flex-col items-center gap-1.5">
                  <button className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90',
                    colorMap.outline
                  )}>
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">Annulla</span>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annullare l'ultimo evento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'ultimo evento registrato verrà rimosso dalla cronaca.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No</AlertDialogCancel>
                  <AlertDialogAction onClick={onUndo}>Sì, annulla</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CircleButton>
        )}
      </div>

      {/* Status Messages */}
      {state.needsStarterSelection && !state.isMatchEnded && (
        <p className="w-full text-center text-sm text-muted-foreground">
          Seleziona i titolari per {state.currentPeriod === 0 ? 'iniziare' : 'continuare'}
        </p>
      )}

      {state.isMatchEnded && (
        <p className="w-full text-center text-sm font-semibold text-secondary">
          Partita terminata
        </p>
      )}

      <PeriodDurationDialog
        isOpen={durationDialogOpen}
        onClose={() => setDurationDialogOpen(false)}
        onConfirm={handleDurationConfirm}
        currentPeriod={state.currentPeriod}
        defaultDuration={state.periodDuration}
      />
    </div>
  );
}

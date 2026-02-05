import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Flag, StopCircle, RotateCcw } from 'lucide-react';
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
  
  // Check if we're in overtime (elapsed time >= period duration)
  const isOvertime = state.elapsedTime >= state.periodDuration * 60;

  const handleStartClick = () => {
    setDurationDialogOpen(true);
  };

  const handleDurationConfirm = (duration: number) => {
    onStartPeriod(duration);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-card rounded-xl shadow-card">
      {/* Start/Resume Period */}
      {!state.isRunning && canStartPeriod && (
        <Button
          onClick={handleStartClick}
          className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          size="lg"
        >
          <Play className="h-5 w-5" />
          {state.currentPeriod === 0 ? 'Inizia partita' : `Inizia ${state.currentPeriod + 1}° tempo`}
        </Button>
      )}

      {/* Pause/Resume */}
      {state.isRunning && (
        <>
          {state.isPaused ? (
            <Button
              onClick={onResume}
              className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              size="lg"
            >
              <Play className="h-5 w-5" />
              Riprendi
            </Button>
          ) : (
            <Button
              onClick={onPause}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Pause className="h-5 w-5" />
              Pausa
            </Button>
          )}
        </>
      )}

      {/* End Period - Text changes when in overtime */}
      {canEndPeriod && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant={isOvertime ? "destructive" : "outline"} 
              size="lg" 
              className={cn(
                "gap-2",
                isOvertime && "animate-pulse"
              )}
            >
              <Flag className="h-5 w-5" />
              {isOvertime ? "Ferma tempo" : "Fine tempo"}
            </Button>
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
              <AlertDialogAction onClick={onEndPeriod}>
                Conferma
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* End Match - separate button */}
      {(canEndPeriod || (!state.isRunning && state.isMatchStarted && !state.isMatchEnded)) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="lg" className="gap-2">
              <StopCircle className="h-5 w-5" />
              Fine partita
            </Button>
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
                  // If period is running, end it first, then end match
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
      )}

      {/* Undo */}
      {hasEvents && !state.isMatchEnded && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="lg" className="gap-2">
              <RotateCcw className="h-5 w-5" />
              Annulla ultimo
            </Button>
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
              <AlertDialogAction onClick={onUndo}>
                Sì, annulla
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Match Status Messages */}
      {state.needsStarterSelection && !state.isMatchEnded && (
        <p className="w-full text-center text-sm text-muted-foreground mt-2">
          Seleziona i titolari per {state.currentPeriod === 0 ? 'iniziare' : 'continuare'}
        </p>
      )}
      
      {state.isMatchEnded && (
        <p className="w-full text-center text-sm font-semibold text-secondary mt-2">
          Partita terminata
        </p>
      )}

      {/* Period Duration Dialog */}
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

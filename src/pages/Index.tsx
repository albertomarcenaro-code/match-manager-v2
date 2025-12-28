import { useState } from 'react';
import { useMatch } from '@/hooks/useMatch';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TimerControls } from '@/components/match/TimerControls';
import { TeamPanel } from '@/components/match/TeamPanel';
import { EventTimeline } from '@/components/match/EventTimeline';
import { StarterSelection } from '@/components/match/StarterSelection';
import { ExportButton } from '@/components/match/ExportButton';
import { MatchSettings } from '@/components/match/MatchSettings';
import { Button } from '@/components/ui/button';
import { RotateCcw, Edit } from 'lucide-react';
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
import { Helmet } from 'react-helmet';

type AppPhase = 'setup' | 'match';

const Index = () => {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    setStarters,
    confirmStarters,
    setPeriodDuration,
    setTotalPeriods,
    undoLastEvent,
    startPeriod,
    pauseTimer,
    resumeTimer,
    endPeriod,
    recordGoal,
    recordOwnGoal,
    recordSubstitution,
    recordCard,
    resetMatch,
  } = useMatch();

  const handleRosterComplete = () => {
    setPhase('match');
  };

  const handleStartersConfirm = (homeStarters: string[], awayStarters: string[]) => {
    setStarters(homeStarters, true);
    setStarters(awayStarters, false);
    confirmStarters();
  };

  const handleNewMatch = () => {
    resetMatch();
    setPhase('setup');
  };

  if (phase === 'setup') {
    return (
      <>
        <Helmet>
          <title>Gestione Partita - Calcio Giovanile</title>
          <meta name="description" content="Applicazione per la gestione in tempo reale degli eventi durante partite di calcio giovanile. Traccia gol, sostituzioni, cartellini e cronaca live." />
        </Helmet>
        <RosterSetup
          homeTeamName={state.homeTeam.name}
          awayTeamName={state.awayTeam.name}
          homePlayers={state.homeTeam.players}
          awayPlayers={state.awayTeam.players}
          onHomeTeamNameChange={setHomeTeamName}
          onAwayTeamNameChange={setAwayTeamName}
          onAddPlayer={addPlayer}
          onUpdatePlayerNumber={updatePlayerNumber}
          onRemovePlayer={removePlayer}
          onAddOpponentPlayer={addOpponentPlayer}
          onRemoveOpponentPlayer={removeOpponentPlayer}
          onComplete={handleRosterComplete}
        />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{state.homeTeam.name} vs {state.awayTeam.name} - Partita in Corso</title>
        <meta name="description" content={`Segui la partita ${state.homeTeam.name} contro ${state.awayTeam.name}. Cronaca live e gestione eventi.`} />
      </Helmet>
      <main className="min-h-screen bg-background p-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase('setup')}
              disabled={state.isRunning}
              className="gap-1"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Modifica rose</span>
            </Button>

            <div className="flex items-center gap-2">
              <MatchSettings
                periodDuration={state.periodDuration}
                totalPeriods={state.totalPeriods}
                onPeriodDurationChange={setPeriodDuration}
                onTotalPeriodsChange={setTotalPeriods}
                disabled={state.isMatchStarted}
              />
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Nuova partita?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tutti i dati della partita corrente verranno persi. Vuoi continuare?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleNewMatch}>
                      Nuova partita
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Match Header */}
          <MatchHeader state={state} />

          {/* Starter Selection or Match Content */}
          {state.needsStarterSelection && !state.isMatchEnded ? (
            <StarterSelection
              homePlayers={state.homeTeam.players}
              awayPlayers={state.awayTeam.players}
              period={state.currentPeriod}
              onConfirm={handleStartersConfirm}
            />
          ) : (
            <>
              {/* Timer Controls */}
              <TimerControls
                state={state}
                onStartPeriod={startPeriod}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onEndPeriod={endPeriod}
                onUndo={undoLastEvent}
              />

              {/* Team Panels */}
              <div className="grid md:grid-cols-2 gap-4">
                <TeamPanel
                  teamName={state.homeTeam.name}
                  players={state.homeTeam.players.filter(p => p.number !== null)}
                  isHome={true}
                  isRunning={state.isRunning && !state.isPaused}
                  onGoal={(id) => recordGoal('home', id)}
                  onOwnGoal={(id) => recordOwnGoal('home', id)}
                  onSubstitution={(outId, inId) => recordSubstitution('home', outId, inId)}
                  onYellowCard={(id) => recordCard('home', id, 'yellow')}
                  onRedCard={(id) => recordCard('home', id, 'red')}
                />

                <TeamPanel
                  teamName={state.awayTeam.name}
                  players={state.awayTeam.players}
                  isHome={false}
                  isRunning={state.isRunning && !state.isPaused}
                  onGoal={(id) => recordGoal('away', id)}
                  onOwnGoal={(id) => recordOwnGoal('away', id)}
                  onSubstitution={(outId, inId) => recordSubstitution('away', outId, inId)}
                  onYellowCard={(id) => recordCard('away', id, 'yellow')}
                  onRedCard={(id) => recordCard('away', id, 'red')}
                />
              </div>

              {/* Event Timeline */}
              <EventTimeline
                events={state.events}
                homeTeamName={state.homeTeam.name}
                awayTeamName={state.awayTeam.name}
              />

              {/* Export Button */}
              {state.isMatchEnded && (
                <div className="flex justify-center pt-4">
                  <ExportButton state={state} />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Index;

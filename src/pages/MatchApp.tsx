import { useState } from 'react';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/contexts/AuthContext';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TimerControls } from '@/components/match/TimerControls';
import { TeamPanel } from '@/components/match/TeamPanel';
import { EventTimeline } from '@/components/match/EventTimeline';
import { StarterSelection } from '@/components/match/StarterSelection';
import { ExportButton } from '@/components/match/ExportButton';
import { MatchSettings } from '@/components/match/MatchSettings';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { RotateCcw, Edit, LogOut } from 'lucide-react';
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
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type AppPhase = 'setup' | 'starterSelection' | 'match';

const MatchApp = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut, exitGuest } = useAuth();
  const [phase, setPhase] = useState<AppPhase>('setup');
  const {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    bulkAddPlayers,
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
    endMatch,
    recordGoal,
    recordOwnGoal,
    recordSubstitution,
    recordCard,
    resetMatch,
    forceStarterSelection,
  } = useMatch();

  const handleRosterComplete = () => {
    forceStarterSelection();
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

  const handleLogout = async () => {
    if (isGuest) {
      exitGuest();
    } else {
      await signOut();
    }
    toast.success('Disconnesso');
    navigate('/');
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Helmet>
          <title>Gestione Partita - Match Manager Live</title>
          <meta name="description" content="Applicazione per la gestione in tempo reale degli eventi durante partite di calcio giovanile. Traccia gol, sostituzioni, cartellini e cronaca live." />
        </Helmet>
        <div className="flex-1">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                {isGuest ? (
                  <span className="flex items-center gap-1">
                    🎭 Modalità Ospite
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    👤 {user?.email}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
                <LogOut className="h-4 w-4" />
                Esci
              </Button>
            </div>
          </div>
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
            onBulkAddPlayers={bulkAddPlayers}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Helmet>
        <title>{state.homeTeam.name || 'Casa'} vs {state.awayTeam.name || 'Ospite'} - Partita in Corso</title>
        <meta name="description" content={`Segui la partita ${state.homeTeam.name} contro ${state.awayTeam.name}. Cronaca live e gestione eventi.`} />
      </Helmet>
      <main className="flex-1 bg-background p-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
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
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

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
                onEndMatch={endMatch}
                onUndo={undoLastEvent}
              />

              {/* Team Panels */}
              <div className="grid grid-cols-2 gap-3">
                <TeamPanel
                  teamName={state.homeTeam.name}
                  players={state.homeTeam.players.filter(p => p.number !== null)}
                  isHome={true}
                  isRunning={state.isRunning && !state.isPaused}
                  events={state.events}
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
                  events={state.events}
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
      <Footer />
    </div>
  );
};

export default MatchApp;

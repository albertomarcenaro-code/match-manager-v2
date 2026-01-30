import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TimerControls } from '@/components/match/TimerControls';
import { TeamPanel } from '@/components/match/TeamPanel';
import { StarterSelection } from '@/components/match/StarterSelection';
import { Footer } from '@/components/layout/Footer';

const MatchApp = () => {
  const { id } = useParams();
  const [phase, setPhase] = useState<'setup' | 'match'>('setup');
  
  // 1. ESTRAIAMO TUTTE LE FUNZIONI REALI DALL'HOOK (Quelle che abbiamo appena scritto in useMatch)
  const {
    state, 
    setHomeTeamName, 
    setAwayTeamName, 
    addPlayer,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    bulkAddPlayers,
    swapTeams,
    createPlayersWithNumbers,
    setStarters, 
    confirmStarters, 
    startPeriod, 
    pauseTimer, 
    resumeTimer, 
    recordGoal, 
    recordCard, 
    resetMatch, 
    forceStarterSelection
  } = useMatch();

  const handleRosterComplete = useCallback(() => {
    forceStarterSelection();
    setPhase('match');
  }, [forceStarterSelection]);

  if (!state) return <div className="p-20 text-center">Inizializzazione...</div>;

  // --- FASE DI SETUP (Pulsanti Rose) ---
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          <RosterSetup
            homeTeamName={state.homeTeam.name}
            awayTeamName={state.awayTeam.name}
            homePlayers={state.homeTeam.players}
            awayPlayers={state.awayTeam.players}
            onHomeTeamNameChange={setHomeTeamName}
            onAwayTeamNameChange={setAwayTeamName}
            onComplete={handleRosterComplete}
            // 2. COLLEGIAMO I PULSANTI ALLE FUNZIONI REALI (Niente più "() => {}")
            onAddPlayer={addPlayer}
            onUpdatePlayerNumber={updatePlayerNumber}
            onRemovePlayer={removePlayer}
            onAddOpponentPlayer={addOpponentPlayer}
            onRemoveOpponentPlayer={removeOpponentPlayer}
            onBulkAddPlayers={bulkAddPlayers}
            onSwapTeams={swapTeams}
            onCreatePlayersWithNumbers={createPlayersWithNumbers}
          />
        </main>
        <Footer />
      </div>
    );
  }

  // --- FASE DI MATCH ---
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full space-y-4">
        <MatchHeader state={state} />
        {state.needsStarterSelection ? (
          <StarterSelection
            homePlayers={state.homeTeam.players}
            awayPlayers={state.awayTeam.players}
            onConfirm={(h, a) => {
              setStarters(h, true);
              setStarters(a, false);
              confirmStarters();
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <TimerControls
                isRunning={state.isRunning}
                isPaused={state.isPaused}
                elapsedTime={state.elapsedTime}
                onStartPeriod={startPeriod}
                onPauseTimer={pauseTimer}
                onResumeTimer={resumeTimer}
                isMatchStarted={state.isMatchStarted}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TeamPanel
                  team="home"
                  name={state.homeTeam.name}
                  players={state.homeTeam.players}
                  onGoal={(pid) => recordGoal('home', pid)}
                  onCard={(pid, type) => recordCard('home', pid, type)}
                />
                <TeamPanel
                  team="away"
                  name={state.awayTeam.name}
                  players={state.awayTeam.players}
                  onGoal={(pid) => recordGoal('away', pid)}
                  onCard={(pid, type) => recordCard('away', pid, type)}
                />
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MatchApp;

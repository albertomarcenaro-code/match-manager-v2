import { useState, useCallback, useEffect, useRef } from 'react';
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
  const timerRef = useRef<number | null>(null);
  
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
    endPeriod,
    endMatch,
    recordGoal,
    recordOwnGoal,
    recordCard,
    recordSubstitution,
    resetMatch, 
    forceStarterSelection,
    undoLastEvent,
    addPlayerToMatch
  } = useMatch();

  // Timer effect
  useEffect(() => {
    if (state?.isRunning && !state?.isPaused) {
      timerRef.current = window.setInterval(() => {
        // Update elapsed time (handled internally by state)
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state?.isRunning, state?.isPaused]);

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
            period={state.currentPeriod}
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
                state={state}
                onStartPeriod={startPeriod}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onEndPeriod={endPeriod}
                onEndMatch={endMatch}
                onUndo={undoLastEvent}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TeamPanel
                  teamName={state.homeTeam.name}
                  players={state.homeTeam.players}
                  isHome={true}
                  isRunning={state.isRunning}
                  events={state.events}
                  isMatchEnded={state.isMatchEnded}
                  onGoal={(pid) => recordGoal('home', pid)}
                  onOwnGoal={(pid) => recordOwnGoal('home', pid)}
                  onSubstitution={(outId, inId) => recordSubstitution('home', outId, inId)}
                  onYellowCard={(pid) => recordCard('home', pid, 'yellow')}
                  onRedCard={(pid) => recordCard('home', pid, 'red')}
                  onAddPlayer={(name, number) => addPlayerToMatch('home', name, number)}
                />
                <TeamPanel
                  teamName={state.awayTeam.name}
                  players={state.awayTeam.players}
                  isHome={false}
                  isRunning={state.isRunning}
                  events={state.events}
                  isMatchEnded={state.isMatchEnded}
                  onGoal={(pid) => recordGoal('away', pid)}
                  onOwnGoal={(pid) => recordOwnGoal('away', pid)}
                  onSubstitution={(outId, inId) => recordSubstitution('away', outId, inId)}
                  onYellowCard={(pid) => recordCard('away', pid, 'yellow')}
                  onRedCard={(pid) => recordCard('away', pid, 'red')}
                  onAddPlayer={(name, number) => addPlayerToMatch('away', name, number)}
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

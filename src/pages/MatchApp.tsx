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
  
  const {
    state, setHomeTeamName, setAwayTeamName, addPlayer,
    setStarters, confirmStarters, startPeriod, pauseTimer, 
    resumeTimer, recordGoal, recordCard, resetMatch, forceStarterSelection
  } = useMatch();

  const handleRosterComplete = useCallback(() => {
    forceStarterSelection();
    setPhase('match');
  }, [forceStarterSelection]);

  if (!state) return <div className="p-20 text-center">Inizializzazione...</div>;

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Abbiamo tolto l'Header temporaneamente per testare */}
        <main className="flex-1">
          <RosterSetup
            homeTeamName={state.homeTeam.name}
            awayTeamName={state.awayTeam.name}
            homePlayers={state.homeTeam.players}
            awayPlayers={state.awayTeam.players}
            onHomeTeamNameChange={setHomeTeamName}
            onAwayTeamNameChange={setAwayTeamName}
            onAddPlayer={addPlayer}
            onComplete={handleRosterComplete}
            // Funzioni dummy per evitare crash di props mancanti
            onUpdatePlayerNumber={() => {}} 
            onRemovePlayer={() => {}}
            onAddOpponentPlayer={() => {}}
            onRemoveOpponentPlayer={() => {}}
            onBulkAddPlayers={() => {}}
            onSwapTeams={() => {}}
            onCreatePlayersWithNumbers={() => {}}
          />
        </main>
        <Footer />
      </div>
    );
  }

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

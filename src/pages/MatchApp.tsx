import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // <--- AGGIUNTO: Necessario per leggere l'ID
import { useMatch } from '@/hooks/useMatch';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TimerControls } from '@/components/match/TimerControls';
import { TeamPanel } from '@/components/match/TeamPanel';
import { StarterSelection } from '@/components/match/StarterSelection';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const MatchApp = () => {
  const { id } = useParams(); // <--- AGGIUNTO: Legge l'ID dall'URL (es: quick-12345)
  const [phase, setPhase] = useState<'setup' | 'match'>('setup');
  
  const {
    state, setHomeTeamName, setAwayTeamName, addPlayer,
    setStarters, confirmStarters, startPeriod, pauseTimer, 
    resumeTimer, recordGoal, recordCard, resetMatch, forceStarterSelection
  } = useMatch();

  // Logica per gestire il tipo di partita in base all'ID
  useEffect(() => {
    if (id && id.startsWith('quick-')) {
      console.log("Inizializzazione Partita Rapida:", id);
      // Qui potresti resettare il match se vuoi essere sicuro che sia pulito
      // resetMatch(); 
    }
  }, [id]);

  const handleRosterComplete = useCallback(() => {
    forceStarterSelection();
    setPhase('match');
  }, [forceStarterSelection]);

  // Se l'ID non è presente (molto raro con le nostre nuove rotte), mostra caricamento
  if (!id) return <div className="p-20 text-center">Caricamento partita...</div>;

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <RosterSetup
          homeTeamName={state.homeTeam.name}
          awayTeamName={state.awayTeam.name}
          homePlayers={state.homeTeam.players}
          awayPlayers={state.awayTeam.players}
          onHomeTeamNameChange={setHomeTeamName}
          onAwayTeamNameChange={setAwayTeamName}
          onAddPlayer={addPlayer}
          onComplete={handleRosterComplete}
          onUpdatePlayerNumber={() => {}} 
          onRemovePlayer={() => {}}
          onAddOpponentPlayer={() => {}}
          onRemoveOpponentPlayer={() => {}}
          onBulkAddPlayers={() => {}}
          onSwapTeams={() => {}}
          onCreatePlayersWithNumbers={() => {}}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full space-y-4">
        {/* Mostriamo un piccolo badge se è una partita rapida (opzionale) */}
        {id.startsWith('quick-') && (
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded">
            Partita Rapida
          </div>
        )}

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
                onResumeTimer={onResumeTimer}
                isMatchStarted={state.isMatchStarted}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TeamPanel
                  team="home"
                  name={state.homeTeam.name}
                  players={state.homeTeam.players}
                  onGoal={(playerId) => recordGoal('home', playerId)}
                  onCard={(playerId, type) => recordCard('home', playerId, type)}
                />
                <TeamPanel
                  team="away"
                  name={state.awayTeam.name}
                  players={state.awayTeam.players}
                  onGoal={(playerId) => recordGoal('away', playerId)}
                  onCard={(playerId, type) => recordCard('away', playerId, type)}
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

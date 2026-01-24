import { useState, useEffect, useCallback } from 'react';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournament';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TimerControls } from '@/components/match/TimerControls';
import { TeamPanel } from '@/components/match/TeamPanel';
import { EventTimeline } from '@/components/match/EventTimeline';
import { StarterSelection } from '@/components/match/StarterSelection';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useNavigate, useLocation } from 'react-router-dom';

const MatchApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Rimossa isGuest se non usata direttamente qui, altrimenti riaggiungila
  const { tournament, startTournament } = useTournament();
  const [phase, setPhase] = useState<'setup' | 'match'>('setup');
  const [pendingTournamentName, setPendingTournamentName] = useState<string | null>(null);
  
  const {
    state, setHomeTeamName, setAwayTeamName, addPlayer, bulkAddPlayers,
    createPlayersWithNumbers, updatePlayerNumber, removePlayer, addOpponentPlayer,
    removeOpponentPlayer, setStarters, confirmStarters, 
    // setPeriodDuration, setTotalPeriods, (aggiungi se servono settings)
    undoLastEvent, startPeriod, pauseTimer, resumeTimer,
    endPeriod, endMatch, recordGoal, recordOwnGoal, recordSubstitution,
    recordCard, resetMatch, forceStarterSelection, swapTeams,
  } = useMatch();

  // Gestione stato iniziale da navigazione
  useEffect(() => {
    const navState = location.state as any;
    if (navState?.mode === 'single') {
      setPendingTournamentName(null);
      // Se il match è già iniziato tecnicamente, vai subito al match
      setPhase(state.isMatchStarted ? 'match' : 'setup');
    } else if (navState?.mode === 'tournament') {
      if (navState.createTournament) setPendingTournamentName(navState.tournamentName);
      setPhase(state.isMatchStarted ? 'match' : 'setup');
    }
  }, [location.state, state.isMatchStarted]);

  const isTournamentActive = !!(tournament?.isActive || pendingTournamentName);

  // Funzione corretta e stabilizzata per il passaggio alla fase Match
  const handleRosterComplete = useCallback(() => {
    if (pendingTournamentName) {
      const players = state.homeTeam.players.map(p => ({ name: p.name, number: p.number }));
      startTournament(pendingTournamentName, state.homeTeam.name, players);
      setPendingTournamentName(null);
    }
    
    // 1. Assicuriamo che l'hook sappia che servono i titolari
    forceStarterSelection();
    
    // 2. Cambiamo la visualizzazione
    setPhase('match');
  }, [pendingTournamentName, state.homeTeam, forceStarterSelection, startTournament, setPendingTournamentName]);

  const handleNewMatch = () => {
    resetMatch(isTournamentActive);
    setPhase('setup');
  };

  // --- RENDER: FASE SETUP (ROSE) ---
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
          onUpdatePlayerNumber={updatePlayerNumber}
          onRemovePlayer={removePlayer}
          onAddOpponentPlayer={addOpponentPlayer}
          onRemoveOpponentPlayer={removeOpponentPlayer}
          onComplete={handleRosterComplete}
          onBulkAddPlayers={bulkAddPlayers}
          onSwapTeams={swapTeams}
          onCreatePlayersWithNumbers={createPlayersWithNumbers}
          isTournamentMode={isTournamentActive}
        />
        <Footer />
      </div>
    );

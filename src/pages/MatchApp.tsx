import { useState, useEffect, useCallback } from 'react';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/contexts/AuthContext';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useTournament } from '@/hooks/useTournament';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TimerControls } from '@/components/match/TimerControls';
import { TeamPanel } from '@/components/match/TeamPanel';
import { EventTimeline } from '@/components/match/EventTimeline';
import { StarterSelection } from '@/components/match/StarterSelection';
import { ExportButton } from '@/components/match/ExportButton';
import { PDFExportButton } from '@/components/match/PDFExportButton';
import { WhatsAppShareButton } from '@/components/match/WhatsAppShareButton';
import { MatchSettings } from '@/components/match/MatchSettings';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { RotateCcw, Edit, Home, Check } from 'lucide-react';
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
import { useNavigate, useLocation } from 'react-router-dom';
import { TournamentPlayerMatchStats } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';

const MatchApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const { tournament, addMatchToTournament, startTournament } = useTournament();
  const [phase, setPhase] = useState<'setup' | 'match'>('setup');
  const [matchSavedToTournament, setMatchSavedToTournament] = useState(false);
  const [pendingTournamentName, setPendingTournamentName] = useState<string | null>(null);
  
  const {
    state, setHomeTeamName, setAwayTeamName, addPlayer, bulkAddPlayers,
    createPlayersWithNumbers, updatePlayerNumber, removePlayer, addOpponentPlayer,
    removeOpponentPlayer, setStarters, confirmStarters, setPeriodDuration,
    setTotalPeriods, undoLastEvent, startPeriod, pauseTimer, resumeTimer,
    endPeriod, endMatch, recordGoal, recordOwnGoal, recordSubstitution,
    recordCard, resetMatch, forceStarterSelection, swapTeams,
  } = useMatch();

  useEffect(() => {
    const navState = location.state as any;
    if (navState?.mode === 'single') {
      setPendingTournamentName(null);
      setPhase(state.isMatchStarted ? 'match' : 'setup');
    } else if (navState?.mode === 'tournament') {
      if (navState.createTournament) setPendingTournamentName(navState.tournamentName);
      setPhase(state.isMatchStarted ? 'match' : 'setup');
    }
  }, []);

  const isTournamentActive = !!(tournament?.isActive || pendingTournamentName);

  const handleRosterComplete = () => {
    if (pendingTournamentName) {
      const players = state.homeTeam.players.map(p => ({ name: p.name, number: p.number }));
      startTournament(pendingTournamentName, state.homeTeam.name, players);
      setPendingTournamentName(null);
    }
    forceStarterSelection();
    setPhase('match');
  };

  const handleNewMatch = () => {
    resetMatch(isTournamentActive);
    setPhase('setup');
  };

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
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full space-y-4">
        <MatchHeader state={state} isTournamentMode={isTournamentActive} />
        
        {state.needsStarterSelection && !state.isMatchEnded ? (
          <StarterSelection
            homePlayers={state.homeTeam.players}
            awayPlayers={state.awayTeam.players}
            period={state.currentPeriod}
            onConfirm={(h, a) => { setStarters(h, true); setStarters(a, false); confirmStarters(); }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <TimerControls
                isRunning={state.isRunning}
                isPaused={state.isPaused}
                elapsedTime={state.elapsedTime}
                currentPeriod={state.currentPeriod}
                totalPeriods={state.totalPeriods}
                periodDuration={state.periodDuration}
                isMatchStarted={state.isMatchStarted}
                isMatchEnded={state.isMatchEnded}
                onStartPeriod={startPeriod}
                onPauseTimer={pauseTimer}
                onResumeTimer={resumeTimer}
                onEndPeriod={endPeriod}
                onEndMatch={endMatch}
                onUndo={undoLastEvent}
                hasEvents={state.events.length > 0}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TeamPanel
                  team="home"
                  name={state.homeTeam.name}
                  players={state.homeTeam.players}
                  onGoal={(id) => recordGoal(id, 'home')}
                  onOwnGoal={(id) => recordOwnGoal(id, 'home')}
                  onCard={(id, type) => recordCard(id, 'home', type)}
                  onSubstitution={(out, inv) => recordSubstitution(out, inv, 'home')}
                  disabled={!state.isRunning || state.isPaused}
                />
                <TeamPanel
                  team="away"
                  name={state.awayTeam.name}
                  players={state.awayTeam.players}
                  onGoal={(id) => recordGoal(id, 'away')}
                  onOwnGoal={(id) => recordOwnGoal(id, 'away')}
                  onCard={(id, type) => recordCard(id, 'away', type)}
                  onSubstitution={(out, inv) => recordSubstitution(out, inv, 'away')}
                  disabled={!state.isRunning || state.isPaused}
                />
              </div>
            </div>
            <div className="lg:col-span-4">
              <EventTimeline events={state.events} onUndo={undoLastEvent} />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MatchApp;

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

type AppPhase = 'setup' | 'starterSelection' | 'match';

const MatchApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const { tournament, addMatchToTournament, startTournament } = useTournament();
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [matchSavedToTournament, setMatchSavedToTournament] = useState(false);
  const [pendingTournamentName, setPendingTournamentName] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  const {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    bulkAddPlayers,
    createPlayersWithNumbers,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    addHomePlayerWithNumber,
    addAwayPlayerWithNumber,
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
    swapTeams,
  } = useMatch();

  // Verifica lo stato di sincronizzazione
  useEffect(() => {
    const checkSync = async () => {
      if (!user || isGuest) {
        setSyncStatus('disconnected');
        return;
      }
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        setSyncStatus(error ? 'disconnected' : 'connected');
      } catch {
        setSyncStatus('disconnected');
      }
    };
    checkSync();
    const interval = setInterval(checkSync, 30000);
    return () => clearInterval(interval);
  }, [user, isGuest]);

  // GESTIONE LOGICA MODALITÀ (Torneo vs Singola)
  useEffect(() => {
    const navState = location.state as { mode?: string; resume?: boolean; createTournament?: boolean; tournamentName?: string } | null;
    
    if (navState?.mode === 'single') {
      // FORZATURA: Se entriamo in modalità singola, resettiamo ogni riferimento a tornei attivi
      // per evitare che l'header mostri dati sporchi
      setPendingTournamentName(null);
      if (!state.isMatchStarted) {
        setPhase('setup');
      } else {
        setPhase('match');
      }
    } else if (navState?.mode === 'tournament') {
      if (navState.createTournament && navState.tournamentName) {
        setPendingTournamentName(navState.tournamentName);
      }
      setPhase(state.isMatchStarted ? 'match' : 'setup');
    } else if (navState?.resume && state.isMatchStarted) {
      setPhase('match');
    }
    
    if (navState) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Determiniamo se siamo DAVVERO in un torneo per passare l'info ai componenti figli
  const isTournamentActive = tournament.isActive || !!pendingTournamentName;

  const calculatePlayerStats = useCallback((): TournamentPlayerMatchStats[] => {
    const playerStats: TournamentPlayerMatchStats[] = [];
    const periodsPlayed = state.periodScores.length > 0 
      ? Math.max(...state.periodScores.map(ps => ps.period))
      : state.currentPeriod;

    state.homeTeam.players.forEach(player => {
      let goals = 0;
      let minutes = 0;
      let yellowCards = 0;
      let redCards = 0;

      state.events.forEach(e => {
        if (e.team === 'home' && e.playerId === player.id) {
          if (e.type === 'goal') goals++;
          if (e.type === 'yellow_card') yellowCards++;
          if (e.type === 'red_card') redCards++;
        }
      });

      for (let period = 1; period <= periodsPlayed; period++) {
        const periodEvents = state.events.filter(e => e.period === period);
        const periodStart = periodEvents.find(e => e.type === 'period_start');
        const periodEnd = periodEvents.find(e => e.type === 'period_end');
        if (!periodStart) continue;
        
        const periodDurationSeconds = periodEnd 
          ? periodEnd.timestamp 
          : (period === state.currentPeriod ? state.elapsedTime : state.periodDuration * 60);

        let onFieldAtStart = false;
        let entryTime = 0;
        
        if (period === 1) {
          onFieldAtStart = player.isStarter;
        } else {
          let onField = player.isStarter;
          const prevEvents = state.events.filter(e => e.period < period);
          prevEvents.forEach(event => {
            if (event.type === 'substitution' && event.team === 'home') {
              if (event.playerOutId === player.id) onField = false;
              if (event.playerInId === player.id) onField = true;
            }
            if (event.type === 'red_card' && event.team === 'home' && event.playerId === player.id) {
              onField = false;
            }
          });
          onFieldAtStart = onField;
        }

        let wasOnFieldThisPeriod = onFieldAtStart;
        let exitTime = periodDurationSeconds;

        periodEvents.forEach(event => {
          if (event.type === 'substitution' && event.team === 'home') {
            if (event.playerOutId === player.id) {
              if (wasOnFieldThisPeriod) exitTime = event.timestamp;
              wasOnFieldThisPeriod = false;
            }
            if (event.playerInId === player.id) wasOnFieldThisPeriod = true;
          }
          if (event.type === 'red_card' && event.team === 'home' && event.playerId === player.id) {
            if (wasOnFieldThisPeriod) exitTime = event.timestamp;
            wasOnFieldThisPeriod = false;
          }
        });

        if (onFieldAtStart) {
          minutes += Math.floor((exitTime - entryTime) / 60);
        } else if (wasOnFieldThisPeriod) {
          const subbedInEvent = periodEvents.find(e => e.type === 'substitution' && e.team === 'home' && e.playerInId === player.id);
          if (subbedInEvent) {
            minutes += Math.floor((exitTime - subbedInEvent.timestamp) / 60);
          }
        }
      }

      playerStats.push({
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        goals,
        minutes,
        yellowCards,
        redCards,
      });
    });

    return playerStats;
  }, [state]);

  useEffect(() => {
    // Salvataggio automatico solo se il torneo è attivo
    if (state.isMatchEnded && isTournamentActive && tournament.isActive && !matchSavedToTournament) {
      const playerStats = calculatePlayerStats();
      addMatchToTournament(
        state.homeTeam.name,
        state.awayTeam.name,
        state.homeTeam.score,
        state.awayTeam.score,
        playerStats,
        state.events,
        state.periodScores
      );
      setMatchSavedToTournament(true);
    }
  }, [state.isMatchEnded, isTournamentActive, tournament.isActive, matchSavedToTournament, calculatePlayerStats, addMatchToTournament, state]);

  useBeforeUnload(state.isRunning && !state.isPaused, 'Hai una partita in corso. Sei sicuro di voler uscire?');

  const handleRosterComplete = () => {
    if (pendingTournamentName) {
      const players = state.homeTeam.players.map(p => ({ name: p.name, number: p.number }));
      startTournament(pendingTournamentName, state.homeTeam.name, players);
      setPendingTournamentName(null);
    }
    forceStarterSelection();
    setPhase('match');
    toast.success('Configurazione completata');
  };

  const handleStartersConfirm = useCallback((homeStarters: string[], awayStarters: string[]) => {
    setStarters(homeStarters, true);
    setStarters(awayStarters, false);
    confirmStarters();
    toast.success('Titolari confermati');
  }, [setStarters, confirmStarters]);

  const handleNewMatch = () => {
    const preserveHome = isTournamentActive;
    resetMatch(preserveHome);
    setMatchSavedToTournament(false);
    setPhase('setup');
    toast.success(preserveHome ? 'Nuova partita torneo' : 'Nuova partita rapida');
  };

  const handleExitMatch = () => {
    resetMatch(false);
    setMatchSavedToTournament(false);
    navigate('/dashboard');
  };

  const handleTournamentModeChange = (enabled: boolean) => {
    if (enabled && !isTournamentActive) {
      navigate('/match', { state: { mode: 'tournament', createTournament: true } });
    }
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          syncStatus={syncStatus} 
          isTournamentMode={isTournamentActive}
          onTournamentModeChange={handleTournamentModeChange}
          showNavButtons={true}
          onNewMatch={handleNewMatch}
        />
        <div className="flex-1">
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
            pendingTournamentName={pendingTournamentName}
            isTournamentMode={isTournamentActive}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header syncStatus={syncStatus} />
      <Helmet>
        <title>{state.homeTeam.name || 'Casa'} vs {state.awayTeam.name || 'Ospite'}</title>
      </Helmet>
      <main className="flex-1 bg-background p-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {!state.isMatchEnded && (
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
                        Tutti i dati correnti verranno persi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleNewMatch}>Conferma</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
          
          {state.isMatchEnded && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted rounded-lg text-muted-foreground">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Partita completata</span>
            </div>
          )}

          {/* PASSIAMO isTournamentMode AL COMPONENTE CHE GESTISCE L'HEADER DEL MATCH */}
          <MatchHeader state={state} isTournamentMode={isTournamentActive} />

          {state.needsStarterSelection && !state.isMatchEnded ? (
            <StarterSelection
              homePlayers={state.homeTeam.players}
              awayPlayers={state.awayTeam.players}
              period={state.currentPeriod}
              onConfirm={handleStartersConfirm}
            />
          ) : (
            <>

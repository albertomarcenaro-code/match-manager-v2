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

  // GESTIONE LOGICA MODALITÀ
  useEffect(() => {
    const navState = location.state as { mode?: string; resume?: boolean; createTournament?: boolean; tournamentName?: string } | null;
    
    if (navState?.mode === 'single') {
      setPendingTournamentName(null);
      setPhase(state.isMatchStarted ? 'match' : 'setup');
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
        let entryTimeThisPeriod = periodStart.timestamp;

        periodEvents.forEach(event => {
          if (event.type === 'substitution' && event.team === 'home') {
            if (event.playerOutId === player.id) {
              exitTime = event.timestamp;
              wasOnFieldThisPeriod = false;

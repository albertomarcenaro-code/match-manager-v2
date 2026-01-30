import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player } from '@/types/match';
import { Plus, Trash2, Users, Shield, Check, Hash, Upload, Save, ArrowLeftRight, Trophy, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournament';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
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

interface RosterSetupProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  onHomeTeamNameChange: (name: string) => void;
  onAwayTeamNameChange: (name: string) => void;
  onAddPlayer: (name: string) => void;
  onUpdatePlayerNumber: (playerId: string, number: number | null) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddOpponentPlayer: (number: number) => void;
  onRemoveOpponentPlayer: (playerId: string) => void;
  onComplete: () => void;
  onBulkAddPlayers?: (names: string[]) => void;
  onSwapTeams?: () => void;
  onCreatePlayersWithNumbers?: (count: number) => void;
  pendingTournamentName?: string | null;
  isTournamentMode?: boolean;
}

export function RosterSetup({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  onHomeTeamNameChange,
  onAwayTeamNameChange,
  onAddPlayer,
  onUpdatePlayerNumber,
  onRemovePlayer,
  onAddOpponentPlayer,
  onRemoveOpponentPlayer,
  onComplete,
  onBulkAddPlayers,
  onSwapTeams,
  onCreatePlayersWithNumbers,
  pendingTournamentName,
  isTournamentMode = false,
}: RosterSetupProps) {
  const { user, isGuest } = useAuth();
  const { tournament, startTournament } = useTournament();
  const location = useLocation();
  const navState = location.state as { mode?: string } | null;
  const isSingleMatchMode = navState?.mode === 'single';
   
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [autoNumberTeam, setAutoNumberTeam] = useState<'home' | 'away'>('home');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tournamentMode, setTournamentMode] = useState(tournament.isActive && !isSingleMatchMode);
  const [tournamentName, setTournamentName] = useState(tournament.name || '');
  const [showTournamentDialog, setShowTournamentDialog] = useState(false);

  // Priorità: se esiste una rosa già salvata localmente (es. chiusura app / reload), NON sovrascrivere con dati dal backend.
  const hasLocalRoster = useMemo(() => {
    try {
      const saved = localStorage.getItem('match-manager-state');
      if (!saved) return false;
      const parsed = JSON.parse(saved) as any;
      return (
        (parsed?.homeTeam?.players?.length ?? 0) > 0 ||
        (parsed?.awayTeam?.players?.length ?? 0) > 0
      );
    } catch {
      return false;
    }
  }, []);

  const [saveStatusByPlayerId, setSaveStatusByPlayerId] = useState<
    Record<string, 'idle' | 'saving' | 'saved' | 'error'>
  >({});
  const [dbPlayerIdsByName, setDbPlayerIdsByName] = useState<Record<string, string>>({});
  const [pendingDbNumbersByName, setPendingDbNumbersByName] = useState<Record<string, number | null> | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveQueueRef = useRef<Record<string, { id: string; name: string; number: number | null }>>({});

  // Compute duplicate numbers for validation
  const duplicateHomeNumbers = useMemo(() => {
    const numberCounts: Record<number, number> = {};
    homePlayers.forEach(p => {
      if (p.number !== null) {
        numberCounts[p.number] = (numberCounts[p.number] || 0) + 1;
      }
    });
    return new Set(Object.entries(numberCounts).filter(([_, count]) => count > 1).map(([num]) => parseInt(num)));
  }, [homePlayers]);

  const duplicateAwayNumbers = useMemo(() => {
    const numberCounts: Record<number, number> = {};
    awayPlayers.forEach(p => {
      if (p.number !== null) {
        numberCounts[p.number] = (numberCounts[p.number] || 0) + 1;
      }
    });
    return new Set(Object.entries(numberCounts).filter(([_, count]) => count > 1).map(([num]) => parseInt(num)));
  }, [awayPlayers]);

  const hasDuplicates = duplicateHomeNumbers.size > 0 || duplicateAwayNumbers.size > 0;

  // PRIVACY: HARD RESET for guest mode - ensure NO data leaks from logged-in users
  useEffect(() => {
    if (isGuest) {
      // Guest mode: ALWAYS start completely fresh - never load ANY data
      // Clear any cached data that might have leaked
      return;
    }
    
    // LOGGED IN: Only load if no local roster exists
    if (user && !hasLocalRoster) {
      loadUserData();
    }
  }, [user, isGuest, hasLocalRoster

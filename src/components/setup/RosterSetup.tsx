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
  }, [user, isGuest, hasLocalRoster]);

  // Applica i numeri caricati dal backend quando l'array homePlayers è stato popolato
  useEffect(() => {
    if (!pendingDbNumbersByName) return;

    // For single match mode (logged in): DON'T apply saved numbers, only names
    // For tournament mode: apply numbers from first match
    if (!isTournamentMode && !tournament.isActive) {
      // Clear pending - numbers should stay null for single matches
      setPendingDbNumbersByName(null);
      return;
    }

    homePlayers.forEach(p => {
      const n = pendingDbNumbersByName[p.name];
      if (typeof n === 'number' && p.number !== n) {
        onUpdatePlayerNumber(p.id, n);
      }
    });

    setPendingDbNumbersByName(null);
  }, [pendingDbNumbersByName, homePlayers, onUpdatePlayerNumber, isTournamentMode, tournament.isActive]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load profile (team name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.team_name) {
        onHomeTeamNameChange(profile.team_name);
      }

      // Load players (names only - numbers are empty for single match)
      const { data: players } = await supabase
        .from('players')
        .select('id, name, number')
        .eq('user_id', user.id)
        .order('name');

      if (players && players.length > 0) {
        setDbPlayerIdsByName(
          players.reduce<Record<string, string>>((acc, p) => {
            if (p.name && p.id) acc[p.name] = p.id;
            return acc;
          }, {})
        );
      }

      if (players && players.length > 0 && onBulkAddPlayers) {
        const playerNames = players.map(p => p.name);
        onBulkAddPlayers(playerNames);

        // For tournament mode: check if we have previous matches and load numbers from there
        if (isTournamentMode && tournament.isActive && tournament.matches.length > 0) {
          // Get numbers from the first match of this tournament
          const firstMatch = tournament.matches[0];
          const numbersByName: Record<string, number | null> = {};
           
          if (firstMatch.playerStats) {
            firstMatch.playerStats.forEach((stat: any) => {
              if (stat.playerName && stat.playerNumber !== null && stat.playerNumber !== undefined) {
                numbersByName[stat.playerName] = stat.playerNumber;
              }
            });
          }
           
          if (Object.keys(numbersByName).length > 0) {
            setPendingDbNumbersByName(numbersByName);
          }
        }
        // For single match: numbers stay null (don't set pendingDbNumbersByName)
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const flushRosterNumberSaves = async () => {
    const entries = Object.values(saveQueueRef.current);
    if (entries.length === 0) return;

    saveQueueRef.current = {};

    if (!user || isGuest) {
      setSaveStatusByPlayerId(prev => {
        const next = { ...prev };
        entries.forEach(e => (next[e.id] = 'saved'));
        return next;
      });
      return;
    }

    try {
      for (const e of entries) {
        const dbId = dbPlayerIdsByName[e.name];

        if (dbId) {
          const { error } = await supabase
            .from('players')
            .update({ number: e.number })
            .eq('id', dbId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('players')
            .insert({ user_id: user.id, name: e.name, number: e.number })
            .select('id, name');

          if (error) throw error;

          const row = Array.isArray(data) ? data[0] : null;
          if (row?.id && row?.name) {
            setDbPlayerIdsByName(prev => ({ ...prev, [row.name]: row.id }));
          }
        }

        setSaveStatusByPlayerId(prev => ({ ...prev, [e.id]: 'saved' }));
      }
    } catch (err) {
      console.error('Autosave roster failed:', err);
      setSaveStatusByPlayerId(prev => {
        const next = { ...prev };
        entries.forEach(e => (next[e.id] = 'error'));
        return next;
      });
    }
  };

  const queueRosterNumberSave = (player: Player, number: number | null) => {
    saveQueueRef.current[player.id] = { id: player.id, name: player.name, number };

    setSaveStatusByPlayerId(prev => ({
      ...prev,
      [player.id]: user && !isGuest ? 'saving' : 'saved',
    }));

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      flushRosterNumberSaves();
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const handleUpdateNumber = (playerId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    if (numValue !== null && isNaN(numValue)) return;

    onUpdatePlayerNumber(playerId, numValue);

    const player = homePlayers.find(p => p.id === playerId);
    if (player) {
      queueRosterNumberSave(player, numValue);
    }
  };

  const handleQuickNumber = (playerId: string) => {
    const usedNumbers = homePlayers
      .filter(p => p.number !== null)
      .map(p => p.number as number);
     
    const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
     
    onUpdatePlayerNumber(playerId, nextNumber);
     
    const player = homePlayers.find(p => p.id === playerId);
    if (player) {
      queueRosterNumberSave({ ...player, number: nextNumber }, nextNumber);
    }
     
    toast.success(`Numero ${nextNumber} assegnato`);
  };

  const handleAddOpponent = () => {
    const num = parseInt(newOpponentNumber, 10);
    if (!isNaN(num) && num > 0) {
      onAddOpponentPlayer(num);
      setNewOpponentNumber('');
    }
  };

  const handleBulkImport = () => {
    const lines = bulkImportText.split('\n').filter(line => line.trim());
    let importedCount = 0;
     
    lines.forEach(line => {
      const name = line.trim().toUpperCase();
      if (name && !homePlayers.some(p => p.name === name)) {
        onAddPlayer(name);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      toast.success(`Importati ${importedCount} giocatori`);
      setBulkImportText('');
      setBulkImportDialogOpen(false);
    } else {
      toast.error('Nessun nuovo giocatore da importare');
    }
  };

  const handleSaveRoster = async () => {
    if (!user || isGuest) {
      toast.error('Devi essere loggato per salvare la rosa');
      return;
    }

    setIsSaving(true);

    try {
      await supabase
        .from('profiles')
        .update({ team_name: homeTeamName })
        .eq('user_id', user.id);

      await supabase
        .from('players')
        .delete()
        .eq('user_id', user.id);

      // Save names only (numbers are match-specific for single matches)
      const playersToInsert = homePlayers.map(p => ({
        user_id: user.id,
        name: p.name,
        number: null, // Don't save numbers as defaults
      }));

      if (playersToInsert.length > 0) {
        await supabase
          .from('players')
          .insert(playersToInsert);
      }

      toast.success('Rosa salvata (solo nomi)!');
    } catch (error) {
      console.error('Error saving roster:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetRoster = async () => {
    if (user && !isGuest) {
      setIsLoading(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('team_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.team_name) {
          onHomeTeamNameChange(profile.team_name);
        }

        const { data: players } = await supabase
          .from('players')
          .select('id, name, number')
          .eq('user_id', user.id)
          .order('name');

        if (players && players.length > 0 && onBulkAddPlayers) {
          const uniqueNames = [...new Set(players.map(p => p.name))];
          onBulkAddPlayers(uniqueNames);

          // For tournament mode with existing matches: load numbers from first match
          if (isTournamentMode && tournament.isActive && tournament.matches.length > 0) {
            const firstMatch = tournament.matches[0];
            const numbersByName: Record<string, number | null> = {};
             
            if (firstMatch.playerStats) {
              firstMatch.playerStats.forEach((stat: any) => {
                if (stat.playerName && stat.playerNumber !== null) {
                  numbersByName[stat.playerName] = stat.playerNumber;
                }
              });
            }
            setPendingDbNumbersByName(numbersByName);
          }
          // Single match mode: numbers stay null
           
          setDbPlayerIdsByName(
            players.reduce<Record<string, string>>((acc, p) => {
              if (p.name && p.id) acc[p.name] = p.id;
              return acc;
            }, {})
          );
        }

        toast.success('Rosa ripristinata dal database');
      } catch (error) {
        console.error('Error resetting roster:', error);
        toast.error('Errore nel ripristino');
      } finally {
        setIsLoading(false);
      }
    } else {
      homePlayers.forEach(p => {
        if (p.number !== null) {
          onUpdatePlayerNumber(p.id, null);
        }
      });
      toast.success('Numeri di maglia azzerati');
    }
  };

  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (isNaN(count) || count <= 0) {
      toast.error('Inserisci un numero valido');
      return;
    }
     
    if (autoNumberTeam === 'home') {
      if (homePlayers.length === 0) {
        if (onCreatePlayersWithNumbers) {
          onCreatePlayersWithNumbers(count);
          toast.success(`Creati ${count} giocatori con numeri progressivi`);
        } else {
          for (let i = 1; i <= count; i++) {
            onAddPlayer(`Giocatore ${i}`);
          }
          toast.success(`Creati ${count} giocatori (assegna i numeri manualmente)`);
        }
        
        setAutoNumberDialogOpen(false);
        setAutoNumberCount('');
        return;
      }
      
      const playersWithoutNumbers = homePlayers.filter(p => p.number === null);
      
      if (playersWithoutNumbers.length === 0) {
        toast.info('Tutti i giocatori hanno già un numero assegnato');
        setAutoNumberDialogOpen(false);
        setAutoNumberCount('');
        return;
      }

      const toAssign = Math.min(count, playersWithoutNumbers.length);
      const usedNumbers = new Set(homePlayers.filter(p => p.number !== null).map(p => p.number));
      let nextNumber = 1;
      
      for (let i = 0; i < toAssign; i++) {
        while (usedNumbers.has(nextNumber)) {
          nextNumber++;
        }
        const player = playersWithoutNumbers[i];
        onUpdatePlayerNumber(player.id, nextNumber);
        queueRosterNumberSave({ ...player, number: nextNumber }, nextNumber);
        usedNumbers.add(nextNumber);
        nextNumber++;
      }

      toast.success(`Assegnati numeri a ${toAssign} giocatori`);
    } else {
      const usedNumbers = new Set(awayPlayers.map(p => p.number).filter(n => n !== null));
      let nextNumber = 1;
      let created = 0;
      
      for (let i = 0; i < count; i++) {
        while (usedNumbers.has(nextNumber)) {
          nextNumber++;
        }
        onAddOpponentPlayer(nextNumber);
        usedNumbers.add(nextNumber);
        nextNumber++;
        created++;
      }

      toast.success(`Creati ${created} giocatori avversari con numeri progressivi`);
    }
     
    setAutoNumberDialogOpen(false);
    setAutoNumberCount('');
  };

  const handleTournamentToggle = (enabled: boolean) => {
    if (enabled && !tournament.isActive) {
      setShowTournamentDialog(true);
    } else if (!enabled) {
      setTournamentMode(false);
    }
  };

  const handleStartTournament = () => {
    if (!tournamentName.trim()) {
      toast.error('Inserisci un nome per il torneo (es. "Campionato 2025")');
      return;
    }
     
    const players = homePlayers.map(p => ({ name: p.name, number: p.number }));
    startTournament(tournamentName, homeTeamName, players);
    setTournamentMode(true);
    setShowTournamentDialog(false);
  };

  const eligiblePlayers = homePlayers.filter(p => p.number !== null);
  const canProceed = eligiblePlayers.length >= 1 && awayPlayers.length >= 1 && !hasDuplicates;

  // Determine page title - STRICT HIERARCHY:
  // Show tournament name ONLY if: logged in AND tournament mode AND tournament name exists
  // Otherwise ALWAYS show 'Configurazione Partita'
  const shouldShowTournamentName = 
    user && 
    !isGuest && 
    !isSingleMatchMode && 
    isTournamentMode && 
    tournament.isActive && 
    tournament.name;
   
  const pageTitle = shouldShowTournamentName ? tournament.name : 'Configurazione Partita';

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-semibold">{pageTitle}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Inserisci le rose</h1>
          <p className="text-muted-foreground mt-2">
            Aggiungi i giocatori e assegna i numeri di maglia
          </p>
          {isLoading && (
            <p className="text-sm text-primary mt-2">Caricamento dati salvati...</p>
          )}
          {/* Tournament match count - only show if in tournament mode */}
          {isTournamentMode && tournament.isActive && (
            <p className="text-sm text-secondary font-medium mt-2">
              {tournament.matches.length} partite giocate
            </p>
          )}
          {/* Duplicate warning */}
          {hasDuplicates && (
            <p className="text-sm text-destructive font-medium mt-2">
              ⚠️ Numeri di maglia duplicati rilevati! Correggi prima di continuare.
            </p>
          )}
        </div>

        {/* Swap Teams Button */}
        {onSwapTeams && (
          <div className="flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Scambia Squadre (Gioco in trasferta)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Scambiare le squadre?</AlertDialogTitle>
                  <AlertDialogDescription>
                    I dati della squadra di casa e della squadra ospite verranno invertiti completamente. 
                    La TUA SQUADRA diventerà ospite e la squadra avversaria diventerà casa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    onSwapTeams();
                    toast.success('Squadre scambiate - la tua squadra è ora ospite');
                  }}>
                    Scambia
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Home Team */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 gradient-home text-team-home-foreground">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-bold">Squadra di casa</span>
                </div>
                <div className="flex items-center gap-1">
                  {user && !isGuest && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleSaveRoster}
                      disabled={isSaving}
                      className="gap-1 h-7 text-xs"
                    >
                      <Save className="h-3 w-3" />
                      {isSaving ? 'Salvo...' : 'Salva'}
                    </Button>
                  )}
                </div>
              </div>
              <Input
                value={homeTeamName}
                onChange={(e) => onHomeTeamNameChange(e.target.value)}
                placeholder="Nome squadra"
                className="bg-team-home-foreground/10 border-team-home-foreground/20 text-team-home-foreground placeholder:text-team-home-foreground/50"
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Add Player */}
              <div className="flex gap-2">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nome giocatore"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
                <Button onClick={handleAddPlayer} size="icon" className="flex-shrink-0">
                  <Plus className="h-5 w-5" />
                </Button>
                {!isGuest && (
                  <Button 
                    onClick={() => setBulkImportDialogOpen(true)} 
                    size="icon" 
                    variant="outline"
                    className="flex-shrink-0"
                    title="Importa da Excel"
                  >
                    <Upload className="h-5 w-5" />
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setAutoNumberTeam('home');
                    setAutoNumberDialogOpen(true);
                  }} 
                  size="icon" 
                  variant="outline"
                  className="flex-shrink-0"
                  title="Auto-numerazione"
                >
                  <Hash className="h-5 w-5" />
                </Button>
              </div>

              {/* Players List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {homePlayers.map((player) => {
                  const status = saveStatusByPlayerId[player.id] ?? 'idle';
                  const isDuplicate = player.number !== null && duplicateHomeNumbers.has(player.number);

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border",
                        isDuplicate
                          ? "bg-destructive/10 border-destructive"
                          : player.number !== null
                            ? "bg-on-field/5 border-on-field/30"
                            : "bg-muted/50 border-border"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          value={player.number ?? ''}
                          onChange={(e) => handleUpdateNumber(player.id, e.target.value)}
                          onBlur={() => queueRosterNumberSave(player, player.number ?? null)}
                          placeholder="#"
                          className={cn(
                            "w-14 text-center",
                            isDuplicate && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleQuickNumber(player.id)}
                          title="Assegna numero successivo"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="min-w-[60px] text-[11px] leading-tight">
                        {status === 'saving' ? (
                          <span className="text-muted-foreground">Salvo…</span>
                        ) : status === 'saved' ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Check className="h-3 w-3" />
                            Salvato
                          </span>
                        ) : status === 'error' ? (
                          <span className="text-destructive">Errore</span>
                        ) : null}
                      </div>

                      <span className="flex-1 font-medium truncate">{player.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemovePlayer(player.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {homePlayers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Nessun giocatore inserito
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {eligiblePlayers.length} giocatori con numero assegnato
              </p>
            </div>
          </div>

          {/* Away Team */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 gradient-away text-team-away-foreground">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5" />
                <span className="font-bold">Squadra ospite</span>
              </div>
              <Input
                value={awayTeamName}
                onChange={(e) => onAwayTeamNameChange(e.target.value)}
                placeholder="Nome squadra avversaria"
                className="bg-team-away-foreground/10 border-team-away-foreground/20 text-team-away-foreground placeholder:text-team-away-foreground/50"
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Add Opponent */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={newOpponentNumber}
                  onChange={(e) => setNewOpponentNumber(e.target.value)}
                  placeholder="Numero maglia"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()}
                />
                <Button onClick={handleAddOpponent} size="icon" className="flex-shrink-0">
                  <Plus className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => {
                    setAutoNumberTeam('away');
                    setAutoNumberDialogOpen(true);
                  }} 
                  size="icon" 
                  variant="outline"
                  className="flex-shrink-0"
                  title="Auto-numerazione ospiti"
                >
                  <Hash className="h-5 w-5" />
                </Button>
              </div>

              {/* Opponents List - CORRETTA QUI */}
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                {awayPlayers.map((player) => {
                  const isDuplicate = player.number !== null && duplicateAwayNumbers.has(player.number);
                  
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg border",
                        isDuplicate
                          ? "bg-destructive/10 border-destructive"
                          : "bg-muted border-border"
                      )}
                    >
                      <span className="font-bold">#{player.number}</span>
                      {/* AGGIUNTA FONDAMENTALE: MOSTRA IL NOME */}
                      <span className="text-xs ml-1 opacity-70 truncate max-w-[100px]">{player.name}</span>
                      
                      <button
                        onClick={() => onRemoveOpponentPlayer(player.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                {awayPlayers.length === 0 && (
                  <p className="w-full text-center text-sm text-muted-foreground py-4">
                    Nessun numero inserito
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {awayPlayers.length} giocatori inseriti
              </p>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border">
          <div className="max-w-4xl mx-auto space-y-2">
            <Button
              size="lg"
              className="w-full gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={onComplete}
              disabled={!canProceed}
            >
              Inizia Partita <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="flex justify-center">
              <Button 
                variant="link" 
                size="sm" 
                className="text-muted-foreground h-auto p-0 hover:text-destructive"
                onClick={handleResetRoster}
              >
                Reset Totale
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

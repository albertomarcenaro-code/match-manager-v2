import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournament';
import { Helmet } from 'react-helmet';
import { Play, Trophy, RefreshCw, History, Lock, Plus, FolderOpen, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'match-manager-state';
const TOURNAMENT_STORAGE_KEY = 'tournament-state';

interface SavedMatchState {
  homeTeam: { name: string; score: number };
  awayTeam: { name: string; score: number };
  isMatchStarted: boolean;
  isMatchEnded: boolean;
  currentPeriod: number;
}

interface SavedTournament {
  id: string;
  name: string;
  team_name: string;
  created_at: string;
  is_active: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const { tournament, loadTournamentById, resetForSingleMatch } = useTournament();
  const [activeSession, setActiveSession] = useState<SavedMatchState | null>(null);
  const [showActiveSessionDialog, setShowActiveSessionDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'single' | 'tournament' | null>(null);
  
  // Tournament selection state
  const [showTournamentChoiceDialog, setShowTournamentChoiceDialog] = useState(false);
  const [showNewTournamentDialog, setShowNewTournamentDialog] = useState(false);
  const [showLoadTournamentDialog, setShowLoadTournamentDialog] = useState(false);
  const [savedTournaments, setSavedTournaments] = useState<SavedTournament[]>([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Show toast if redirected from auth-required route
  useEffect(() => {
    if (location.state?.authRequired) {
      toast.info('Per la modalità torneo bisogna essere loggati');
      // Clear the state to prevent showing toast again on refresh
      navigate('/dashboard', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Check for active match session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedMatchState;
        if (parsed.isMatchStarted && !parsed.isMatchEnded) {
          setActiveSession(parsed);
        }
      }
    } catch (e) {
      console.error('Error checking active session:', e);
    }
  }, []);

  // Check Supabase sync status
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
    const interval = setInterval(checkSync, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user, isGuest]);

  const loadSavedTournaments = async () => {
    if (!user) return;
    
    setIsLoadingTournaments(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, team_name, created_at, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedTournaments(data || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Errore nel caricamento dei tornei');
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  const handleNewSingleMatch = () => {
    if (activeSession) {
      setPendingAction('single');
      setShowActiveSessionDialog(true);
    } else {
      // HARD RESET: Clear ALL tournament/match state for single match mode
      performSingleMatchReset();
      navigate('/match', { state: { mode: 'single' } });
    }
  };

  // HARD RESET function for single match mode - prevents data leaks
  const performSingleMatchReset = () => {
    // 1. Clear TanStack Query cache (prevents Supabase data leaks)
    queryClient.clear();
    
    // 2. Reset tournament state completely
    resetForSingleMatch();
    
    // 3. Clear match state but preserve home team names for logged-in users
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.homeTeam?.players) {
          parsed.homeTeam.players = parsed.homeTeam.players.map((p: any) => ({ ...p, number: null }));
        }
        if (parsed.awayTeam?.players) {
          parsed.awayTeam.players = [];
        }
        // Reset match counters and flags
        parsed.currentPeriod = 0;
        parsed.isMatchStarted = false;
        parsed.isMatchEnded = false;
        parsed.events = [];
        parsed.periodScores = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('Error clearing match state:', e);
    }
    
    // 4. Force clear tournament localStorage
    localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
  };

  const handleTournamentMode = () => {
    if (activeSession) {
      setPendingAction('tournament');
      setShowActiveSessionDialog(true);
    } else if (tournament.isActive) {
      // Continue existing tournament
      navigate('/match', { state: { mode: 'tournament' } });
    } else {
      // Show choice dialog: Create New or Load Existing
      setShowTournamentChoiceDialog(true);
    }
  };

  const handleCreateNewTournament = () => {
    setShowTournamentChoiceDialog(false);
    setNewTournamentName('');
    setShowNewTournamentDialog(true);
  };

  const handleLoadExistingTournament = async () => {
    setShowTournamentChoiceDialog(false);
    await loadSavedTournaments();
    setShowLoadTournamentDialog(true);
  };

  const handleConfirmNewTournament = () => {
    if (!newTournamentName.trim()) {
      toast.error('Inserisci un nome per il torneo (es. "Campionato 2025")');
      return;
    }
    setShowNewTournamentDialog(false);
    navigate('/match', { state: { mode: 'tournament', createTournament: true, tournamentName: newTournamentName.trim() } });
  };

  const handleSelectTournament = async (tournamentId: string) => {
    try {
      await loadTournamentById(tournamentId);
      setShowLoadTournamentDialog(false);
      toast.success('Torneo caricato');
      navigate('/match', { state: { mode: 'tournament' } });
    } catch (error) {
      console.error('Error loading tournament:', error);
      toast.error('Errore nel caricamento del torneo');
    }
  };

  const handleResumeSession = () => {
    setShowActiveSessionDialog(false);
    navigate('/match', { state: { resume: true } });
  };

  const handleDiscardSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('match-timer-state');
    setActiveSession(null);
    setShowActiveSessionDialog(false);
    
    if (pendingAction === 'single') {
      // HARD RESET for single match
      performSingleMatchReset();
      navigate('/match', { state: { mode: 'single' } });
    } else if (pendingAction === 'tournament') {
      setShowTournamentChoiceDialog(true);
    }
    setPendingAction(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header syncStatus={syncStatus} />
      <Helmet>
        <title>Dashboard - Match Manager Live</title>
        <meta name="description" content="Gestisci le tue partite di calcio. Scegli tra partita singola o modalità torneo." />
      </Helmet>

      <main className="flex-1 bg-background p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Active session banner */}
          {activeSession && (
            <Card className="p-4 mb-6 border-secondary bg-secondary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="font-semibold text-secondary">Partita in corso</p>
                    <p className="text-sm text-muted-foreground">
                      {activeSession.homeTeam.name || 'Casa'} {activeSession.homeTeam.score} - {activeSession.awayTeam.score} {activeSession.awayTeam.name || 'Ospite'}
                      {activeSession.currentPeriod > 0 && ` (${activeSession.currentPeriod}° tempo)`}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/match', { state: { resume: true } })} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Riprendi
                </Button>
              </div>
            </Card>
          )}

          {/* Main title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Match Manager</h1>
            <p className="text-muted-foreground">Scegli come vuoi giocare</p>
          </div>

          {/* Main action cards */}
          <div className="grid gap-6">
            {/* Single Match */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
              onClick={handleNewSingleMatch}
            >
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Play className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">Nuova Partita Singola</h2>
                  <p className="text-muted-foreground">
                    Inizia una nuova partita con la rosa precaricata e numeri vuoti
                  </p>
                </div>
              </div>
            </Card>

            {/* Tournament Mode */}
            <Card 
              className={`p-8 transition-all ${isGuest ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:border-secondary'} group`}
              onClick={isGuest ? undefined : handleTournamentMode}
            >
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-full ${isGuest ? 'bg-muted text-muted-foreground' : 'bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground'} transition-colors`}>
                  {isGuest ? <Lock className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">Modalità Torneo</h2>
                  <p className="text-muted-foreground">
                    {isGuest ? (
                      'Effettua il login per creare tornei e salvare statistiche'
                    ) : tournament.isActive 
                      ? `Continua "${tournament.name}" - ${tournament.matches.length} partite giocate`
                      : 'Crea un nuovo torneo o carica uno esistente'
                    }
                  </p>
                </div>
              </div>
            </Card>

            {/* Tournament Archive */}
            <Card 
              className={`p-6 transition-all ${isGuest ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:border-muted-foreground'} group`}
              onClick={isGuest ? undefined : () => navigate('/tournament')}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isGuest ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground group-hover:text-background'} transition-colors`}>
                  {isGuest ? <Lock className="h-6 w-6" /> : <History className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Archivio Tornei</h2>
                  <p className="text-sm text-muted-foreground">
                    {isGuest 
                      ? 'Accedi per vedere l\'archivio' 
                      : 'Visualizza statistiche e cronologia partite'
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Active Session Dialog */}
      <AlertDialog open={showActiveSessionDialog} onOpenChange={setShowActiveSessionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sessione attiva rilevata</AlertDialogTitle>
            <AlertDialogDescription>
              C'è una partita in corso: {activeSession?.homeTeam.name || 'Casa'} vs {activeSession?.awayTeam.name || 'Ospite'}.
              <br /><br />
              Vuoi riprendere la sessione attiva o cancellarla per iniziarne una nuova?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Annulla</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardSession}>
              Cancella e inizia nuova
            </Button>
            <AlertDialogAction onClick={handleResumeSession}>
              Riprendi sessione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tournament Choice Dialog */}
      <Dialog open={showTournamentChoiceDialog} onOpenChange={setShowTournamentChoiceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Modalità Torneo
            </DialogTitle>
            <DialogDescription>
              Cosa vuoi fare?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              onClick={handleCreateNewTournament}
              className="gap-2 h-14"
              variant="default"
            >
              <Plus className="h-5 w-5" />
              Crea Nuovo Torneo
            </Button>
            <Button 
              onClick={handleLoadExistingTournament}
              className="gap-2 h-14"
              variant="outline"
            >
              <FolderOpen className="h-5 w-5" />
              Carica Torneo Esistente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Tournament Name Dialog */}
      <Dialog open={showNewTournamentDialog} onOpenChange={setShowNewTournamentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Nuovo Torneo
            </DialogTitle>
            <DialogDescription>
              Inserisci un nome per il torneo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="tournamentName">Nome del Torneo</Label>
            <Input
              id="tournamentName"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              placeholder="Es. Campionato 2025"
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmNewTournament()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTournamentDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleConfirmNewTournament} className="gap-2">
              <Trophy className="h-4 w-4" />
              Crea Torneo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Existing Tournament Dialog */}
      <Dialog open={showLoadTournamentDialog} onOpenChange={setShowLoadTournamentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-secondary" />
              Carica Torneo
            </DialogTitle>
            <DialogDescription>
              Seleziona un torneo da caricare
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {isLoadingTournaments ? (
              <p className="text-center text-muted-foreground py-4">Caricamento...</p>
            ) : savedTournaments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nessun torneo salvato</p>
            ) : (
              savedTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTournament(t.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.team_name} • {new Date(t.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  {t.is_active && (
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary">
                      Attivo
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadTournamentDialog(false)}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

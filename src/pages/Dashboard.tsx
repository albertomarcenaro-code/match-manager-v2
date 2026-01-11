import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournament';
import { Helmet } from 'react-helmet';
import { Play, Trophy, LogOut, RefreshCw, History, Lock } from 'lucide-react';
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
import { toast } from 'sonner';

const STORAGE_KEY = 'match-manager-state';

interface SavedMatchState {
  homeTeam: { name: string; score: number };
  awayTeam: { name: string; score: number };
  isMatchStarted: boolean;
  isMatchEnded: boolean;
  currentPeriod: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut, exitGuest } = useAuth();
  const { tournament } = useTournament();
  const [activeSession, setActiveSession] = useState<SavedMatchState | null>(null);
  const [showActiveSessionDialog, setShowActiveSessionDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'single' | 'tournament' | null>(null);

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

  const handleLogout = async () => {
    if (isGuest) {
      exitGuest();
    } else {
      await signOut();
    }
    toast.success('Disconnesso');
    navigate('/');
  };

  const handleNewSingleMatch = () => {
    if (activeSession) {
      setPendingAction('single');
      setShowActiveSessionDialog(true);
    } else {
      // Clear jersey numbers for single match mode
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Error clearing jersey numbers:', e);
      }
      navigate('/match', { state: { mode: 'single' } });
    }
  };

  const handleTournamentMode = () => {
    if (activeSession) {
      setPendingAction('tournament');
      setShowActiveSessionDialog(true);
    } else {
      navigate('/match', { state: { mode: 'tournament' } });
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
      navigate('/match', { state: { mode: 'single' } });
    } else if (pendingAction === 'tournament') {
      navigate('/match', { state: { mode: 'tournament' } });
    }
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Helmet>
        <title>Dashboard - Match Manager Live</title>
        <meta name="description" content="Gestisci le tue partite di calcio. Scegli tra partita singola o modalità torneo." />
      </Helmet>

      <main className="flex-1 bg-background p-4">
        <div className="max-w-2xl mx-auto">
          {/* User info */}
          <div className="flex justify-between items-center mb-8">
            <div className="text-sm text-muted-foreground">
              {isGuest ? (
                <span className="flex items-center gap-1">Modalità Ospite</span>
              ) : (
                <span className="flex items-center gap-1">{user?.email}</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>

          {/* Active session banner */}
          {activeSession && (
            <Card className="p-4 mb-6 border-secondary bg-secondary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-secondary">Partita in corso</p>
                  <p className="text-sm text-muted-foreground">
                    {activeSession.homeTeam.name || 'Casa'} {activeSession.homeTeam.score} - {activeSession.awayTeam.score} {activeSession.awayTeam.name || 'Ospite'}
                    {activeSession.currentPeriod > 0 && ` (${activeSession.currentPeriod}° tempo)`}
                  </p>
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
                      : 'Crea un nuovo torneo o visualizza quelli salvati'
                    }
                  </p>
                </div>
              </div>
            </Card>

            {/* Tournament Archive */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all hover:border-muted-foreground group"
              onClick={() => navigate('/tournament')}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-muted text-muted-foreground group-hover:bg-muted-foreground group-hover:text-background transition-colors">
                  <History className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Archivio Tornei</h2>
                  <p className="text-sm text-muted-foreground">
                    Visualizza statistiche e cronologia partite
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
    </div>
  );
};

export default Dashboard;

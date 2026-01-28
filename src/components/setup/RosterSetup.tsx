import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Hash, Upload, Save, ArrowLeftRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournament';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RosterSetupProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  onHomeTeamNameChange: (name: string) => void;
  onAwayTeamNameChange: (name: string) => void;
  onAddPlayer: (team: 'home' | 'away', player: { name: string; number: number | null }) => void;
  onUpdatePlayerNumber: (playerId: string, number: number | null) => void;
  onRemovePlayer: (playerId: string) => void;
  onComplete: () => void;
  onBulkAddPlayers?: (names: string[]) => void;
  onSwapTeams?: () => void;
}

export function RosterSetup({
  homeTeamName, awayTeamName, homePlayers, awayPlayers,
  onHomeTeamNameChange, onAwayTeamNameChange, onAddPlayer,
  onUpdatePlayerNumber, onRemovePlayer, onComplete,
  onBulkAddPlayers, onSwapTeams,
}: RosterSetupProps) {
  const { user, isGuest } = useAuth();
  const { tournament, startTournament } = useTournament();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tournamentMode, setTournamentMode] = useState(tournament.isActive);
  const [showTournamentDialog, setShowTournamentDialog] = useState(false);

  // Sincronizzazione Supabase all'avvio
  useEffect(() => {
    if (user && !isGuest && homePlayers.length === 0) {
      const loadData = async () => {
        const { data: profile } = await supabase.from('profiles').select('team_name').eq('user_id', user.id).maybeSingle();
        if (profile?.team_name) onHomeTeamNameChange(profile.team_name);
        const { data: players } = await supabase.from('players').select('name, number').eq('user_id', user.id);
        if (players?.length && onBulkAddPlayers) onBulkAddPlayers(players.map(p => p.name));
      };
      loadData();
    }
  }, [user, isGuest]);

  const handleAddHome = () => {
    if (newPlayerName.trim()) {
      onAddPlayer('home', { name: newPlayerName.trim().toUpperCase(), number: null });
      setNewPlayerName('');
    }
  };

  const handleAddAway = () => {
    const num = parseInt(newOpponentNumber, 10);
    if (!isNaN(num)) {
      onAddPlayer('away', { name: `AVVERSARIO ${num}`, number: num });
      setNewOpponentNumber('');
    }
  };

  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (isNaN(count)) return;
    // Applica numeri alla squadra casa
    homePlayers.slice(0, count).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
    // Crea avversari numerati
    for (let i = 1; i <= count; i++) onAddPlayer('away', { name: `AVVERSARIO ${i}`, number: i });
    setAutoNumberDialogOpen(false);
  };

  const canProceed = homePlayers.length > 0 && awayPlayers.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER PAGINA */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Match Setup</h1>
          <div className="flex items-center justify-center gap-4 mt-4 p-3 bg-card border rounded-xl shadow-sm">
            <Trophy className={cn("h-5 w-5", tournamentMode ? "text-yellow-500" : "text-muted-foreground")} />
            <Label className="font-bold text-xs uppercase tracking-widest">Modalità Torneo</Label>
            <Switch checked={tournamentMode} onCheckedChange={(v) => v ? setShowTournamentDialog(true) : setTournamentMode(false)} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* BOX SQUADRA CASA */}
          <div className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden border-primary/20">
            <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center">
              <span className="font-black italic uppercase tracking-widest">CASA</span>
              {user && !isGuest && (
                <Button size="sm" variant="secondary" onClick={async () => {
                  setIsSaving(true);
                  await supabase.from('profiles').update({ team_name: homeTeamName }).eq('user_id', user.id);
                  toast.success("Salvato!");
                  setIsSaving(false);
                }} className="h-8 font-bold">
                  <Save className="h-4 w-4 mr-1" /> {isSaving ? '...' : 'SALVA'}
                </Button>
              )}
            </div>
            <div className="p-4 space-y-4">
              <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="font-bold uppercase border-2 focus:border-primary" placeholder="Nome Squadra..." />
              <div className="flex gap-2">
                <Input placeholder="Nuovo Giocatore..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddHome()} />
                <Button onClick={handleAddHome} size="icon" className="shrink-0"><Plus /></Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {homePlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border animate-in fade-in slide-in-from-left-2">
                    <Input type="number" className="w-14 text-center font-black p-0 h-9" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                    <span className="flex-1 text-sm font-bold uppercase truncate">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOX SQUADRA OSPITE */}
          <div className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden border-muted-foreground/20">
            <div className="p-4 bg-muted border-b">
              <span className="font-black italic uppercase tracking-widest text-muted-foreground">OSPITI</span>
            </div>
            <div className="p-4 space-y-4">
              <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="font-bold uppercase border-2" placeholder="Nome Avversari..." />
              <div className="flex gap-2">
                <Input type="number" placeholder="Aggiungi con numero..." value={newOpponentNumber} onChange={(e) => setNewOpponentNumber(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddAway()} />
                <Button onClick={handleAddAway} variant="outline" size="icon" className="shrink-0"><Plus /></Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {awayPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-secondary/10 border-2 border-secondary/30 px-3 py-1.5 rounded-full text-xs font-black text-secondary-foreground animate-in zoom-in-95">
                    #{p.number}
                    <button onClick={() => onRemovePlayer(p.id)} className="ml-1 hover:text-destructive">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTONI DI AZIONE (Sotto i box) */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Button variant="outline" className="rounded-full font-bold shadow-sm" onClick={() => setAutoNumberDialogOpen(true)}>
            <Hash className="h-4 w-4 mr-2 text-primary" /> AUTO-NUMERA
          </Button>
          <Button variant="outline" className="rounded-full font-bold shadow-sm" onClick={() => setBulkImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2 text-primary" /> IMPORTA LISTA
          </Button>
          {onSwapTeams && (
            <Button variant="outline" className="rounded-full font-bold shadow-sm" onClick={onSwapTeams}>
              <ArrowLeftRight className="h-4 w-4 mr-2 text-primary" /> SCAMBIA SQUADRE
            </Button>
          )}
        </div>

        {/* FOOTER FISSO CON TASTO AVVIA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t-2 z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-14 text-xl font-black uppercase italic tracking-widest shadow-lg shadow-primary/20" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Scendi in Campo →' : 'Configura le Squadre'}
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOGS */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-black italic uppercase">Importa Giocatori</DialogTitle></DialogHeader>
          <Textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="Un nome per ogni riga..." className="h-48 font-mono" />
          <Button onClick={() => { 
            const names = bulkImportText.split('\n').filter(n => n.trim());
            if (onBulkAddPlayers) onBulkAddPlayers(names.map(n => n.trim().toUpperCase()));
            setBulkImportDialogOpen(false);
          }} className="w-full font-bold h-12">CONFERMA IMPORTAZIONE</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent className="rounded-3xl max-w-xs">
          <DialogHeader><DialogTitle className="font-black italic uppercase">Auto-numeri</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Quanti giocatori numerare?</Label>
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Es: 7" className="text-center text-xl font-bold" />
            <Button onClick={handleAutoNumber} className="w-full h-12 font-bold">APPLICA</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  onHomeTeamNameChange,
  onAwayTeamNameChange,
  onAddPlayer,
  onUpdatePlayerNumber,
  onRemovePlayer,
  onComplete,
  onBulkAddPlayers,
  onSwapTeams,
}: RosterSetupProps) {
  const { user, isGuest } = useAuth();
  const { tournament, startTournament } = useTournament();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [autoNumberTeam, setAutoNumberTeam] = useState<'home' | 'away'>('home');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tournamentMode, setTournamentMode] = useState(tournament.isActive);
  const [tournamentName, setTournamentName] = useState(tournament.name || '');
  const [showTournamentDialog, setShowTournamentDialog] = useState(false);

  // Caricamento dati iniziali
  useEffect(() => {
    if (user && !isGuest && homePlayers.length === 0) {
      const loadData = async () => {
        const { data: profile } = await supabase.from('profiles').select('team_name').eq('user_id', user.id).maybeSingle();
        if (profile?.team_name) onHomeTeamNameChange(profile.team_name);
        
        const { data: players } = await supabase.from('players').select('name, number').eq('user_id', user.id);
        if (players && players.length > 0 && onBulkAddPlayers) {
          onBulkAddPlayers(players.map(p => p.name));
        }
      };
      loadData();
    }
  }, [user, isGuest]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer('home', { name: newPlayerName.trim().toUpperCase(), number: null });
      setNewPlayerName('');
    }
  };

  const handleAddOpponent = () => {
    const num = parseInt(newOpponentNumber, 10);
    if (!isNaN(num)) {
      onAddPlayer('away', { name: `AVVERSARIO ${num}`, number: num });
      setNewOpponentNumber('');
    }
  };

  const handleSaveRoster = async () => {
    if (!user || isGuest) return;
    setIsSaving(true);
    try {
      await supabase.from('profiles').update({ team_name: homeTeamName }).eq('user_id', user.id);
      await supabase.from('players').delete().eq('user_id', user.id);
      const toInsert = homePlayers.map(p => ({ user_id: user.id, name: p.name, number: p.number }));
      if (toInsert.length > 0) await supabase.from('players').insert(toInsert);
      toast.success('Rosa salvata con successo');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (isNaN(count)) return;
    if (autoNumberTeam === 'home') {
      homePlayers.slice(0, count).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
    } else {
      for (let i = 1; i <= count; i++) {
        onAddPlayer('away', { name: `AVVERSARIO ${i}`, number: i });
      }
    }
    setAutoNumberDialogOpen(false);
  };

  const canProceed = homePlayers.length > 0 && awayPlayers.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-2">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-bold uppercase">Setup Partita</span>
          </div>
          <h1 className="text-2xl font-bold italic uppercase tracking-tighter">Configura Formazioni</h1>
        </div>

        <div className="flex items-center justify-center gap-4 p-3 bg-card border rounded-xl">
          <Trophy className={cn("h-5 w-5", tournamentMode ? "text-yellow-500" : "text-muted-foreground")} />
          <Label className="font-bold text-sm">MODALITÀ TORNEO</Label>
          <Switch checked={tournamentMode} onCheckedChange={(val) => val ? setShowTournamentDialog(true) : setTournamentMode(false)} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center">
              <span className="font-black italic">CASA</span>
              {user && !isGuest && (
                <Button size="sm" variant="secondary" onClick={handleSaveRoster} disabled={isSaving} className="h-7 text-xs">
                  <Save className="h-3 w-3 mr-1" /> {isSaving ? '...' : 'SALVA'}
                </Button>
              )}
            </div>
            <div className="p-4 space-y-4">
              <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="font-bold uppercase" placeholder="Nome Squadra..." />
              <div className="flex gap-2">
                <Input placeholder="Aggiungi giocatore..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()} />
                <Button onClick={handleAddPlayer} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {homePlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 border">
                    <Input type="number" className="w-12 text-center font-bold p-1" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                    <span className="flex-1 text-xs font-bold uppercase truncate">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SQUADRA OSPITE */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-3 bg-muted border-b font-black italic">OSPITI</div>
            <div className="p-4 space-y-4">
              <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="font-bold uppercase" placeholder="Nome Avversari..." />
              <div className="flex gap-2">
                <Input type="number" placeholder="Num. maglia..." value={newOpponentNumber} onChange={(e) => setNewOpponentNumber(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()} />
                <Button onClick={handleAddOpponent} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {awayPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-1 rounded-full text-[10px] font-bold">
                    #{p.number}
                    <button onClick={() => onRemovePlayer(p.id)} className="ml-1 text-destructive">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => { setAutoNumberTeam('home'); setAutoNumberDialogOpen(true); }}><Hash className="h-3 w-3 mr-1"/> NUMERA</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setBulkImportDialogOpen(true)}><Upload className="h-3 w-3 mr-1"/> IMPORTA</Button>
          {onSwapTeams && <Button variant="outline" size="sm" className="text-xs" onClick={onSwapTeams}><ArrowLeftRight className="h-3 w-3 mr-1"/> SCAMBIA</Button>}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-12 text-lg font-black uppercase italic" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Inizia Partita →' : 'Configura Squadre'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importa Lista Nomi</DialogTitle></DialogHeader>
          <Textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="Un nome per riga..." className="h-40 font-mono" />
          <Button onClick={() => { 
            const names = bulkImportText.split('\n').filter(n => n.trim());
            if (onBulkAddPlayers) onBulkAddPlayers(names.map(n => n.trim().toUpperCase()));
            setBulkImportDialogOpen(false);
          }} className="w-full">IMPORTA</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auto-numerazione</DialogTitle></DialogHeader>
          <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Quanti?" />
          <Button onClick={handleAutoNumber} className="w-full">APPLICA</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

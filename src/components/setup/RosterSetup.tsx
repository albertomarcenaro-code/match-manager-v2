import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // IMPORTANTE: Risolve la pagina bianca
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Trophy, Hash, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  onSwapTeams?: () => void;
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
  onComplete,
  onSwapTeams,
  isTournamentMode = false,
}: RosterSetupProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');

  // Logica duplicati
  const duplicateHomeNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    homePlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [homePlayers]);

  const canProceed = homePlayers.length >= 1 && awayPlayers.length >= 1 && duplicateHomeNumbers.size === 0;

  const handleAddHome = () => {
    if (newPlayerName.trim()) {
      onAddPlayer('home', { name: newPlayerName.trim().toUpperCase(), number: null });
      setNewPlayerName('');
    }
  };

  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (isNaN(count)) return;
    homePlayers.slice(0, count).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
    setAutoNumberDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-semibold">Configurazione {isTournamentMode ? 'Torneo' : 'Partita'}</span>
          </div>
          <h1 className="text-2xl font-bold">Inserisci le rose</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA */}
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <Label className="text-xs font-bold uppercase text-primary">Squadra Casa</Label>
            <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="font-bold" />
            <div className="flex gap-2">
              <Input placeholder="Nome..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddHome()} />
              <Button onClick={handleAddHome} size="icon"><Plus className="h-4 w-4"/></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {homePlayers.map(p => (
                <div key={p.id} className={cn("flex items-center gap-2 p-2 rounded-md border bg-muted/30", p.number !== null && duplicateHomeNumbers.has(p.number) && "border-destructive")}>
                  <Input type="number" className="w-16 text-center font-bold" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="h-8 w-8 text-muted-foreground"><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>

          {/* SQUADRA OSPITE */}
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <Label className="text-xs font-bold uppercase">Squadra Ospite</Label>
            <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="font-bold" />
            <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
              <p className="text-sm">In questa modalità, gli avversari sono gestiti collettivamente.</p>
            </div>
          </div>
        </div>

        {/* AZIONI RAPIDE */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setAutoNumberDialogOpen(true)} className="gap-2">
            <Hash className="h-4 w-4"/> Auto-numerazione
          </Button>
          <Button variant="outline" size="sm" onClick={onSwapTeams} className="gap-2">
            <ArrowLeftRight className="h-4 w-4"/> Scambia Squadre
          </Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur border-t z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-12 text-lg font-bold shadow-lg" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Conferma e Vai in Campo' : 'Aggiungi almeno 1 giocatore per casa'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auto-Numerazione</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Label>Quanti giocatori numerare?</Label>
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Es: 12" />
            <Button className="w-full" onClick={handleAutoNumber}>Genera Numeri</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

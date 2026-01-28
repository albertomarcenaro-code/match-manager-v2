import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Hash, Upload, ArrowLeftRight, Trophy } from 'lucide-react';
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
  onBulkAddPlayers?: (names: string[]) => void;
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
  onBulkAddPlayers,
  onSwapTeams,
  isTournamentMode = false,
}: RosterSetupProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');

  const duplicateHomeNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    homePlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [homePlayers]);

  const canProceed = homePlayers.length >= 1 && duplicateHomeNumbers.size === 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-bold text-sm uppercase tracking-wider">Configurazione Partita</span>
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Inserisci le rose</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA */}
          <div className="bg-card rounded-2xl shadow-xl border-2 border-primary/10 overflow-hidden">
            <div className="p-4 bg-primary text-primary-foreground">
              <Label className="text-[10px] uppercase font-black opacity-70">Squadra Casa</Label>
              <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="mt-1 font-bold bg-white/10 border-none text-white placeholder:text-white/50" />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Nome giocatore..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (onAddPlayer('home', { name: newPlayerName.toUpperCase(), number: null }), setNewPlayerName(''))} />
                <Button onClick={() => (onAddPlayer('home', { name: newPlayerName.toUpperCase(), number: null }), setNewPlayerName(''))}><Plus className="h-4 w-4"/></Button>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                {homePlayers.map(p => (
                  <div key={p.id} className={cn("flex items-center gap-2 p-2 rounded-lg border bg-muted/30", p.number !== null && duplicateHomeNumbers.has(p.number) && "border-destructive bg-destructive/5")}>
                    <Input type="number" className="w-16 text-center font-bold" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                    <span className="flex-1 font-bold text-sm uppercase truncate">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SQUADRA OSPITE */}
          <div className="bg-card rounded-2xl shadow-xl border-2 border-muted overflow-hidden">
            <div className="p-4 bg-muted border-b">
              <Label className="text-[10px] uppercase font-black opacity-70">Squadra Ospite</Label>
              <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="mt-1 font-bold bg-background/50" />
            </div>
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 h-full min-h-[250px]">
              <Shield className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-bold text-muted-foreground uppercase">Team Avversario</p>
              <p className="text-xs text-muted-foreground italic">Gli eventi saranno registrati per l'intera squadra ospite.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setAutoNumberDialogOpen(true)} className="gap-2 shadow-sm font-bold"><Hash className="h-4 w-4"/> AUTO-NUMERI</Button>
          <Button variant="outline" size="sm" onClick={() => setBulkImportDialogOpen(true)} className="gap-2 shadow-sm font-bold"><Upload className="h-4 w-4"/> IMPORTA</Button>
          <Button variant="outline" size="sm" onClick={onSwapTeams} className="gap-2 shadow-sm font-bold"><ArrowLeftRight className="h-4 w-4"/> SCAMBIA</Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-md border-t z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-14 text-xl font-black uppercase tracking-tighter" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Conferma e Vai in Campo' : 'Inserisci i giocatori'}
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOGS */}
      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Numerazione Automatica</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Quanti giocatori?" />
            <Button className="w-full" onClick={() => {
              homePlayers.slice(0, parseInt(autoNumberCount)).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
              setAutoNumberDialogOpen(false);
            }}>Applica</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importa Lista</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <textarea className="w-full h-40 p-3 rounded-md border bg-muted font-mono text-sm" value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="UN NOME PER R

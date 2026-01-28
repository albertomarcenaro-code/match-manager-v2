import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Hash, Upload, ArrowLeftRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  isTournamentMode?: boolean;
}

export function RosterSetup({
  homeTeamName, awayTeamName, homePlayers, awayPlayers,
  onHomeTeamNameChange, onAwayTeamNameChange, onAddPlayer,
  onUpdatePlayerNumber, onRemovePlayer, onComplete,
  onBulkAddPlayers, onSwapTeams, isTournamentMode = false
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
    <div className="min-h-screen bg-background p-4 pb-32 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-bold text-xs uppercase tracking-widest">Setup Formazioni</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">Inserisci le rose</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* TEAM CASA */}
          <div className="bg-card rounded-2xl shadow-2xl border-2 border-primary/20 overflow-hidden">
            <div className="p-5 bg-primary text-primary-foreground">
              <Label className="text-[10px] uppercase font-black opacity-80">Squadra Casa</Label>
              <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="mt-1 font-black text-lg bg-white/10 border-none placeholder:text-white/40" />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input placeholder="NOME GIOCATORE..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (onAddPlayer('home', { name: newPlayerName.toUpperCase(), number: null }), setNewPlayerName(''))} />
                <Button onClick={() => (onAddPlayer('home', { name: newPlayerName.toUpperCase(), number: null }), setNewPlayerName(''))} className="bg-primary hover:bg-primary/90"><Plus /></Button>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {homePlayers.map(p => (
                  <div key={p.id} className={cn("flex items-center gap-2 p-2 rounded-xl border-2 bg-muted/30", p.number !== null && duplicateHomeNumbers.has(p.number) ? "border-destructive bg-destructive/5" : "border-transparent")}>
                    <Input type="number" className="w-14 text-center font-black" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                    <span className="flex-1 font-bold text-sm uppercase truncate">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TEAM OSPITE */}
          <div className="bg-card rounded-2xl shadow-xl border-2 border-dashed border-muted-foreground/20 overflow-hidden flex flex-col">
            <div className="p-5 bg-muted">
              <Label className="text-[10px] uppercase font-black opacity-60 text-muted-foreground">Squadra Ospite</Label>
              <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="mt-1 font-black text-lg bg-background/50 border-none" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><Shield className="text-muted-foreground/40 w-8 h-8" /></div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Modalità Ospite Collettivo</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="secondary" onClick={() => setAutoNumberDialogOpen(true)} className="font-bold uppercase text-xs"><Hash className="mr-2 h-4 w-4" /> Auto-Numerazione</Button>
          <Button variant="secondary" onClick={() => setBulkImportDialogOpen(true)} className="font-bold uppercase text-xs"><Upload className="mr-2 h-4 w-4" /> Importa Lista</Button>
          <Button variant="secondary" onClick={onSwapTeams} className="font-bold uppercase text-xs"><ArrowLeftRight className="mr-2 h-4 w-4" /> Scambia</Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-xl border-t-2 border-primary/10 z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-16 text-2xl font-black uppercase tracking-tighter shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] bg-primary" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Scendi in Campo →' : 'Configura Formazione'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-black uppercase italic">Numerazione Automatica</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Quanti giocatori?" className="h-12 font-bold" />
            <Button className="w-full h-12 font-bold" onClick={() => {
              homePlayers.slice(0, parseInt(autoNumberCount)).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
              setAutoNumberDialogOpen(false);
            }}>Conferma</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader><DialogTitle className="font-black uppercase italic text-xl">Importa Formazione</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <textarea className="w-full h-64 p-4 rounded-2xl border-2 bg-muted font-mono text-sm focus:border-primary outline-none transition-all" value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="UN NOME PER OGNI RIGA..." />
            <Button className="w-full h-12 font-bold uppercase" onClick={() => {
              const names = bulkImportText.split('\n').filter(n => n.trim() !== '');
              onBulkAddPlayers?.(names);
              setBulkImportText('');
              setBulkImportDialogOpen(false);
            }}>Aggiungi {bulkImportText.split('\n').filter(n => n.trim() !== '').length} Giocatori</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

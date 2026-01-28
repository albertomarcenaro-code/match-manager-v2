import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // CORRETTO: Aggiunta importazione mancante
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Check, Hash, Upload, ArrowLeftRight, Trophy } from 'lucide-react';
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
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');

  // Validazione duplicati (TUA LOGICA ORIGINALE)
  const duplicateHomeNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    homePlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [homePlayers]);

  const hasDuplicates = duplicateHomeNumbers.size > 0;
  const canProceed = homePlayers.length >= 1 && awayPlayers.length >= 1 && !hasDuplicates;

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer('home', { name: newPlayerName.trim().toUpperCase(), number: null });
      setNewPlayerName('');
    }
  };

  const handleBulkImport = () => {
    const names = bulkImportText.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (onBulkAddPlayers) onBulkAddPlayers(names);
    setBulkImportText('');
    setBulkImportDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-semibold text-sm">
              {isTournamentMode ? 'Modalità Torneo' : 'Configurazione Partita Rapida'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Inserisci le rose</h1>
          {hasDuplicates && (
            <p className="text-sm text-destructive font-medium mt-2 animate-pulse">
              ⚠️ Attenzione: ci sono numeri duplicati!
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA - IL TUO DESIGN ORIGINALE */}
          <div className="bg-card rounded-xl shadow-lg border overflow-hidden transition-all hover:shadow-xl">
            <div className="p-4 bg-primary/10 border-b">
              <Label className="text-[10px] uppercase tracking-widest font-black text-primary">Squadra di Casa</Label>
              <Input 
                value={homeTeamName} 
                onChange={(e) => onHomeTeamNameChange(e.target.value)}
                className="mt-2 font-bold bg-background/50 border-primary/20 focus:border-primary"
              />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Aggiungi giocatore..." 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
                <Button onClick={handleAddPlayer} size="icon" className="shrink-0"><Plus className="h-4 w-4"/></Button>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {homePlayers.map(p => (
                  <div key={p.id} className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border bg-muted/20 transition-all",
                    p.number !== null && duplicateHomeNumbers.has(p.number) && "border-destructive bg-destructive/5"
                  )}>
                    <Input 
                      type="number" 
                      className="w-14 text-center font-bold h-9" 
                      placeholder="#"
                      value={p.number ?? ''}
                      onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))}
                    />
                    <span className="flex-1 font-semibold text-sm truncate uppercase">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SQUADRA OSPITE */}
          <div className="bg-card rounded-xl shadow-lg border overflow-hidden transition-all hover:shadow-xl">
            <div className="p-4 bg-muted/10 border-b">
              <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Squadra Ospite</Label>
              <Input 
                value={awayTeamName} 
                onChange={(e) => onAwayTeamNameChange(e.target.value)}
                className="mt-2 font-bold bg-background/50"
              />
            </div>
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-[300px]">
              <div className="p-4 bg-muted rounded-full">
                <Shield className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-bold">Team Avversario</p>
                <p className="text-xs text-muted-foreground px-4">Gli eventi verranno registrati per la squadra ospite collettivamente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* AZIONI RAPIDE - IL TUO TOCCO DI DESIGN */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Button variant="outline" size="sm" onClick={() => setAutoNumberDialogOpen(true)} className="gap-2 bg-background shadow-sm">
            <Hash className="h-4 w-4 text-primary"/> Auto-numerazione
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkImportDialogOpen(true)} className="gap-2 bg-background shadow-sm">
            <Upload className="h-4 w-4 text-primary"/> Importa Lista
          </Button>
          <Button variant="outline" size="sm" onClick={onSwapTeams} className="gap-2 bg-background shadow-sm">
            <ArrowLeftRight className="h-4 w-4 text-primary"/> Scambia
          </Button>
        </div>

        {/* FOOTER FISSO CON IL TASTO GRANDE */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-md border-t z-50">
          <div className="max-w-4xl mx-auto">
            <Button 
              className="w-full h-14 text-xl font-black shadow-xl uppercase tracking-tighter" 
              disabled={!canProceed}
              onClick={onComplete}
            >
              {canProceed ? 'Conferma e Vai in Campo' : 'Completa la configurazione'}
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOGS ORIGINALI */}
      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Auto-numerazione rapida</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Quanti giocatori vuoi numerare?</Label>
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Es: 11" />
            <Button className="w-full" onClick={() => {
              homePlayers.slice(0, parseInt(autoNumberCount)).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
              setAutoNumberDialogOpen(false);
            }}>Applica ai primi {autoNumberCount}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importa lista nomi</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Incolla un nome per riga</Label>
            <textarea 
              className="w-full h-40 p-3 rounded-md border bg-muted font-mono text-sm"
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              placeholder="MARIO ROSSI&#10;LUCA VERDI..."
            />
            <Button className="w-full" onClick={handleBulkImport}>Aggiungi Giocatori</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

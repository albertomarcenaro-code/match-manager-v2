import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // <--- AGGIUNTO: Era questo il problema!
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Hash, ArrowLeftRight, Trophy } from 'lucide-react';
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

  // Validazione duplicati
  const duplicateHomeNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    homePlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [homePlayers]);

  const hasDuplicates = duplicateHomeNumbers.size > 0;
  const canProceed = homePlayers.length >= 1 && awayPlayers.length >= 1 && !hasDuplicates;

  const handleAddPlayer = (team: 'home' | 'away') => {
    if (newPlayerName.trim()) {
      onAddPlayer(team, { name: newPlayerName.trim().toUpperCase(), number: null });
      setNewPlayerName('');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-semibold text-sm">Configurazione Partita</span>
          </div>
          <h1 className="text-2xl font-bold">Inserisci le rose</h1>
          {hasDuplicates && (
            <p className="text-sm text-destructive font-medium mt-2">
              ⚠️ Attenzione: ci sono numeri duplicati!
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 bg-primary/5 border-b">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Squadra di Casa</Label>
              <Input 
                value={homeTeamName} 
                onChange={(e) => onHomeTeamNameChange(e.target.value)}
                className="mt-2 font-bold"
              />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Aggiungi giocatore..." 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer('home')}
                />
                <Button onClick={() => handleAddPlayer('home')} size="icon"><Plus className="h-4 w-4"/></Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {homePlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    <Input 
                      type="number" 
                      className="w-16 text-center font-bold" 
                      placeholder="#"
                      value={p.number ?? ''}
                      onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))}
                    />
                    <span className="flex-1 font-medium text-sm truncate">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SQUADRA OSPITE (Semplificata) */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 bg-muted/5 border-b">
              <Label className="text-[10px] uppercase tracking-widest font-bold">Squadra Ospite</Label>
              <Input 
                value={awayTeamName} 
                onChange={(e) => onAwayTeamNameChange(e.target.value)}
                className="mt-2 font-bold"
              />
            </div>
            <div className="p-4 space-y-4">
               <p className="text-xs text-muted-foreground italic">Inserisci i nomi dei giocatori ospiti o procedi con la lista vuota.</p>
               {/* Qui puoi aggiungere una logica simile a Casa se vuoi i nomi anche per gli ospiti */}
            </div>
          </div>
        </div>

        {/* TASTO PROSEGUI */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur border-t z-50">
          <div className="max-w-4xl mx-auto">
            <Button 
              className="w-full

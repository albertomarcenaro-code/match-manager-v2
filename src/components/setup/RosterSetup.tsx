import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Trophy } from 'lucide-react';

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
  isTournamentMode = false,
}: RosterSetupProps) {
  const [newPlayerName, setNewPlayerName] = useState('');

  const duplicateHomeNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    homePlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [homePlayers]);

  const canProceed = homePlayers.length >= 1 && duplicateHomeNumbers.size === 0;

  const handleAdd = () => {
    if (newPlayerName.trim()) {
      onAddPlayer('home', { name: newPlayerName.trim().toUpperCase(), number: null });
      setNewPlayerName('');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-semibold text-sm">Configurazione</span>
          </div>
          <h1 className="text-2xl font-bold">Inserisci le rose</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <Label className="text-xs font-bold uppercase">Squadra Casa</Label>
            <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="font-bold" />
            <div className="flex gap-2">
              <Input placeholder="Nome giocatore..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
              <Button onClick={handleAdd} size="icon"><Plus className="h-4 w-4"/></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {homePlayers.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                  <Input type="number" className="w-16 text-center font-bold" placeholder="#" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                  <span className="flex-1 font-medium text-sm truncate">{p.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="h-8 w-8 text-muted-foreground"><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border p-4">
            <Label className="text-xs font-bold uppercase">Squadra Ospite</Label>
            <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="font-bold mt-2" />
            <p className="mt-4 text-xs text-muted-foreground italic">In questa modalità, aggiungi i giocatori di casa. Gli ospiti verranno gestiti come squadra avversaria generica.</p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur border-t z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-12 text-lg font-bold" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Conferma e Vai in Campo' : 'Aggiungi almeno 1 giocatore'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

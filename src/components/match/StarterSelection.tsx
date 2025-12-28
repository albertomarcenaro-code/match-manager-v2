import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Player, OpponentPlayer } from '@/types/match';
import { Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarterSelectionProps {
  homePlayers: Player[];
  awayPlayers: OpponentPlayer[];
  period: number;
  onConfirm: (homeStarters: string[], awayStarters: string[]) => void;
}

export function StarterSelection({
  homePlayers,
  awayPlayers,
  period,
  onConfirm,
}: StarterSelectionProps) {
  const eligibleHomePlayers = homePlayers.filter(p => p.number !== null);
  const [selectedHome, setSelectedHome] = useState<Set<string>>(
    new Set(eligibleHomePlayers.filter(p => p.isStarter || p.isOnField).map(p => p.id))
  );
  const [selectedAway, setSelectedAway] = useState<Set<string>>(
    new Set(awayPlayers.filter(p => p.isOnField).map(p => p.id))
  );

  const toggleHome = (playerId: string) => {
    const newSet = new Set(selectedHome);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    setSelectedHome(newSet);
  };

  const toggleAway = (playerId: string) => {
    const newSet = new Set(selectedAway);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    setSelectedAway(newSet);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedHome), Array.from(selectedAway));
  };

  const canConfirm = selectedHome.size > 0 && selectedAway.size > 0;

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground mb-4">
          <Users className="h-5 w-5" />
          <span className="font-semibold">
            {period === 0 ? 'Seleziona i titolari' : `Titolari per il ${period + 1}° tempo`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Seleziona i giocatori che inizieranno in campo per entrambe le squadre
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Home Team */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="p-3 gradient-header text-primary-foreground flex items-center justify-between">
            <span className="font-bold">Casa</span>
            <span className="text-sm opacity-80">{selectedHome.size} selezionati</span>
          </div>
          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
            {eligibleHomePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => toggleHome(player.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg border transition-all",
                  selectedHome.has(player.id)
                    ? "bg-on-field/10 border-on-field/50"
                    : "bg-muted/50 border-border hover:border-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                  selectedHome.has(player.id)
                    ? "bg-on-field text-on-field-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {player.number}
                </span>
                <span className="flex-1 text-left text-sm font-medium">{player.name}</span>
                {selectedHome.has(player.id) && (
                  <Check className="h-5 w-5 text-on-field" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Away Team */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="p-3 bg-muted flex items-center justify-between">
            <span className="font-bold">Ospiti</span>
            <span className="text-sm opacity-80">{selectedAway.size} selezionati</span>
          </div>
          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
            {awayPlayers.map(player => (
              <button
                key={player.id}
                onClick={() => toggleAway(player.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg border transition-all",
                  selectedAway.has(player.id)
                    ? "bg-on-field/10 border-on-field/50"
                    : "bg-muted/50 border-border hover:border-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                  selectedAway.has(player.id)
                    ? "bg-on-field text-on-field-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {player.number}
                </span>
                <span className="flex-1 text-left text-sm font-medium">#{player.number}</span>
                {selectedAway.has(player.id) && (
                  <Check className="h-5 w-5 text-on-field" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          <Check className="h-5 w-5" />
          Conferma titolari
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player, OpponentPlayer } from '@/types/match';
import { Plus, Trash2, Users, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RosterSetupProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: OpponentPlayer[];
  onHomeTeamNameChange: (name: string) => void;
  onAwayTeamNameChange: (name: string) => void;
  onAddPlayer: (name: string) => void;
  onUpdatePlayerNumber: (playerId: string, number: number | null) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddOpponentPlayer: (number: number) => void;
  onRemoveOpponentPlayer: (playerId: string) => void;
  onComplete: () => void;
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
  onAddOpponentPlayer,
  onRemoveOpponentPlayer,
  onComplete,
}: RosterSetupProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const handleUpdateNumber = (playerId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    if (numValue !== null && isNaN(numValue)) return;
    onUpdatePlayerNumber(playerId, numValue);
  };

  const handleAddOpponent = () => {
    const num = parseInt(newOpponentNumber, 10);
    if (!isNaN(num) && num > 0) {
      onAddOpponentPlayer(num);
      setNewOpponentNumber('');
    }
  };

  const eligiblePlayers = homePlayers.filter(p => p.number !== null);
  const canProceed = eligiblePlayers.length >= 1 && awayPlayers.length >= 1;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Configurazione Partita</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Inserisci le rose</h1>
          <p className="text-muted-foreground mt-2">
            Aggiungi i giocatori e assegna i numeri di maglia
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Home Team */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 gradient-header text-primary-foreground">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5" />
                <span className="font-bold">Squadra di casa</span>
              </div>
              <Input
                value={homeTeamName}
                onChange={(e) => onHomeTeamNameChange(e.target.value)}
                placeholder="Nome squadra"
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Add Player */}
              <div className="flex gap-2">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nome giocatore"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
                <Button onClick={handleAddPlayer} size="icon" className="flex-shrink-0">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Players List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {homePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border",
                      player.number !== null
                        ? "bg-on-field/5 border-on-field/30"
                        : "bg-muted/50 border-border"
                    )}
                  >
                    <Input
                      type="number"
                      min="1"
                      value={player.number ?? ''}
                      onChange={(e) => handleUpdateNumber(player.id, e.target.value)}
                      placeholder="#"
                      className="w-16 text-center"
                    />
                    <span className="flex-1 font-medium truncate">{player.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemovePlayer(player.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {homePlayers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Nessun giocatore inserito
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {eligiblePlayers.length} giocatori con numero assegnato
              </p>
            </div>
          </div>

          {/* Away Team */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 bg-muted">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5" />
                <span className="font-bold">Squadra ospite</span>
              </div>
              <Input
                value={awayTeamName}
                onChange={(e) => onAwayTeamNameChange(e.target.value)}
                placeholder="Nome squadra avversaria"
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Add Opponent */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={newOpponentNumber}
                  onChange={(e) => setNewOpponentNumber(e.target.value)}
                  placeholder="Numero maglia"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()}
                />
                <Button onClick={handleAddOpponent} size="icon" className="flex-shrink-0">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Opponents List */}
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                {awayPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted border border-border"
                  >
                    <span className="font-bold">#{player.number}</span>
                    <button
                      onClick={() => onRemoveOpponentPlayer(player.id)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {awayPlayers.length === 0 && (
                  <p className="w-full text-center text-sm text-muted-foreground py-4">
                    Nessun numero inserito
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {awayPlayers.length} giocatori inseriti
              </p>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border">
          <div className="max-w-4xl mx-auto">
            <Button
              size="lg"
              className="w-full gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={onComplete}
              disabled={!canProceed}
            >
              <Check className="h-5 w-5" />
              Continua alla partita
            </Button>
            {!canProceed && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Inserisci almeno un giocatore per squadra con numero assegnato
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

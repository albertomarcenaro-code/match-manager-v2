import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Player, OpponentPlayer } from '@/types/match';
import { Target, RefreshCw, Square } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TeamPanelProps {
  teamName: string;
  players: (Player | OpponentPlayer)[];
  isHome: boolean;
  isRunning: boolean;
  onGoal: (playerId: string) => void;
  onOwnGoal: (playerId: string) => void;
  onSubstitution: (outId: string, inId: string) => void;
  onYellowCard: (playerId: string) => void;
  onRedCard: (playerId: string) => void;
}

type ActionType = 'goal' | 'ownGoal' | 'substitution' | 'yellowCard' | 'redCard';

export function TeamPanel({
  teamName,
  players,
  isHome,
  isRunning,
  onGoal,
  onOwnGoal,
  onSubstitution,
  onYellowCard,
  onRedCard,
}: TeamPanelProps) {
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<string>('');

  const onFieldPlayers = players.filter(p => p.isOnField);
  const benchPlayers = players.filter(p => !p.isOnField);

  const getPlayerDisplay = (player: Player | OpponentPlayer) => {
    if ('name' in player && player.name) {
      return `${player.number} - ${player.name}`;
    }
    return `#${player.number}`;
  };

  const handleAction = (playerId: string) => {
    switch (actionType) {
      case 'goal':
        onGoal(playerId);
        break;
      case 'ownGoal':
        onOwnGoal(playerId);
        break;
      case 'yellowCard':
        onYellowCard(playerId);
        break;
      case 'redCard':
        onRedCard(playerId);
        break;
    }
    setActionType(null);
  };

  const handleSubstitution = (playerInId: string) => {
    if (selectedPlayerOut) {
      onSubstitution(selectedPlayerOut, playerInId);
      setSelectedPlayerOut('');
      setActionType(null);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      {/* Team Header */}
      <div className={cn(
        "p-3 text-center",
        isHome ? "gradient-header text-primary-foreground" : "bg-muted"
      )}>
        <h3 className="font-bold truncate">{teamName}</h3>
      </div>

      {/* Players List */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          In campo ({onFieldPlayers.length})
        </p>
        <div className="space-y-1">
          {onFieldPlayers.map(player => (
            <div
              key={player.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-on-field/10 border border-on-field/20"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-on-field text-on-field-foreground text-sm font-bold">
                {player.number}
              </span>
              <span className="flex-1 text-sm font-medium truncate">
                {'name' in player ? player.name : ''}
              </span>
            </div>
          ))}
        </div>

        {benchPlayers.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
              Panchina ({benchPlayers.length})
            </p>
            <div className="space-y-1">
              {benchPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-on-bench/10 border border-on-bench/20"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-on-bench text-on-bench-foreground text-sm font-bold">
                    {player.number}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">
                    {'name' in player ? player.name : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {isRunning && (
        <div className="p-3 border-t border-border grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="gap-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={() => setActionType('goal')}
          >
            <Target className="h-4 w-4" />
            Gol
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setActionType('ownGoal')}
          >
            <Target className="h-4 w-4 rotate-180" />
            Autogol
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setActionType('substitution')}
          >
            <RefreshCw className="h-4 w-4" />
            Cambio
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-warning hover:text-warning"
            onClick={() => setActionType('yellowCard')}
          >
            <Square className="h-4 w-4 fill-warning" />
            Giallo
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-destructive hover:text-destructive col-span-2"
            onClick={() => setActionType('redCard')}
          >
            <Square className="h-4 w-4 fill-destructive" />
            Rosso
          </Button>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={() => {
        setActionType(null);
        setSelectedPlayerOut('');
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'goal' && 'Seleziona marcatore'}
              {actionType === 'ownGoal' && 'Seleziona autore autogol'}
              {actionType === 'substitution' && (selectedPlayerOut ? 'Seleziona chi entra' : 'Seleziona chi esce')}
              {actionType === 'yellowCard' && 'Cartellino giallo a'}
              {actionType === 'redCard' && 'Cartellino rosso a'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {actionType === 'substitution' ? (
              !selectedPlayerOut ? (
                // Select player going out
                onFieldPlayers.map(player => (
                  <button
                    key={player.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                    onClick={() => setSelectedPlayerOut(player.id)}
                  >
                    <span className="w-10 h-10 flex items-center justify-center rounded-full bg-on-field text-on-field-foreground font-bold">
                      {player.number}
                    </span>
                    <span className="font-medium">{getPlayerDisplay(player)}</span>
                  </button>
                ))
              ) : (
                // Select player coming in
                benchPlayers.map(player => (
                  <button
                    key={player.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                    onClick={() => handleSubstitution(player.id)}
                  >
                    <span className="w-10 h-10 flex items-center justify-center rounded-full bg-on-bench text-on-bench-foreground font-bold">
                      {player.number}
                    </span>
                    <span className="font-medium">{getPlayerDisplay(player)}</span>
                  </button>
                ))
              )
            ) : (
              // Goal, own goal, cards - select from on-field players
              onFieldPlayers.map(player => (
                <button
                  key={player.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                  onClick={() => handleAction(player.id)}
                >
                  <span className="w-10 h-10 flex items-center justify-center rounded-full bg-on-field text-on-field-foreground font-bold">
                    {player.number}
                  </span>
                  <span className="font-medium">{getPlayerDisplay(player)}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

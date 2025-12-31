import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Player, OpponentPlayer, MatchEvent } from '@/types/match';
import { Target, RefreshCw, Square } from 'lucide-react';
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
  events: MatchEvent[];
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
  events,
  onGoal,
  onOwnGoal,
  onSubstitution,
  onYellowCard,
  onRedCard,
}: TeamPanelProps) {
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<string>('');

  const onFieldPlayers = players.filter(p => p.isOnField && !p.isExpelled);
  const benchPlayers = players.filter(p => !p.isOnField && !p.isExpelled);
  const expelledPlayers = players.filter(p => p.isExpelled);
  const availableForSubstitution = benchPlayers; // Already excludes expelled players

  // Get performance stats for a player
  const getPlayerStats = (playerId: string) => {
    const team = isHome ? 'home' : 'away';
    const goals = events.filter(e => e.type === 'goal' && e.team === team && e.playerId === playerId).length;
    const hasYellowCard = events.some(e => e.type === 'yellow_card' && e.team === team && e.playerId === playerId);
    const hasRedCard = events.some(e => e.type === 'red_card' && e.team === team && e.playerId === playerId);
    return { goals, hasYellowCard, hasRedCard };
  };

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

  // Render performance badges for a player
  const renderBadges = (playerId: string) => {
    const stats = getPlayerStats(playerId);
    return (
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Goal badges */}
        {Array.from({ length: stats.goals }).map((_, i) => (
          <span key={`goal-${i}`} className="text-xs">⚽</span>
        ))}
        {/* Yellow card badge */}
        {stats.hasYellowCard && (
          <span className="w-3 h-4 bg-warning rounded-sm" title="Ammonizione" />
        )}
        {/* Red card badge */}
        {stats.hasRedCard && (
          <span className="w-3 h-4 bg-destructive rounded-sm" title="Espulsione" />
        )}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      {/* Team Header */}
      <div className={cn(
        "p-3 text-center",
        isHome ? "gradient-home text-team-home-foreground" : "gradient-away text-team-away-foreground"
      )}>
        <h3 className="font-bold team-name-fluid">{teamName}</h3>
      </div>

      {/* Action Buttons - Vertical Layout (FIRST when match is running) */}
      {isRunning && (
        <div className="p-3 border-b border-border flex flex-col gap-2">
          {/* ROW 1: GOL */}
          <Button
            size="sm"
            className={cn(
              "w-full gap-2",
              isHome 
                ? "bg-team-home hover:bg-team-home/90 text-team-home-foreground" 
                : "bg-team-away hover:bg-team-away/90 text-team-away-foreground"
            )}
            onClick={() => setActionType('goal')}
          >
            <Target className="h-4 w-4" />
            GOL
          </Button>
          
          {/* ROW 2: AUTOGOL - Now opens selector */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setActionType('ownGoal')}
          >
            <Target className="h-4 w-4 rotate-180" />
            AUTOGOL
          </Button>
          
          {/* ROW 3: GIALLO */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 text-warning hover:text-warning border-warning/50 hover:border-warning hover:bg-warning/10"
            onClick={() => setActionType('yellowCard')}
          >
            <Square className="h-4 w-4 fill-warning" />
            GIALLO
          </Button>
          
          {/* ROW 4: ROSSO */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive border-destructive/50 hover:border-destructive hover:bg-destructive/10"
            onClick={() => setActionType('redCard')}
          >
            <Square className="h-4 w-4 fill-destructive" />
            ROSSO
          </Button>
          
          {/* ROW 5: SOSTITUZIONE - Full width */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 mt-1"
            onClick={() => setActionType('substitution')}
          >
            <RefreshCw className="h-4 w-4" />
            SOSTITUZIONE
          </Button>
        </div>
      )}

      {/* Players List */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          In campo ({onFieldPlayers.length})
        </p>
        <div className="space-y-1 max-h-[180px] overflow-y-auto">
          {onFieldPlayers.map(player => (
            <div
              key={player.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-on-field/10 border border-on-field/20"
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-on-field text-on-field-foreground text-xs font-bold flex-shrink-0">
                {player.number}
              </span>
              <span className="flex-1 text-xs font-medium truncate">
                {'name' in player ? player.name : ''}
              </span>
              {renderBadges(player.id)}
            </div>
          ))}
        </div>

        {benchPlayers.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
              Panchina ({benchPlayers.length})
            </p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {benchPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-on-bench/10 border border-on-bench/20"
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-on-bench text-on-bench-foreground text-xs font-bold flex-shrink-0">
                    {player.number}
                  </span>
                  <span className="flex-1 text-xs font-medium truncate">
                    {'name' in player ? player.name : ''}
                  </span>
                  {renderBadges(player.id)}
                </div>
              ))}
            </div>
          </>
        )}

        {expelledPlayers.length > 0 && (
          <>
            <p className="text-xs font-medium text-destructive uppercase tracking-wider pt-2">
              Espulsi ({expelledPlayers.length})
            </p>
            <div className="space-y-1 max-h-[80px] overflow-y-auto">
              {expelledPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 opacity-60"
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex-shrink-0">
                    {player.number}
                  </span>
                  <span className="flex-1 text-xs font-medium truncate line-through">
                    {'name' in player ? player.name : ''}
                  </span>
                  <span className="w-3 h-4 bg-destructive rounded-sm flex-shrink-0" title="Espulso" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={() => {
        setActionType(null);
        setSelectedPlayerOut('');
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
          <DialogTitle>
              {actionType === 'goal' && 'Seleziona marcatore'}
              {actionType === 'ownGoal' && 'Seleziona chi ha commesso l\'autogol'}
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
                // Select player coming in - only available (non-expelled) bench players
                availableForSubstitution.map(player => (
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
              // Goal, cards - select from on-field players
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

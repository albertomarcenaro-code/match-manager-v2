import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Player } from '@/types/match';
import { Plus, Trash2, Users, Shield, Check, Hash, Upload, Save, ArrowLeftRight, Trophy, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournament';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RosterSetupProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  onHomeTeamNameChange: (name: string) => void;
  onAwayTeamNameChange: (name: string) => void;
  onAddPlayer: (name: string) => void;
  onUpdatePlayerNumber: (playerId: string, number: number | null) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddOpponentPlayer: (number: number) => void;
  onRemoveOpponentPlayer: (playerId: string) => void;
  onComplete: () => void;
  onBulkAddPlayers?: (names: string[]) => void;
  onSwapTeams?: () => void;
  onCreatePlayersWithNumbers?: (count: number) => void;
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
  onAddOpponentPlayer,
  onRemoveOpponentPlayer,
  onComplete,
  onBulkAddPlayers,
  onSwapTeams,
  onCreatePlayersWithNumbers,
  isTournamentMode = false,
}: RosterSetupProps) {
  const { user, isGuest } = useAuth();
  const tournamentData = useTournament();
  const tournament = tournamentData?.tournament;
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [autoNumberTeam, setAutoNumberTeam] = useState<'home' | 'away'>('home');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [saveStatusByPlayerId, setSaveStatusByPlayerId] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const saveTimerRef = useRef<number | null>(null);

  // Validazione duplicati
  const duplicateHomeNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    homePlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [homePlayers]);

  const duplicateAwayNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    awayPlayers.forEach(p => p.number !== null && (counts[p.number] = (counts[p.number] || 0) + 1));
    return new Set(Object.entries(counts).filter(([_, c]) => c > 1).map(([n]) => parseInt(n)));
  }, [awayPlayers]);

  const hasDuplicates = duplicateHomeNumbers.size > 0 || duplicateAwayNumbers.size > 0;
  const canProceed = homePlayers.filter(p => p.number !== null).length >= 1 && awayPlayers.length >= 1 && !hasDuplicates;

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim().toUpperCase());
      setNewPlayerName('');
    }
  };

  const handleUpdateNumber = (playerId: string, value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    if (num !== null && isNaN(num)) return;
    onUpdatePlayerNumber(playerId, num);
  };

  const handleAddOpponent = () => {
    const num = parseInt(newOpponentNumber, 10);
    if (!isNaN(num)) {
      onAddOpponentPlayer(num);
      setNewOpponentNumber('');
    }
  };

  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (isNaN(count) || count <= 0) return;

    if (autoNumberTeam === 'home') {
      const withoutNum = homePlayers.filter(p => p.number === null);
      withoutNum.slice(0, count).forEach((p, i) => onUpdatePlayerNumber(p.id, i + 1));
    } else {
      for (let i = 1; i <= count; i++) onAddOpponentPlayer(i);
    }
    setAutoNumberDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
            {isTournamentMode ? <Trophy className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            <span className="font-semibold">
              {isTournamentMode && tournament?.isActive ? tournament.name : 'Configurazione Partita'}
            </span>
          </div>
          <h1 className="text-2xl font-bold">Inserisci le rose</h1>
          {hasDuplicates && (
            <p className="text-sm text-destructive font-medium mt-2 animate-pulse">
              ⚠️ Attenzione: ci sono numeri duplicati!
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 bg-primary/5 border-b">
              <Label className="text-xs uppercase tracking-widest font-bold text-primary">Squadra di Casa</Label>
              <Input 
                value={homeTeamName} 
                onChange={(e) => onHomeTeamNameChange(e.target.value)}
                className="mt-2 font-bold"
              />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Nome giocatore..." 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
                <Button onClick={handleAddPlayer} size="icon"><Plus className="h-4 w-4"/></Button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {homePlayers.map(p => (
                  <div key={p.id} className={cn(
                    "flex items-center gap-2 p-2 rounded-md border bg-muted/30",
                    p.number !== null && duplicateHomeNumbers.has(p.number) && "border-destructive bg-destructive/5"
                  )}>
                    <Input 
                      type="number" 
                      className="w-16 text-center font-bold" 
                      placeholder="#"
                      value={p.number ?? ''}
                      onChange={(e) => handleUpdateNumber(p.id, e.target.value)}
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

          {/* SQUADRA OSPITE */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 bg-muted/5 border-b">
              <Label className="text-xs uppercase tracking-widest font-bold">Squadra Ospite</Label>
              <Input 
                value={awayTeamName} 
                onChange={(e) => onAwayTeamNameChange(e.target.value)}
                className="mt-2 font-bold"
              />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  placeholder="Numero maglia..." 
                  value={newOpponentNumber}
                  onChange={(e) => setNewOpponentNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()}
                />
                <Button onClick={handleAddOpponent} variant="outline" size="icon"><Plus className="h-4 w-4"/></Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {awayPlayers.map(p => (
                  <div key={p.id} className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full border bg-muted",
                    p.number !== null && duplicateAwayNumbers.has(p.number) && "border-destructive text-destructive"
                  )}>
                    <span className="font-bold text-xs">#{p.number}</span>
                    <button onClick={() => onRemoveOpponentPlayer(p.id)}><Trash2 className="h-3 w-3 ml-1 opacity-50 hover:opacity-100"/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AZIONI RAPIDE */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setAutoNumberTeam('home'); setAutoNumberDialogOpen(true); }} className="gap-2">
            <Hash className="h-4 w-4"/> Auto-numerazione Casa
          </Button>
          <Button variant="outline" size="sm" onClick={onSwapTeams} className="gap-2">
            <ArrowLeftRight className="h-4 w-4"/> Scambia Squadre
          </Button>
        </div>

        {/* TASTO PROSEGUI */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur border-t">
          <div className="max-w-4xl mx-auto">
            <Button 
              className="w-full h-12 text-lg font-bold shadow-lg" 
              disabled={!canProceed}
              onClick={onComplete}
            >
              {canProceed ? 'Conferma e Vai in Campo' : 'Inserisci almeno 1 giocatore per squadra'}
            </Button>
          </div>
        </div>

      </div>

      {/* Dialog Auto-Numerazione */}
      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generazione Automatica</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Label>Quanti giocatori vuoi numerare?</Label>
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Esempio: 12" />
            <Button className="w-full" onClick={handleAutoNumber}>Genera Numeri</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

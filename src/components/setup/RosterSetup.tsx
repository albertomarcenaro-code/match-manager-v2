import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Player } from '@/types/match';
import { Plus, Trash2, Users, Shield, Check, Hash, Upload, Save, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
}: RosterSetupProps) {
  const { user, isGuest } = useAuth();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [autoNumberTeam, setAutoNumberTeam] = useState<'home' | 'away'>('home');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved data for logged-in users
  useEffect(() => {
    if (user && !isGuest) {
      loadUserData();
    }
  }, [user, isGuest]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load profile (team name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.team_name) {
        onHomeTeamNameChange(profile.team_name);
      }

      // Load players
      const { data: players } = await supabase
        .from('players')
        .select('name, number')
        .eq('user_id', user.id)
        .order('name');

      if (players && players.length > 0 && onBulkAddPlayers) {
        // Clear existing and load from DB
        const playerNames = players.map(p => p.name);
        onBulkAddPlayers(playerNames);
        
        // After a small delay, assign numbers
        setTimeout(() => {
          players.forEach(p => {
            if (p.number) {
              const matchingPlayer = homePlayers.find(hp => hp.name === p.name);
              if (matchingPlayer) {
                onUpdatePlayerNumber(matchingPlayer.id, p.number);
              }
            }
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleBulkImport = () => {
    const lines = bulkImportText.split('\n').filter(line => line.trim());
    let importedCount = 0;
    
    lines.forEach(line => {
      const name = line.trim().toUpperCase();
      if (name && !homePlayers.some(p => p.name === name)) {
        onAddPlayer(name);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      toast.success(`Importati ${importedCount} giocatori`);
      setBulkImportText('');
      setBulkImportDialogOpen(false);
    } else {
      toast.error('Nessun nuovo giocatore da importare');
    }
  };

  const handleSaveRoster = async () => {
    if (!user || isGuest) {
      toast.error('Devi essere loggato per salvare la rosa');
      return;
    }

    setIsSaving(true);

    try {
      // Save team name to profile
      await supabase
        .from('profiles')
        .update({ team_name: homeTeamName })
        .eq('user_id', user.id);

      // Delete existing players
      await supabase
        .from('players')
        .delete()
        .eq('user_id', user.id);

      // Insert current players
      const playersToInsert = homePlayers.map(p => ({
        user_id: user.id,
        name: p.name,
        number: p.number,
      }));

      if (playersToInsert.length > 0) {
        await supabase
          .from('players')
          .insert(playersToInsert);
      }

      toast.success('Rosa salvata nel database!');
    } catch (error) {
      console.error('Error saving roster:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (isNaN(count) || count <= 0) {
      toast.error('Inserisci un numero valido');
      return;
    }
    
    if (autoNumberTeam === 'home') {
      const playersWithoutNumbers = homePlayers.filter(p => p.number === null);
      const toAssign = Math.min(count, playersWithoutNumbers.length);
      
      if (toAssign === 0) {
        toast.info('Tutti i giocatori hanno già un numero assegnato');
        setAutoNumberDialogOpen(false);
        setAutoNumberCount('');
        return;
      }

      const usedNumbers = new Set(homePlayers.filter(p => p.number !== null).map(p => p.number));
      let nextNumber = 1;
      
      for (let i = 0; i < toAssign; i++) {
        while (usedNumbers.has(nextNumber)) {
          nextNumber++;
        }
        onUpdatePlayerNumber(playersWithoutNumbers[i].id, nextNumber);
        usedNumbers.add(nextNumber);
        nextNumber++;
      }

      toast.success(`Assegnati numeri a ${toAssign} giocatori`);
    } else {
      const usedNumbers = new Set(awayPlayers.map(p => p.number));
      let nextNumber = 1;
      let created = 0;
      
      for (let i = 0; i < count; i++) {
        while (usedNumbers.has(nextNumber)) {
          nextNumber++;
        }
        onAddOpponentPlayer(nextNumber);
        usedNumbers.add(nextNumber);
        nextNumber++;
        created++;
      }

      toast.success(`Creati ${created} giocatori avversari con numeri progressivi`);
    }
    
    setAutoNumberDialogOpen(false);
    setAutoNumberCount('');
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
          {isLoading && (
            <p className="text-sm text-primary mt-2">Caricamento dati salvati...</p>
          )}
        </div>

        {/* Swap Teams Button */}
        {onSwapTeams && (
          <div className="flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Scambia Squadre
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Scambiare le squadre?</AlertDialogTitle>
                  <AlertDialogDescription>
                    I dati della squadra di casa e della squadra ospite verranno invertiti. 
                    Utile quando la tua squadra gioca in trasferta.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    onSwapTeams();
                    toast.success('Squadre scambiate');
                  }}>
                    Scambia
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Home Team */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 gradient-home text-team-home-foreground">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-bold">Squadra di casa</span>
                </div>
                {user && !isGuest && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={handleSaveRoster}
                    disabled={isSaving}
                    className="gap-1 h-8"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Salvo...' : 'Salva'}
                  </Button>
                )}
              </div>
              <Input
                value={homeTeamName}
                onChange={(e) => onHomeTeamNameChange(e.target.value)}
                placeholder="Nome squadra"
                className="bg-team-home-foreground/10 border-team-home-foreground/20 text-team-home-foreground placeholder:text-team-home-foreground/50"
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
                <Button 
                  onClick={() => setBulkImportDialogOpen(true)} 
                  size="icon" 
                  variant="outline"
                  className="flex-shrink-0"
                  title="Importa da Excel"
                >
                  <Upload className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => {
                    setAutoNumberTeam('home');
                    setAutoNumberDialogOpen(true);
                  }} 
                  size="icon" 
                  variant="outline"
                  className="flex-shrink-0"
                  title="Auto-numerazione"
                >
                  <Hash className="h-5 w-5" />
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
            <div className="p-4 gradient-away text-team-away-foreground">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5" />
                <span className="font-bold">Squadra ospite</span>
              </div>
              <Input
                value={awayTeamName}
                onChange={(e) => onAwayTeamNameChange(e.target.value)}
                placeholder="Nome squadra avversaria"
                className="bg-team-away-foreground/10 border-team-away-foreground/20 text-team-away-foreground placeholder:text-team-away-foreground/50"
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
                <Button 
                  onClick={() => {
                    setAutoNumberTeam('away');
                    setAutoNumberDialogOpen(true);
                  }} 
                  size="icon" 
                  variant="outline"
                  className="flex-shrink-0"
                  title="Auto-numerazione ospiti"
                >
                  <Hash className="h-5 w-5" />
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

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importa giocatori da Excel</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Copia e incolla i nomi dei giocatori da Excel (uno per riga):
            </p>
            <Textarea
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              placeholder="COGNOME NOME&#10;ALTRO GIOCATORE&#10;..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleBulkImport}>
              <Upload className="h-4 w-4 mr-2" />
              Importa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Numbering Dialog */}
      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Auto-numerazione {autoNumberTeam === 'home' ? 'Casa' : 'Ospiti'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {autoNumberTeam === 'home' 
                ? 'Quanti giocatori vuoi numerare? I numeri verranno assegnati progressivamente (1, 2, 3...) ai primi giocatori senza numero.'
                : 'Quanti giocatori avversari vuoi creare? Verranno creati con numeri progressivi (1, 2, 3...).'}
            </p>
            <Input
              type="number"
              min="1"
              value={autoNumberCount}
              onChange={(e) => setAutoNumberCount(e.target.value)}
              placeholder="Numero di giocatori"
              onKeyDown={(e) => e.key === 'Enter' && handleAutoNumber()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoNumberDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleAutoNumber}>
              Assegna numeri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

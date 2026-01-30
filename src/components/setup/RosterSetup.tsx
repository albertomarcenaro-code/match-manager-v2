import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Player } from '@/types/match';
import { Plus, Trash2, Shield, Hash, Upload, Save, ArrowLeftRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RosterSetupProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  onHomeTeamNameChange: (name: string) => void;
  onAwayTeamNameChange: (name: string) => void;
  onAddPlayer: (name: string) => void; // Aggiunge a casa
  onUpdatePlayerNumber: (playerId: string, number: number | null) => void;
  onRemovePlayer: (playerId: string) => void; // Rimuove da casa
  onAddOpponentPlayer: (number: number) => void; // Aggiunge a ospiti
  onRemoveOpponentPlayer: (playerId: string) => void; // Rimuove da ospiti
  onComplete: () => void;
  onBulkAddPlayers?: (names: string[]) => void;
  onSwapTeams?: () => void;
  onCreatePlayersWithNumbers?: (count: number) => void; // Per auto-numerazione
  pendingTournamentName?: string | null;
  isTournamentMode?: boolean;
}

export function RosterSetup({
  homeTeamName, awayTeamName, homePlayers, awayPlayers,
  onHomeTeamNameChange, onAwayTeamNameChange, onAddPlayer,
  onUpdatePlayerNumber, onRemovePlayer, onAddOpponentPlayer,
  onRemoveOpponentPlayer, onComplete, onBulkAddPlayers,
  onSwapTeams, onCreatePlayersWithNumbers, isTournamentMode
}: RosterSetupProps) {
  const { user, isGuest } = useAuth();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newOpponentNumber, setNewOpponentNumber] = useState('');
  const [autoNumberDialogOpen, setAutoNumberDialogOpen] = useState(false);
  const [autoNumberCount, setAutoNumberCount] = useState('');
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Azione: Aggiungi giocatore Casa
  const handleAddHome = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim().toUpperCase());
      setNewPlayerName('');
    }
  };

  // Azione: Aggiungi giocatore Ospite
  const handleAddAway = () => {
    const num = parseInt(newOpponentNumber, 10);
    if (!isNaN(num)) {
      onAddOpponentPlayer(num);
      setNewOpponentNumber('');
    }
  };

  // Azione: Auto-numerazione (Chiama onCreatePlayersWithNumbers)
  const handleAutoNumber = () => {
    const count = parseInt(autoNumberCount, 10);
    if (!isNaN(count) && onCreatePlayersWithNumbers) {
      onCreatePlayersWithNumbers(count);
      setAutoNumberDialogOpen(false);
      toast.success(`Generate formazioni da ${count} giocatori`);
    }
  };

  const canProceed = homePlayers.length > 0 && awayPlayers.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-4">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary italic">Configurazione</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SQUADRA CASA */}
          <div className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden border-primary/20">
            <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center font-black italic uppercase tracking-widest">
              <span>CASA</span>
              {user && !isGuest && (
                <Button size="sm" variant="secondary" onClick={async () => {
                  setIsSaving(true);
                  await supabase.from('profiles').update({ team_name: homeTeamName }).eq('user_id', user.id);
                  toast.success("Squadra salvata!");
                  setIsSaving(false);
                }} className="h-7 text-[10px] font-bold">
                  <Save className="h-3 w-3 mr-1" /> {isSaving ? '...' : 'SALVA'}
                </Button>
              )}
            </div>
            <div className="p-4 space-y-4">
              <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} className="font-bold uppercase" placeholder="Nome Squadra..." />
              <div className="flex gap-2">
                <Input placeholder="Nome giocatore..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddHome()} />
                <Button onClick={handleAddHome} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {homePlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                    <Input type="number" className="w-12 text-center font-black p-0 h-8" value={p.number ?? ''} onChange={(e) => onUpdatePlayerNumber(p.id, e.target.value === '' ? null : parseInt(e.target.value))} />
                    <span className="flex-1 text-sm font-bold uppercase truncate">{p.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePlayer(p.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SQUADRA OSPITE */}
          <div className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden border-muted-foreground/20">
            <div className="p-4 bg-muted border-b font-black italic uppercase tracking-widest text-muted-foreground">OSPITI</div>
            <div className="p-4 space-y-4">
              <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} className="font-bold uppercase" placeholder="Nome Avversari..." />
              <div className="flex gap-2">
                <Input type="number" placeholder="Numero maglia..." value={newOpponentNumber} onChange={(e) => setNewOpponentNumber(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddAway()} />
                <Button onClick={handleAddAway} variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {awayPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full text-xs font-black">
                    #{p.number}
                    <button onClick={() => onRemoveOpponentPlayer(p.id)} className="ml-1 text-destructive">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLLI CENTRALI */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" className="rounded-full font-bold" onClick={() => setAutoNumberDialogOpen(true)}>
            <Hash className="h-4 w-4 mr-2" /> AUTO-NUMERA
          </Button>
          <Button variant="outline" className="rounded-full font-bold" onClick={() => setBulkImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> IMPORTA LISTA
          </Button>
          {onSwapTeams && (
            <Button variant="outline" className="rounded-full font-bold" onClick={onSwapTeams}>
              <ArrowLeftRight className="h-4 w-4 mr-2" /> SCAMBIA SQUADRE
            </Button>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t-2 z-50">
          <div className="max-w-4xl mx-auto">
            <Button className="w-full h-14 text-xl font-black uppercase italic tracking-widest" disabled={!canProceed} onClick={onComplete}>
              {canProceed ? 'Continua alla Partita →' : 'Configura Squadre'}
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOGS */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-black italic uppercase">Importa Giocatori</DialogTitle></DialogHeader>
          <Textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="Un nome per riga..." className="h-40" />
          <Button onClick={() => { 
            const names = bulkImportText.split('\n').filter(n => n.trim());
            if (onBulkAddPlayers) onBulkAddPlayers(names.map(n => n.trim().toUpperCase()));
            setBulkImportDialogOpen(false);
          }} className="w-full font-bold">IMPORTA</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={autoNumberDialogOpen} onOpenChange={setAutoNumberDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="font-black italic uppercase">Auto-numerazione</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Quanti giocatori?</Label>
            <Input type="number" value={autoNumberCount} onChange={(e) => setAutoNumberCount(e.target.value)} placeholder="Es: 7" className="text-center text-xl font-bold" />
            <Button onClick={handleAutoNumber} className="w-full font-bold h-12">APPLICA</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, Plus, Trash2, ChevronLeft, Edit2, Save, X, Loader2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface SavedPlayer {
  name: string;
  number: number | null;
}

interface SavedTeam {
  id: string;
  name: string;
  category: string;
  players: SavedPlayer[];
  created_at: string;
}

export default function MyTeams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SavedTeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCategory, setTeamCategory] = useState('');
  const [playersText, setPlayersText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadTeams();
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_teams')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTeams((data || []).map(t => ({
        ...t,
        category: t.category || '',
        players: (t.players as unknown as SavedPlayer[]) || [],
      })));
    } catch (e: any) {
      console.error(e);
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamCategory('');
    setPlayersText('');
    setDialogOpen(true);
  };

  const openEditDialog = (team: SavedTeam) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamCategory(team.category);
    setPlayersText(
      team.players.map(p => p.number ? `${p.number} ${p.name}` : p.name).join('\n')
    );
    setDialogOpen(true);
  };

  const parsePlayersFromText = (text: string): SavedPlayer[] => {
    return text.split('\n').filter(l => l.trim()).map(line => {
      const trimmed = line.trim();
      const match = trimmed.match(/^(\d+)\s+(.+)$/);
      if (match) {
        return { number: parseInt(match[1]), name: match[2].toUpperCase() };
      }
      return { number: null, name: trimmed.toUpperCase() };
    });
  };

  const handleSave = async () => {
    if (!user || !teamName.trim()) {
      toast.error('Inserisci un nome per la squadra');
      return;
    }
    setSaving(true);
    const players = parsePlayersFromText(playersText);
    
    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('saved_teams')
          .update({ 
            name: teamName.trim(), 
            category: teamCategory.trim(),
            players: JSON.parse(JSON.stringify(players)) as Json,
          })
          .eq('id', editingTeam.id);
        if (error) throw error;
        toast.success('Squadra aggiornata');
      } else {
        const { error } = await supabase
          .from('saved_teams')
          .insert({
            user_id: user.id,
            name: teamName.trim(),
            category: teamCategory.trim(),
            players: JSON.parse(JSON.stringify(players)) as Json,
          });
        if (error) throw error;
        toast.success('Squadra salvata');
      }
      setDialogOpen(false);
      loadTeams();
    } catch (e: any) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_teams')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setTeams(prev => prev.filter(t => t.id !== id));
      toast.success('Squadra eliminata');
    } catch (e: any) {
      toast.error(`Errore: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Le Mie Squadre
          </h1>
        </div>

        <Button onClick={openCreateDialog} className="w-full mb-6 gap-2">
          <Plus className="h-4 w-4" /> Nuova Squadra
        </Button>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Caricamento...
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna squadra salvata</p>
            <p className="text-sm mt-1">Crea la tua prima squadra per richiamarla rapidamente nelle partite.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <Card key={team.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{team.name}</h3>
                    {team.category && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {team.category}
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {team.players.length} giocatori
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(team)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(team.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {team.players.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {team.players.slice(0, 8).map((p, i) => (
                      <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {p.number ? `#${p.number} ` : ''}{p.name}
                      </span>
                    ))}
                    {team.players.length > 8 && (
                      <span className="text-xs text-muted-foreground">+{team.players.length - 8} altri</span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Modifica Squadra' : 'Nuova Squadra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Squadra *</Label>
              <Input 
                value={teamName} 
                onChange={e => setTeamName(e.target.value)} 
                placeholder="Es. ASD Roma Nord" 
              />
            </div>
            <div className="space-y-2">
              <Label>Leva / Categoria</Label>
              <Input 
                value={teamCategory} 
                onChange={e => setTeamCategory(e.target.value)} 
                placeholder="Es. 2012, Pulcini, Under 14" 
              />
            </div>
            <div className="space-y-2">
              <Label>Giocatori (uno per riga, opzionalmente con numero)</Label>
              <Textarea
                value={playersText}
                onChange={e => setPlayersText(e.target.value)}
                placeholder={`1 ROSSI\n2 BIANCHI\nVERDI\n4 NERI`}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formato: "NUMERO NOME" oppure solo "NOME". Es: "10 ROSSI" o "ROSSI"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

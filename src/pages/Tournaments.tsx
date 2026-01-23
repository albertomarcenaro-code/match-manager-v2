import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trophy, Plus, Lock, Unlock, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Tournaments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadTournaments();
    }
  }, [user]);

  const loadTournaments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTournaments(data || []);
    } catch (error: any) {
      console.error("Errore caricamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) {
      return toast.error("Inserisci un nome per il torneo");
    }
    if (!user) return toast.error("Devi essere loggato");

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .insert([
          { 
            name: newTournamentName.trim(),
            user_id: user.id,
            status: 'open'
          }
        ]);

      if (error) throw error;

      toast.success("Torneo creato!");
      setNewTournamentName('');
      await loadTournaments();
    } catch (error: any) {
      console.error("Errore creazione:", error);
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTournament = async (id: string) => {
    if (!confirm("Eliminare il torneo?")) return;
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      toast.success("Eliminato");
      loadTournaments();
    } catch (error) {
      toast.error("Errore");
    }
  };

  const toggleLock = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'locked' : 'open';
    try {
      const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      loadTournaments();
    } catch (error) {
      toast.error("Errore");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 pt-4">
          <Trophy className="text-secondary h-6 w-6" /> I Tuoi Tornei
        </h1>

        <Card className="p-4 mb-8">
          <div className="flex gap-2">
            <Input 
              placeholder="Nome torneo..." 
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              disabled={isCreating}
            />
            <Button onClick={createTournament} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crea
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : tournaments.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nessun torneo creato.</p>
          ) : (
            tournaments.map((t: any) => (
              <Card key={t.id} className="p-4 flex items-center justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleLock(t.id, t.status)}>
                    {t.status === 'locked' ? <Lock className="h-5 w-5 text-red-500" /> : <Unlock className="h-5 w-5 text-green-500" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteTournament(t.id)}>
                    <Trash2 className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

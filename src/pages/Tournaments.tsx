import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trophy, Plus, Trash2, ChevronRight, Loader2 } from 'lucide-react';
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
    if (user) loadTournaments();
  }, [user]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, created_at') // Selezioniamo solo colonne sicure per ora
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTournaments(data || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) return toast.error("Inserisci un nome");
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .insert([{ 
          name: newTournamentName.trim(), 
          user_id: user?.id,
          team_name: 'La mia squadra' // Required field with default value
        }]);
      if (error) throw error;
      toast.success("Torneo creato!");
      setNewTournamentName('');
      loadTournaments();
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> I Tuoi Tornei
        </h1>
        <div className="flex gap-2 mb-8">
          <Input 
            placeholder="Nome nuovo torneo..." 
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
          />
          <Button onClick={createTournament} disabled={isCreating}>
            {isCreating ? <Loader2 className="animate-spin" /> : <Plus />} Crea
          </Button>
        </div>
        <div className="space-y-3">
          {loading ? <p>Caricamento...</p> : tournaments.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between">
              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tournaments/${t.id}`)}>
                <h3 className="font-bold">{t.name}</h3>
              </div>
              <ChevronRight className="text-muted-foreground" />
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

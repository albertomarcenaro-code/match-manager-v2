import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trophy, Plus, Lock, Unlock, Trash2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Tournaments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTournaments();
  }, [user]);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setTournaments(data || []);
    setLoading(false);
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) return toast.error("Inserisci un nome");
    
    // Proviamo un inserimento super-semplice
    const { data, error } = await supabase
      .from('tournaments')
      .insert([
        { 
          name: newTournamentName.trim(), 
          user_id: user?.id,
          status: 'open'
        }
      ])
      .select();

    if (error) {
      console.error("ERRORE DETTAGLIATO:", error);
      toast.error(`Errore: ${error.message || 'Controlla la console'}`);
    } else {
      toast.success("Torneo creato!");
      setNewTournamentName('');
      loadTournaments();
    }
  };

  const toggleLock = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'locked' : 'open';
    const { error } = await supabase
      .from('tournaments')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) loadTournaments();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Trophy className="text-secondary" /> I Tuoi Tornei
        </h1>
        <div className="flex gap-2 mb-8">
          <Input 
            placeholder="Nome nuovo torneo..." 
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
          />
          <Button onClick={createTournament}>
            <Plus className="h-4 w-4 mr-2" /> Crea
          </Button>
        </div>
        <div className="space-y-3">
          {loading ? <p>Caricamento...</p> : tournaments.map((t: any) => (
            <Card key={t.id} className="p-4 flex items-center justify-between">
              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                <h3 className="font-bold">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{t.status === 'open' ? 'Aperto' : 'Chiuso'}</p>
              </div>
              <Button variant="ghost" onClick={() => toggleLock(t.id, t.status)}>
                {t.status === 'locked' ? <Lock className="text-red-500" /> : <Unlock className="text-green-500" />}
              </Button>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

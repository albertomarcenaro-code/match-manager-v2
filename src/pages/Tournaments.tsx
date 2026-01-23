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

interface Tournament {
  id: string;
  name: string;
  status: 'open' | 'locked';
  created_at: string;
}

export default function Tournaments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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
    
    if (error) toast.error("Errore nel caricamento");
    else setTournaments(data || []);
    setLoading(false);
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) return toast.error("Inserisci un nome");
    
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{ name: newTournamentName, user_id: user?.id, status: 'open' }])
      .select()
      .single();

    if (error) toast.error("Errore nella creazione");
    else {
      toast.success("Torneo creato!");
      setNewTournamentName('');
      loadTournaments();
    }
  };

  const toggleLock = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'locked' : 'open';
    const { error } = await supabase
      .from('tournaments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) toast.error("Errore nell'aggiornamento");
    else loadTournaments();
  };

  const deleteTournament = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo torneo e tutte le sue partite?")) return;
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if (error) toast.error("Errore nell'eliminazione");
    else loadTournaments();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Trophy className="text-secondary" /> I Tuoi Tornei
        </h1>

        {/* Input Nuovo Torneo */}
        <div className="flex gap-2 mb-8">
          <Input 
            placeholder="Nome nuovo torneo (es. Champions...)" 
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
          />
          <Button onClick={createTournament} className="gap-2">
            <Plus className="h-4 w-4" /> Crea
          </Button>
        </div>

        {/* Lista Tornei */}
        <div className="space-y-3">
          {loading ? <p>Caricamento...</p> : tournaments.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between hover:border-secondary transition-colors">
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => t.status === 'open' ? navigate(`/tournament/${t.id}`) : toast.info("Sblocca il torneo per modificarlo")}
              >
                <h3 className="font-bold text-lg">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => toggleLock(t.id, t.status)}
                  className={t.status === 'locked' ? "text-red-500" : "text-green-500"}
                >
                  {t.status === 'locked' ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                </Button>
                
                <Button variant="ghost" size="icon" onClick={() => deleteTournament(t.id)} className="text-muted-foreground">
                  <Trash2 className="h-5 w-5" />
                </Button>
                
                <ChevronRight className="text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

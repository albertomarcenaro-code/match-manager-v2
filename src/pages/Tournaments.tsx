import { useState, useEffect } from 'react';
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
  const [tournaments, setTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadTournaments();
    }
  }, [user]);

  const loadTournaments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Errore caricamento:", error);
      toast.error("Non è stato possibile caricare i tornei");
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) {
      return toast.error("Inserisci un nome per il torneo");
    }

    setIsCreating(true);
    try {
      // Inserimento semplificato: passiamo solo il nome.
      // Il database gestirà user_id e status automaticamente se hai eseguito l'ultimo SQL.
      const { data, error } = await supabase
        .from('tournaments')
        .insert([{ name: newTournamentName.trim() }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Torneo creato con successo!");
      setNewTournamentName('');
      loadTournaments();
    } catch (error: any) {
      console.error("Errore creazione:", error);
      toast.error(`Errore: ${error.message || "Riprova più tardi"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTournament = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questo torneo e tutte le partite collegate?")) return;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Errore durante l'eliminazione");
    } else {
      toast.success("Torneo eliminato");
      loadTournaments();
    }
  };

  const toggleLock = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'locked' : 'open';
    const { error } = await supabase
      .from('tournaments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error("Errore nel cambio stato");
    } else {
      loadTournaments();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-secondary h-6 w-6" /> I Tuoi Tornei
          </h1>
        </div>

        {/* Box Creazione */}
        <Card className="p-4 mb-8 border-dashed border-2">
          <div className="flex gap-2">
            <Input 
              placeholder="Esempio: Torneo Estivo 2024" 
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTournament()}
              disabled={isCreating}
            />
            <Button onClick={createTournament} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Crea
            </Button>
          </div>
        </Card>

        {/* Lista Tornei */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tournaments.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              Non hai ancora creato nessun torneo.
            </p>
          ) : (
            tournaments.map((t: any) => (
              <Card key={t.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => t.status === 'open' ? navigate(`/tournament/${t.id}`) : toast.info("Sblocca il torneo per accedere")}
                >
                  <h3 className="font-bold text-lg leading-tight">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creato il {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toggleLock(t.id, t.status)}
                    title={t.status === 'open' ? "Chiudi Torneo" : "Apri Torneo"}
                  >
                    {t.status === 'locked' ? (
                      <Lock className="h-5 w-5 text-red-500" />
                    ) : (
                      <Unlock className="h-5 w-5 text-green-500" />
                    )}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteTournament(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
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

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

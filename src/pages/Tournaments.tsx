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
      toast.error("Non è stato possibile caricare i tornei");
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) {
      return toast.error("Inserisci un nome per il torneo");
    }
    if (!user) {
      return toast.error("Devi essere loggato per creare un torneo");
    }

    setIsCreating(true);
    try {
      // Inviamo esplicitamente user_id per superare i controlli di sicurezza (RLS)
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

      toast.success("Torneo creato con successo!");
      setNewTournamentName('');
      await loadTournaments();
    } catch (error: any) {
      console.error("Errore creazione:", error);
      // Questo toast mostrerà l'errore tecnico specifico (es. RLS policy violation)
      toast.error(`Errore: ${error.message || "Impossibile creare il torneo"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTournament = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo torneo?")) return;
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Torneo eliminato");
      loadTournaments();
    } catch (error: any) {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const toggleLock = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'locked' : 'open';
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      loadTournaments();
    } catch (error: any) {
      toast.error("Errore nel cambio stato");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 pt-4">
          <h1 className="text-2xl font-bold flex items-

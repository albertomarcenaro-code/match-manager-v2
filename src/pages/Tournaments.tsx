import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trophy, Plus, Trash2, ChevronRight, Loader2, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Tournaments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadTournaments();
    else setLoading(false);
  }, [user]);

  const loadTournaments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Tournament load error:", error);
        toast.error("Errore nel caricamento dei tornei");
      }
      setTournaments(data || []);
    } catch (error: any) {
      console.error("Tournament load exception:", error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) return toast.error("Inserisci un nome");
    if (!user) return;
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from("tournaments")
        .insert([
          {
            name: newTournamentName.trim(),
            user_id: user.id,
            team_name: "La mia squadra",
          },
        ]);
      if (error) throw error;
      toast.success("Torneo creato!");
      setNewTournamentName("");
      loadTournaments();
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !user) return;
    try {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", deleteTarget)
        .eq("user_id", user.id);
      if (error) throw error;
      setTournaments((prev) => prev.filter((t) => t.id !== deleteTarget));
      toast.success("Torneo eliminato");
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <Home className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500" /> I Tuoi Tornei
          </h1>
        </div>

        <div className="flex gap-2 mb-8">
          <Input
            placeholder="Nome nuovo torneo..."
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTournament()}
          />
          <Button onClick={createTournament} disabled={isCreating} className="gap-1 shrink-0">
            {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />} Crea
          </Button>
        </div>

        <h2 className="text-lg font-semibold mb-3">Storico Tornei</h2>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nessun torneo salvato. Crea un nuovo torneo per iniziare.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <Card key={t.id} className="p-4 flex items-center gap-3">
                <div
                  className="flex-1 cursor-pointer min-w-0"
                    onClick={() => navigate(`/tournament/${t.id}`)}
                >
                  <h3 className="font-bold truncate">{t.name}</h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 h-8 text-xs"
                    onClick={() => navigate(`/tournaments/${t.id}`)}
                  >
                    <ChevronRight className="h-3 w-3" /> Apri
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler cancellare questo elemento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

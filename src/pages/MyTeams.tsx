import React, { useEffect, useState } from 'react';
import { Helmet } from "react-helmet";
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, ChevronLeft, Loader2, ArrowRight, IdCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TeamRow {
  id: string;
  name: string;
  leva: string;
  category: string;
  memberCount: number;
}

const decodeCategory = (raw: string | null | undefined) => {
  const s = (raw || "").trim();
  if (!s) return { leva: "", category: "" };
  const parts = s.split("|").map(p => p.trim());
  if (parts.length >= 2) return { leva: parts[0], category: parts.slice(1).join(" | ") };
  return { leva: "", category: s };
};

export default function MyTeams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: teamsData, error } = await supabase
        .from('saved_teams')
        .select('id, name, category')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const { data: countsData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);
      const counts = new Map<string, number>();
      (countsData || []).forEach((r: any) => counts.set(r.team_id, (counts.get(r.team_id) || 0) + 1));
      setTeams((teamsData || []).map((t: any) => {
        const { leva, category } = decodeCategory(t.category);
        return { id: t.id, name: t.name, leva, category, memberCount: counts.get(t.id) || 0 };
      }));
    } catch (e) {
      console.error(e);
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Le Mie Squadre | Match Manager Live</title>
        <meta name="description" content="Consulta le tue squadre e apri l'anagrafica per gestire rose e distinte." />
      </Helmet>
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Le Mie Squadre
            </h1>
            <p className="text-xs text-muted-foreground">
              Vista consultiva. Per creare o modificare le rose usa l'Anagrafica Squadra.
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate('/team-members')}
          variant="outline"
          className="w-full mb-6 gap-2"
        >
          <IdCard className="h-4 w-4" /> Vai all'Anagrafica Squadra
        </Button>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Caricamento...
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna squadra ancora creata</p>
            <p className="text-sm mt-1">
              Vai in Anagrafica Squadra per crearne una e inserire la rosa.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(t => (
              <Card
                key={t.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/team-members?teamId=${t.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{t.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {t.leva && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {t.leva}
                        </span>
                      )}
                      {t.category && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {t.category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {t.memberCount} membri
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

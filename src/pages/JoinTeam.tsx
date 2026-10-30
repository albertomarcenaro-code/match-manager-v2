import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Link2, Shield, Check, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { joinTeamByCode, getActiveTeam, leaveTeamJoin, lookupTeamByCode } from '@/lib/teams';
import { useActiveTeamId } from '@/hooks/useActiveTeamId';

export default function JoinTeam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const activeTeamId = useActiveTeamId();

  const [code, setCode] = useState(searchParams.get('code')?.trim() ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [joinedTeam, setJoinedTeam] = useState<{ id: string; name: string; code: string } | null>(null);

  useEffect(() => {
    // If we came with ?code=, set it and let the form stay focused on it.
    if (searchParams.get('code')) {
      setCode(searchParams.get('code')!.trim());
    }
  }, [searchParams]);

  // Show the already-joined team (persists across reloads).
  useEffect(() => {
    if (!authLoading && user && !isGuest && activeTeamId) {
      const stored = getActiveTeam();
      if (stored.teamId === activeTeamId && stored.code) {
        lookupTeamByCode(stored.code).then(team => {
          if (team) setJoinedTeam({ id: team.id, name: team.name, code: stored.code });
        });
      }
    }
  }, [user, isGuest, authLoading, activeTeamId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!user || isGuest) {
      toast.error('Devi essere loggato per unirti a una squadra.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await joinTeamByCode(code, user?.id);
      if (!result.ok) {
        toast.error(result.error ?? 'Impossibile unirti alla squadra.', {
          description: 'Controlla il codice e riprova.',
        });
        return;
      }
      setJoinedTeam({ id: result.teamId!, name: result.teamName!, code: code.trim().toUpperCase() });
      toast.success(`Sei ora membro della squadra "${result.teamName}". La rosa è ora condivisa con gli altri dirigenti/allenatori della leva.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!user || isGuest || !joinedTeam) return;
    try {
      const left = await leaveTeamJoin(joinedTeam.id, user.id);
      localStorage.removeItem('match-manager:active-team');
      localStorage.removeItem('match-manager:active-team-user');
      setJoinedTeam(null);
      if (left) {
        toast.success('Sei uscito dalla squadra. La rosa non è più condivisa con te.');
      } else {
        // Il server potrebbe non aver ancora la tabella user_team_joins: in
        // ogni caso ricostruiamo il locale così l'utente vede il team scollegato.
        toast.info('Collegamento squadra rimosso dalla sessione.');
      }
    } catch (e) {
      localStorage.removeItem('match-manager:active-team');
      localStorage.removeItem('match-manager:active-team-user');
      setJoinedTeam(null);
      toast.info('Collegamento squadra rimosso dalla sessione.');
    }
  };

  const handleClear = () => {
    if (!user || isGuest) return;
    localStorage.removeItem('match-manager:active-team');
    localStorage.removeItem('match-manager:active-team-user');
    setJoinedTeam(null);
    toast.info('Collegamento squadra rimosso dalla sessione.');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Unisciti a una Squadra | Match Manager Live</title>
          <meta name="description" content="Unisciti a una squadra esistente inserendo il codice condiviso dal proprietario." />
        </Helmet>
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h1 className="text-lg font-bold mb-2">Accesso richiesto</h1>
            <p className="text-sm text-muted-foreground mb-4">Il codice squadra è riservato ai dirigenti e allenatori loggati.</p>
            <Button onClick={() => navigate('/auth')} className="gap-2 w-full">
              <Link2 className="h-4 w-4" /> Accedi o registrati
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Already joined: show a stable confirmation card.
  if (joinedTeam) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Squadra Unita | Match Manager Live</title>
          <meta name="description" content={`Sei membro della squadra "${joinedTeam.name}".`} />
        </Helmet>
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6 text-center space-y-4">
            <Check className="h-8 w-8 mx-auto text-emerald-500" />
            <div>
              <h1 className="text-lg font-bold">Squadra collegata</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ora vedi e modifichi la rosa di <strong>{joinedTeam.name}</strong>.
              </p>
            </div>
            <div className="bg-muted/50 rounded-md px-3 py-2 text-center">
              <Label className="text-xs text-muted-foreground mb-1 block">Codice Squadra</Label>
              <div className="font-mono text-sm font-bold tracking-wider break-all">{joinedTeam.code}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate('/team-members')}>
                <Link2 className="h-4 w-4" /> Vai all'Anagrafica
              </Button>
              <Button variant="ghost" className="gap-2" onClick={handleLeave}>
                Esci dalla squadra
              </Button>
              <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleClear}>
                Solo sessione
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Unisciti a una Squadra | Match Manager Live</title>
        <meta name="description" content="Unisciti a una squadra esistente inserendo il codice condiviso dal proprietario." />
      </Helmet>
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-6 space-y-4">
          <div className="text-center">
            <Shield className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h1 className="text-lg font-bold">Unisciti a una Squadra</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Inserisci il codice che ti è stato comunicato dal proprietario della squadra.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <Label htmlFor="team-code">Codice Squadra</Label>
              <Input
                id="team-code"
                className="font-mono text-center tracking-wider mt-1 uppercase"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Es. 2018-2026-7B9X"
                maxLength={24}
                autoComplete="off"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                formato: LEVA-ANO-CODICE (es. 2018-2026-7B9X)
              </p>
            </div>

            <Button type="submit" className="gap-2 w-full" disabled={submitting || !code.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Unisciti
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center">
            Se non hai un codice, chiedi al proprietario della squadra o creane una nuova.
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

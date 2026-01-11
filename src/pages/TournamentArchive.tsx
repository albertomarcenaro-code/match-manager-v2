import { useState } from 'react';
import { useTournament } from '@/hooks/useTournament';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, ArrowLeft, Users, Calendar, Target, Clock, AlertTriangle, ChevronRight, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { TournamentMatch } from '@/types/tournament';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const TournamentArchive = () => {
  const navigate = useNavigate();
  const { tournament, endTournament, getMatchById } = useTournament();
  const [sortBy, setSortBy] = useState<'goals' | 'minutes' | 'matches'>('goals');
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);

  const sortedPlayers = [...tournament.players].sort((a, b) => {
    switch (sortBy) {
      case 'goals':
        return b.totalGoals - a.totalGoals;
      case 'minutes':
        return b.totalMinutes - a.totalMinutes;
      case 'matches':
        return b.matchesPlayed - a.matchesPlayed;
      default:
        return 0;
    }
  });

  const totalGoals = tournament.players.reduce((sum, p) => sum + p.totalGoals, 0);
  const totalMinutes = tournament.players.reduce((sum, p) => sum + p.totalMinutes, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'goal': return 'GOL';
      case 'own_goal': return 'AUTOG';
      case 'substitution': return 'SOST';
      case 'yellow_card': return 'AMM';
      case 'red_card': return 'ESP';
      default: return '';
    }
  };

  if (!tournament.isActive) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Helmet>
          <title>Archivio Torneo - Match Manager Live</title>
        </Helmet>
        <main className="flex-1 bg-background p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla Dashboard
              </Button>
            </div>

            <Card className="p-8 text-center">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Nessun torneo attivo</h2>
              <p className="text-muted-foreground mb-4">
                Attiva la modalità torneo nella schermata di setup per iniziare a tracciare le statistiche cumulative.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Vai alla Dashboard
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Helmet>
        <title>{tournament.name || 'Torneo'} - Archivio | Match Manager Live</title>
      </Helmet>
      <main className="flex-1 bg-background p-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-secondary" />
                  {tournament.name || 'Torneo'}
                </h1>
              <p className="text-muted-foreground">{tournament.teamName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                navigate('/match', { state: { mode: 'tournament' } });
                toast.success('Nuova partita del torneo');
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuova Partita
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Termina Torneo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminare il torneo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tutti i dati del torneo verranno cancellati. Questa azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={endTournament} className="bg-destructive hover:bg-destructive/90">
                    Termina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto text-secondary mb-2" />
              <div className="text-2xl font-bold">{tournament.matches.length}</div>
              <div className="text-sm text-muted-foreground">Partite</div>
            </Card>
            <Card className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto text-secondary mb-2" />
              <div className="text-2xl font-bold">{totalGoals}</div>
              <div className="text-sm text-muted-foreground">Gol totali</div>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-secondary mb-2" />
              <div className="text-2xl font-bold">{totalMinutes}</div>
              <div className="text-sm text-muted-foreground">Minuti totali</div>
            </Card>
            <Card className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-secondary mb-2" />
              <div className="text-2xl font-bold">{tournament.players.length}</div>
              <div className="text-sm text-muted-foreground">Giocatori</div>
            </Card>
          </div>

          {/* Sort buttons */}
          <div className="flex gap-2">
            <Button 
              variant={sortBy === 'goals' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSortBy('goals')}
            >
              Per Gol
            </Button>
            <Button 
              variant={sortBy === 'minutes' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSortBy('minutes')}
            >
              Per Minuti
            </Button>
            <Button 
              variant={sortBy === 'matches' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSortBy('matches')}
            >
              Per Presenze
            </Button>
          </div>

          {/* Players Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Giocatore</TableHead>
                  <TableHead className="text-center">Presenze</TableHead>
                  <TableHead className="text-center">Minuti</TableHead>
                  <TableHead className="text-center">Gol</TableHead>
                  <TableHead className="text-center">Amm</TableHead>
                  <TableHead className="text-center">Esp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.number || '-'}</TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell className="text-center">{player.matchesPlayed}</TableCell>
                    <TableCell className="text-center">{player.totalMinutes}</TableCell>
                    <TableCell className="text-center font-bold text-secondary">
                      {player.totalGoals > 0 ? player.totalGoals : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {player.totalYellowCards > 0 ? player.totalYellowCards : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {player.totalRedCards > 0 ? player.totalRedCards : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Matches History */}
          {tournament.matches.length > 0 && (
            <Card className="p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Storico Partite
              </h3>
              <div className="space-y-2">
                {tournament.matches.map(match => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match)}
                    className="w-full flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{match.homeTeamName}</span>
                      <span className="mx-2 text-muted-foreground">vs</span>
                      <span className="font-medium">{match.awayTeamName}</span>
                    </div>
                    <div className="font-bold text-lg">
                      {match.homeScore} - {match.awayScore}
                    </div>
                    <div className="text-sm text-muted-foreground ml-4 flex items-center gap-2">
                      {new Date(match.date).toLocaleDateString('it-IT')}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Match Detail Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Riepilogo Partita</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedMatch && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 p-1">
                {/* Score Header */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">
                    {new Date(selectedMatch.date).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-lg font-bold">{selectedMatch.homeTeamName}</span>
                    <span className="text-3xl font-bold">
                      {selectedMatch.homeScore} - {selectedMatch.awayScore}
                    </span>
                    <span className="text-lg font-bold">{selectedMatch.awayTeamName}</span>
                  </div>
                  
                  {/* Period Scores */}
                  {selectedMatch.periodScores && selectedMatch.periodScores.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {selectedMatch.periodScores.map(ps => (
                        <span key={ps.period} className="mx-2">
                          {ps.period}°T: {ps.homeScore}-{ps.awayScore}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Goal Scorers */}
                {selectedMatch.events && selectedMatch.events.filter(e => e.type === 'goal').length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Marcatori</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        {selectedMatch.events
                          .filter(e => e.type === 'goal' && e.team === 'home')
                          .map((e, i) => (
                            <div key={i} className="text-sm flex items-center gap-2">
                              <span className="font-bold text-secondary">GOL</span>
                              <span>{e.playerName}</span>
                              <span className="text-muted-foreground">({formatTime(e.timestamp)})</span>
                            </div>
                          ))}
                      </div>
                      <div className="text-right">
                        {selectedMatch.events
                          .filter(e => e.type === 'goal' && e.team === 'away')
                          .map((e, i) => (
                            <div key={i} className="text-sm flex items-center gap-2 justify-end">
                              <span className="text-muted-foreground">({formatTime(e.timestamp)})</span>
                              <span>{e.playerName}</span>
                              <span className="font-bold text-secondary">GOL</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Stats */}
                {selectedMatch.playerStats && selectedMatch.playerStats.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Statistiche Giocatori</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="text-center">Min</TableHead>
                          <TableHead className="text-center">Gol</TableHead>
                          <TableHead className="text-center">Amm</TableHead>
                          <TableHead className="text-center">Esp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMatch.playerStats
                          .filter(ps => ps.minutes > 0)
                          .sort((a, b) => b.minutes - a.minutes)
                          .map((ps, i) => (
                            <TableRow key={i}>
                              <TableCell>{ps.playerNumber || '-'}</TableCell>
                              <TableCell>{ps.playerName}</TableCell>
                              <TableCell className="text-center">{ps.minutes}</TableCell>
                              <TableCell className="text-center font-bold text-secondary">
                                {ps.goals > 0 ? ps.goals : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {ps.yellowCards > 0 ? ps.yellowCards : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {ps.redCards > 0 ? ps.redCards : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Full Event Timeline */}
                {selectedMatch.events && selectedMatch.events.filter(e => 
                  e.type !== 'period_start' && e.type !== 'period_end'
                ).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Cronaca</h4>
                    <div className="space-y-1 text-sm">
                      {selectedMatch.events
                        .filter(e => e.type !== 'period_start' && e.type !== 'period_end')
                        .map((e, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <span className="font-mono text-xs">{e.period}T {formatTime(e.timestamp)}</span>
                            <span className="font-medium text-xs px-1 bg-secondary/20 rounded">{getEventLabel(e.type)}</span>
                            <span className="flex-1">
                              {e.description
                                .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
                                .replace(/[⚽🔄🟨🟥➡️⬅️↔️]/g, '')
                                .trim()}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default TournamentArchive;

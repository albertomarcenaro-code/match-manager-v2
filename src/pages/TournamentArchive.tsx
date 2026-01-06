import { useState } from 'react';
import { useTournament } from '@/hooks/useTournament';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trophy, ArrowLeft, Users, Calendar, Target, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
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

const TournamentArchive = () => {
  const navigate = useNavigate();
  const { tournament, endTournament } = useTournament();
  const [sortBy, setSortBy] = useState<'goals' | 'minutes' | 'matches'>('goals');

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
              <Button variant="ghost" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna all'app
              </Button>
            </div>

            <Card className="p-8 text-center">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Nessun torneo attivo</h2>
              <p className="text-muted-foreground mb-4">
                Attiva la modalità torneo nella schermata di setup per iniziare a tracciare le statistiche cumulative.
              </p>
              <Button onClick={() => navigate('/app')}>
                Vai al Setup
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-secondary" />
                  {tournament.name || 'Torneo'}
                </h1>
                <p className="text-muted-foreground">{tournament.teamName}</p>
              </div>
            </div>
            
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
                  <TableHead className="text-center">🟨</TableHead>
                  <TableHead className="text-center">🟥</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlayers.map((player, index) => (
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
                  <div key={match.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium">{match.homeTeamName}</span>
                      <span className="mx-2 text-muted-foreground">vs</span>
                      <span className="font-medium">{match.awayTeamName}</span>
                    </div>
                    <div className="font-bold text-lg">
                      {match.homeScore} - {match.awayScore}
                    </div>
                    <div className="text-sm text-muted-foreground ml-4">
                      {new Date(match.date).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TournamentArchive;

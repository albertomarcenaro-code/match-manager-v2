import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RosterSetup } from '@/components/setup/RosterSetup'; 
import { Header } from '@/components/layout/Header';
import { Player } from '@/types/match';
import { toast } from 'sonner';

export default function MatchSetup() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Stati locali per gestire la configurazione prima del fischio d'inizio
  const [homeTeamName, setHomeTeamName] = useState("Casa");
  const [awayTeamName, setAwayTeamName] = useState("Ospiti");
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

  const handleComplete = () => {
    if (homePlayers.length === 0 || awayPlayers.length === 0) {
      toast.error("Aggiungi almeno un giocatore per squadra!");
      return;
    }

    // Salviamo la configurazione nel localStorage per il componente Match vero e proprio
    const matchData = {
      id,
      homeTeam: { name: homeTeamName, players: homePlayers },
      awayTeam: { name: awayTeamName, players: awayPlayers },
      startTime: new Date().toISOString()
    };
    
    localStorage.setItem(`match_config_${id}`, JSON.stringify(matchData));
    
    // Ora andiamo alla pagina del match (quella che dovrai popolare dopo)
    navigate(`/match/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4">
        <RosterSetup 
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onHomeTeamNameChange={setHomeTeamName}
          onAwayTeamNameChange={setAwayTeamName}
          onAddPlayer={(name) => setHomePlayers(prev => [...prev, { id: crypto.randomUUID(), name: name.toUpperCase(), number: null, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} }])}
          onUpdatePlayerNumber={(pid, num) => setHomePlayers(prev => prev.map(p => p.id === pid ? {...p, number: num} : p))}
          onUpdateHomePlayerName={(pid, name) => setHomePlayers(prev => prev.map(p => p.id === pid ? {...p, name} : p))}
          onRemovePlayer={(pid) => setHomePlayers(prev => prev.filter(p => p.id !== pid))}
          onAddOpponentPlayer={(num) => setAwayPlayers(prev => [...prev, { id: crypto.randomUUID(), name: `AVV ${num}`, number: num, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} }])}
          onRemoveOpponentPlayer={(pid) => setAwayPlayers(prev => prev.filter(p => p.id !== pid))}
          onAddAwayPlayerFull={(name, number) => setAwayPlayers(prev => [...prev, { id: crypto.randomUUID(), name: name.toUpperCase(), number, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} }])}
          onUpdateAwayPlayerName={(pid, name) => setAwayPlayers(prev => prev.map(p => p.id === pid ? {...p, name} : p))}
          onUpdateAwayPlayerNumber={(pid, num) => setAwayPlayers(prev => prev.map(p => p.id === pid ? {...p, number: num} : p))}
          onBulkAddAwayPlayers={(players) => setAwayPlayers(prev => [...prev, ...players.map(pl => ({ id: crypto.randomUUID(), name: pl.name.toUpperCase(), number: pl.number, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} }))])}
          onCreatePlayersWithNumbers={(count) => {
            setHomePlayers(prev => {
              if (prev.length > 0) {
                return prev.map((p, i) => ({...p, number: i + 1}));
              }
              return Array.from({length: count}, (_, i) => ({
                id: crypto.randomUUID(), name: `GIOCATORE CASA ${i+1}`, number: i+1, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {}
              }));
            });
          }}
          onComplete={handleComplete}
        />
      </main>
    </div>
  );
}

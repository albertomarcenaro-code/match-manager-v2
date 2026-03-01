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
          onAddPlayer={(name) => setHomePlayers([...homePlayers, { id: crypto.randomUUID(), name: name.toUpperCase(), number: null, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} }])}
          onUpdatePlayerNumber={(pid, num) => setHomePlayers(homePlayers.map(p => p.id === pid ? {...p, number: num} : p))}
          onRemovePlayer={(pid) => setHomePlayers(homePlayers.filter(p => p.id !== pid))}
          onAddOpponentPlayer={(num) => setAwayPlayers([...awayPlayers, { id: crypto.randomUUID(), name: `AVV ${num}`, number: num, isOnField: false, isStarter: false, isExpelled: false, goals: 0, cards: { yellow: 0, red: 0 }, currentEntryTime: null, totalSecondsPlayed: 0, secondsPlayedPerPeriod: {} }])}
          onRemoveOpponentPlayer={(pid) => setAwayPlayers(awayPlayers.filter(p => p.id !== pid))}
          onComplete={handleComplete}
        />
      </main>
    </div>
  );
}

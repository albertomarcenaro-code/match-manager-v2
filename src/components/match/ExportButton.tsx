import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MatchState, MatchEvent } from '@/types/match';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  state: MatchState;
}

interface PlayerMinutes {
  [playerId: string]: {
    [period: number]: number;
    total: number;
  };
}

export function ExportButton({ state }: ExportButtonProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePlayerMinutes = (team: 'home' | 'away'): PlayerMinutes => {
    const minutes: PlayerMinutes = {};
    const players = team === 'home' ? state.homeTeam.players : state.awayTeam.players;
    
    // Initialize all players
    players.forEach(p => {
      minutes[p.id] = { total: 0 };
      for (let i = 1; i <= state.totalPeriods; i++) {
        minutes[p.id][i] = 0;
      }
    });

    // Process each period
    for (let period = 1; period <= state.currentPeriod; period++) {
      const periodEvents = state.events.filter(e => e.period === period);
      const periodStart = periodEvents.find(e => e.type === 'period_start');
      const periodEnd = periodEvents.find(e => e.type === 'period_end');
      
      if (!periodStart) continue;
      
      const periodDurationSeconds = periodEnd 
        ? periodEnd.timestamp 
        : (period === state.currentPeriod ? state.elapsedTime : state.periodDuration * 60);

      // Track player on-field status for this period
      const playerOnField: { [id: string]: boolean } = {};
      const playerEntryTime: { [id: string]: number } = {};
      const playerExpelled: { [id: string]: boolean } = {};

      // Find starters at period start (players who were on field when period started)
      // We need to track who was on field based on previous period end state
      if (period === 1) {
        // First period: use isStarter
        players.forEach(p => {
          if ('isStarter' in p && p.isStarter) {
            playerOnField[p.id] = true;
            playerEntryTime[p.id] = 0;
          }
        });
      } else {
        // Subsequent periods: check who was on field at end of previous period
        // by replaying events up to that point
        const previousPeriodEvents = state.events.filter(e => e.period < period);
        const onFieldAtStart: { [id: string]: boolean } = {};
        
        // Start with original starters
        players.forEach(p => {
          if ('isStarter' in p && p.isStarter) {
            onFieldAtStart[p.id] = true;
          }
        });

        // Apply substitutions and red cards from previous periods
        previousPeriodEvents.forEach(event => {
          if (event.type === 'substitution' && event.team === team) {
            if (event.playerOutId) onFieldAtStart[event.playerOutId] = false;
            if (event.playerInId) onFieldAtStart[event.playerInId] = true;
          }
          if (event.type === 'red_card' && event.team === team && event.playerId) {
            onFieldAtStart[event.playerId] = false;
            playerExpelled[event.playerId] = true;
          }
        });

        Object.keys(onFieldAtStart).forEach(id => {
          if (onFieldAtStart[id] && !playerExpelled[id]) {
            playerOnField[id] = true;
            playerEntryTime[id] = 0;
          }
        });
      }

      // Process events in this period
      periodEvents.forEach(event => {
        if (event.type === 'substitution' && event.team === team) {
          // Player out: calculate their minutes
          if (event.playerOutId && playerOnField[event.playerOutId]) {
            const entryTime = playerEntryTime[event.playerOutId] || 0;
            const minutesPlayed = Math.floor((event.timestamp - entryTime) / 60);
            minutes[event.playerOutId][period] += minutesPlayed;
            playerOnField[event.playerOutId] = false;
          }
          // Player in: mark entry time
          if (event.playerInId) {
            playerOnField[event.playerInId] = true;
            playerEntryTime[event.playerInId] = event.timestamp;
          }
        }
        
        if (event.type === 'red_card' && event.team === team && event.playerId) {
          // Red card: calculate minutes until expulsion
          if (playerOnField[event.playerId]) {
            const entryTime = playerEntryTime[event.playerId] || 0;
            const minutesPlayed = Math.floor((event.timestamp - entryTime) / 60);
            minutes[event.playerId][period] += minutesPlayed;
            playerOnField[event.playerId] = false;
            playerExpelled[event.playerId] = true;
          }
        }
      });

      // At period end, calculate remaining time for players still on field
      Object.keys(playerOnField).forEach(id => {
        if (playerOnField[id] && !playerExpelled[id]) {
          const entryTime = playerEntryTime[id] || 0;
          const minutesPlayed = Math.floor((periodDurationSeconds - entryTime) / 60);
          minutes[id][period] += minutesPlayed;
        }
      });
    }

    // Calculate totals
    Object.keys(minutes).forEach(id => {
      let total = 0;
      for (let i = 1; i <= state.totalPeriods; i++) {
        total += minutes[id][i] || 0;
      }
      minutes[id].total = total;
    });

    return minutes;
  };

  const getScorersForPeriod = (period: number): { home: string; away: string } => {
    const periodEvents = state.events.filter(e => e.period === period);
    const homeGoals: { [name: string]: number } = {};
    const awayGoals: { [name: string]: number } = {};

    periodEvents.forEach(event => {
      if (event.type === 'goal') {
        const scorerName = event.playerName || `#${event.playerNumber}`;
        if (event.team === 'home') {
          homeGoals[scorerName] = (homeGoals[scorerName] || 0) + 1;
        } else {
          awayGoals[scorerName] = (awayGoals[scorerName] || 0) + 1;
        }
      }
      // Own goals count for the opposing team
      if (event.type === 'own_goal') {
        const scorerName = `Autogol (${event.playerName || `#${event.playerNumber}`})`;
        if (event.team === 'home') {
          // Own goal by home team = goal for away
          awayGoals[scorerName] = (awayGoals[scorerName] || 0) + 1;
        } else {
          // Own goal by away team = goal for home
          homeGoals[scorerName] = (homeGoals[scorerName] || 0) + 1;
        }
      }
    });

    const formatScorers = (goals: { [name: string]: number }) => {
      return Object.entries(goals)
        .map(([name, count]) => `${name} (${count})`)
        .join('; ');
    };

    return {
      home: formatScorers(homeGoals) || '-',
      away: formatScorers(awayGoals) || '-'
    };
  };

  const handleExport = () => {
    const homeMinutes = calculatePlayerMinutes('home');
    const awayMinutes = calculatePlayerMinutes('away');

    // Prepare match info sheet with scorers
    const matchInfo = [
      ['RIEPILOGO PARTITA'],
      [],
      ['Squadra Casa', state.homeTeam.name],
      ['Squadra Ospite', state.awayTeam.name],
      ['Risultato Finale', `${state.homeTeam.score} - ${state.awayTeam.score}`],
      [],
      ['PUNTEGGI PARZIALI'],
      ['Tempo', 'Punteggio', `Marcatori ${state.homeTeam.name}`, `Marcatori ${state.awayTeam.name}`],
      ...state.periodScores.map(ps => {
        const scorers = getScorersForPeriod(ps.period);
        return [
          `${ps.period}° Tempo`,
          `${ps.homeScore} - ${ps.awayScore}`,
          scorers.home,
          scorers.away
        ];
      }),
    ];

    // Prepare events sheet
    const eventsHeader = ['Tempo', 'Minuto', 'Tipo Evento', 'Squadra', 'Giocatore', 'Numero', 'Dettagli'];
    const eventsData = state.events.map(event => {
      let eventType = '';
      switch (event.type) {
        case 'period_start': eventType = 'Inizio Tempo'; break;
        case 'period_end': eventType = 'Fine Tempo'; break;
        case 'goal': eventType = 'Gol'; break;
        case 'own_goal': eventType = 'Autogol'; break;
        case 'substitution': eventType = 'Sostituzione'; break;
        case 'yellow_card': eventType = 'Cartellino Giallo'; break;
        case 'red_card': eventType = 'Cartellino Rosso'; break;
      }

      const teamName = event.team === 'home' ? state.homeTeam.name : state.awayTeam.name;

      let details = '';
      if (event.type === 'substitution') {
        details = `Entra: ${event.playerInName} (#${event.playerInNumber}) - Esce: ${event.playerOutName} (#${event.playerOutNumber})`;
      } else if (event.type === 'period_end') {
        details = `Punteggio: ${event.homeScore} - ${event.awayScore}`;
      }

      return [
        `${event.period}°`,
        formatTime(event.timestamp),
        eventType,
        teamName,
        event.playerName || '',
        event.playerNumber || '',
        details,
      ];
    });

    // Build period columns headers
    const periodHeaders = [];
    for (let i = 1; i <= state.totalPeriods; i++) {
      periodHeaders.push(`Minuti T${i}`);
    }
    periodHeaders.push('Minuti Totali');

    // Prepare rosters sheet with minutes
    const homeRoster = state.homeTeam.players
      .filter(p => p.number !== null)
      .map(p => {
        const mins = homeMinutes[p.id] || { total: 0 };
        const periodMins = [];
        for (let i = 1; i <= state.totalPeriods; i++) {
          periodMins.push(mins[i] || 0);
        }
        return [
          p.number,
          p.name,
          p.isExpelled ? 'Espulso' : (p.isOnField ? 'In Campo' : 'Panchina'),
          ...periodMins,
          mins.total
        ];
      });
    
    const awayRoster = state.awayTeam.players
      .map(p => {
        const mins = awayMinutes[p.id] || { total: 0 };
        const periodMins = [];
        for (let i = 1; i <= state.totalPeriods; i++) {
          periodMins.push(mins[i] || 0);
        }
        return [
          p.number,
          `#${p.number}`,
          p.isExpelled ? 'Espulso' : (p.isOnField ? 'In Campo' : 'Panchina'),
          ...periodMins,
          mins.total
        ];
      });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Match info sheet
    const ws1 = XLSX.utils.aoa_to_sheet(matchInfo);
    XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

    // Events sheet
    const ws2 = XLSX.utils.aoa_to_sheet([eventsHeader, ...eventsData]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Cronaca');

    // Home roster sheet with minutes
    const ws3 = XLSX.utils.aoa_to_sheet([
      [state.homeTeam.name],
      ['Numero', 'Nome', 'Stato', ...periodHeaders],
      ...homeRoster
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Rosa Casa');

    // Away roster sheet with minutes
    const ws4 = XLSX.utils.aoa_to_sheet([
      [state.awayTeam.name],
      ['Numero', 'Giocatore', 'Stato', ...periodHeaders],
      ...awayRoster
    ]);
    XLSX.utils.book_append_sheet(wb, ws4, 'Rosa Ospiti');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `partita_${state.homeTeam.name.replace(/\s+/g, '_')}_vs_${state.awayTeam.name.replace(/\s+/g, '_')}_${date}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  return (
    <Button
      onClick={handleExport}
      className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
      size="lg"
    >
      <Download className="h-5 w-5" />
      Esporta Excel
    </Button>
  );
}

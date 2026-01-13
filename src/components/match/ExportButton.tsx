import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MatchState, MatchEvent } from '@/types/match';
import ExcelJS from 'exceljs';

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

  /**
   * Calculate minutes played per period using the IN/OUT interval system.
   * - player_in event marks when a player enters the field
   * - player_out event marks when a player leaves the field
   * - substitution events also create implicit IN/OUT
   * - Each period is tracked independently with exact intervals
   */
  const calculatePlayerMinutes = (team: 'home' | 'away', periodsPlayed: number): PlayerMinutes => {
    const minutes: PlayerMinutes = {};
    const players = team === 'home' ? state.homeTeam.players : state.awayTeam.players;
    
    // Initialize all players with 0 for each period
    players.forEach(p => {
      minutes[p.id] = { total: 0 };
      for (let i = 1; i <= periodsPlayed; i++) {
        minutes[p.id][i] = 0;
      }
    });

    // Process each period independently
    for (let period = 1; period <= periodsPlayed; period++) {
      const periodEvents = state.events.filter(e => e.period === period);
      const periodEnd = periodEvents.find(e => e.type === 'period_end');
      
      // Period duration in seconds
      const periodDurationSeconds = periodEnd 
        ? periodEnd.timestamp 
        : (period === state.currentPeriod ? state.elapsedTime : state.periodDuration * 60);

      // Track intervals for each player: entry time when they went on field
      const playerEntryTime: { [id: string]: number | null } = {};

      // Process all events in chronological order
      periodEvents.forEach(event => {
        // Player enters field
        if (event.type === 'player_in' && event.team === team && event.playerId) {
          playerEntryTime[event.playerId] = event.timestamp;
        }
        
        // Player leaves field
        if (event.type === 'player_out' && event.team === team && event.playerId) {
          const entryTime = playerEntryTime[event.playerId];
          if (entryTime !== null && entryTime !== undefined) {
            const intervalMinutes = Math.floor((event.timestamp - entryTime) / 60);
            minutes[event.playerId][period] += intervalMinutes;
            playerEntryTime[event.playerId] = null;
          }
        }
        
        // Substitution: playerOut leaves, playerIn enters
        if (event.type === 'substitution' && event.team === team) {
          // Player going out
          if (event.playerOutId) {
            const entryTime = playerEntryTime[event.playerOutId];
            if (entryTime !== null && entryTime !== undefined) {
              const intervalMinutes = Math.floor((event.timestamp - entryTime) / 60);
              minutes[event.playerOutId][period] += intervalMinutes;
            }
            playerEntryTime[event.playerOutId] = null;
          }
          // Player coming in
          if (event.playerInId) {
            playerEntryTime[event.playerInId] = event.timestamp;
          }
        }
        
        // Red card: player leaves field immediately
        if (event.type === 'red_card' && event.team === team && event.playerId) {
          const entryTime = playerEntryTime[event.playerId];
          if (entryTime !== null && entryTime !== undefined) {
            const intervalMinutes = Math.floor((event.timestamp - entryTime) / 60);
            minutes[event.playerId][period] += intervalMinutes;
          }
          playerEntryTime[event.playerId] = null;
        }
      });

      // Note: player_out events at period end already close all intervals
      // So we don't need to calculate remaining time here
    }

    // Calculate totals
    Object.keys(minutes).forEach(id => {
      let total = 0;
      for (let i = 1; i <= periodsPlayed; i++) {
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
      if (event.type === 'own_goal') {
        const scorerName = `Autogol (${event.playerName || `#${event.playerNumber}`})`;
        if (event.team === 'home') {
          awayGoals[scorerName] = (awayGoals[scorerName] || 0) + 1;
        } else {
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

  const handleExport = async () => {
    const periodsPlayed = state.periodScores.length > 0 
      ? Math.max(...state.periodScores.map(ps => ps.period))
      : state.currentPeriod;

    const homeMinutes = calculatePlayerMinutes('home', periodsPlayed);
    const awayMinutes = calculatePlayerMinutes('away', periodsPlayed);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Match Tracker';
    workbook.created = new Date();

    // === Sheet 1: Match Summary ===
    const summarySheet = workbook.addWorksheet('Riepilogo');
    summarySheet.addRow(['RIEPILOGO PARTITA']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Squadra Casa', state.homeTeam.name]);
    summarySheet.addRow(['Squadra Ospite', state.awayTeam.name]);
    summarySheet.addRow(['Risultato Finale', `${state.homeTeam.score} - ${state.awayTeam.score}`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['PUNTEGGI PARZIALI']);
    summarySheet.addRow(['Tempo', 'Punteggio', `Marcatori ${state.homeTeam.name}`, `Marcatori ${state.awayTeam.name}`]);
    
    state.periodScores.forEach(ps => {
      const scorers = getScorersForPeriod(ps.period);
      summarySheet.addRow([
        `${ps.period}° Tempo`,
        `${ps.homeScore} - ${ps.awayScore}`,
        scorers.home,
        scorers.away
      ]);
    });

    // Style the header
    summarySheet.getRow(1).font = { bold: true, size: 14 };
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 25;
    summarySheet.getColumn(3).width = 30;
    summarySheet.getColumn(4).width = 30;

    // === Sheet 2: Events ===
    const eventsSheet = workbook.addWorksheet('Cronaca');
    eventsSheet.addRow(['Tempo', 'Minuto', 'Tipo Evento', 'Squadra', 'Giocatore', 'Numero', 'Dettagli']);
    eventsSheet.getRow(1).font = { bold: true };

    state.events.forEach(event => {
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

      eventsSheet.addRow([
        `${event.period}°`,
        formatTime(event.timestamp),
        eventType,
        teamName,
        event.playerName || '',
        event.playerNumber || '',
        details,
      ]);
    });

    eventsSheet.columns.forEach(col => { col.width = 18; });

    // === Sheet 3: Home Roster ===
    const homeSheet = workbook.addWorksheet('Rosa Casa');
    const periodHeaders = [];
    for (let i = 1; i <= periodsPlayed; i++) {
      periodHeaders.push(`T${i}`);
    }
    periodHeaders.push('Minuti Totali');

    homeSheet.addRow([state.homeTeam.name]);
    homeSheet.getRow(1).font = { bold: true, size: 12 };
    homeSheet.addRow(['Numero', 'Nome', 'Stato', ...periodHeaders]);
    homeSheet.getRow(2).font = { bold: true };

    state.homeTeam.players
      .filter(p => p.number !== null)
      .forEach(p => {
        const mins = homeMinutes[p.id] || { total: 0 };
        const periodMins = [];
        for (let i = 1; i <= periodsPlayed; i++) {
          periodMins.push(mins[i] || 0);
        }
        homeSheet.addRow([
          p.number,
          p.name,
          p.isExpelled ? 'Espulso' : (p.isOnField ? 'In Campo' : 'Panchina'),
          ...periodMins,
          mins.total
        ]);
      });

    homeSheet.columns.forEach(col => { col.width = 15; });

    // === Sheet 4: Away Roster ===
    const awaySheet = workbook.addWorksheet('Rosa Ospiti');
    awaySheet.addRow([state.awayTeam.name]);
    awaySheet.getRow(1).font = { bold: true, size: 12 };
    awaySheet.addRow(['Numero', 'Giocatore', 'Stato', ...periodHeaders]);
    awaySheet.getRow(2).font = { bold: true };

    state.awayTeam.players
      .filter(p => p.number !== null)
      .forEach(p => {
        const mins = awayMinutes[p.id] || { total: 0 };
        const periodMins = [];
        for (let i = 1; i <= periodsPlayed; i++) {
          periodMins.push(mins[i] || 0);
        }
        awaySheet.addRow([
          p.number,
          p.name || `#${p.number}`,
          p.isExpelled ? 'Espulso' : (p.isOnField ? 'In Campo' : 'Panchina'),
          ...periodMins,
          mins.total
        ]);
      });

    awaySheet.columns.forEach(col => { col.width = 15; });

    // Generate and download file
    const date = new Date().toISOString().split('T')[0];
    const filename = `partita_${state.homeTeam.name.replace(/\s+/g, '_')}_vs_${state.awayTeam.name.replace(/\s+/g, '_')}_${date}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

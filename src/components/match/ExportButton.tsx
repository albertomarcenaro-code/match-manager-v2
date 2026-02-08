import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MatchState } from '@/types/match';
import ExcelJS from 'exceljs';

interface ExportButtonProps {
  state: MatchState;
}

export function ExportButton({ state }: ExportButtonProps) {
  // Format time as MM:SS for all displays
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time played in seconds to MM:SS string
  const formatMinutesPlayed = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get per-period playtime directly from player object (no need to recalculate from events)
  const getPlayerPerPeriodMinutes = (player: MatchState['homeTeam']['players'][0], periodsPlayed: number) => {
    const periodTimes: number[] = [];
    for (let i = 1; i <= periodsPlayed; i++) {
      periodTimes.push(player.secondsPlayedPerPeriod?.[i] || 0);
    }
    return periodTimes;
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

  // Get starters for a period
  const getStartersForPeriod = (period: number): { home: string[]; away: string[] } => {
    const periodStartEvents = state.events.filter(
      e => e.type === 'player_in' && e.period === period && e.timestamp === 0
    );
    
    const homeStarters = periodStartEvents
      .filter(e => e.team === 'home')
      .map(e => e.playerName?.split('(')[0].trim() || `#${e.playerNumber}`)
      .filter(Boolean);
    
    const awayStarters = periodStartEvents
      .filter(e => e.team === 'away')
      .map(e => e.playerName?.split('(')[0].trim() || `#${e.playerNumber}`)
      .filter(Boolean);
    
    return { home: homeStarters, away: awayStarters };
  };

  const handleExport = async () => {
    const periodsPlayed = state.periodScores.length > 0 
      ? Math.max(...state.periodScores.map(ps => ps.period))
      : state.currentPeriod;

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
    
    // Ensure all periods are shown, even with 0-0 scores
    for (let period = 1; period <= periodsPlayed; period++) {
      const ps = state.periodScores.find(p => p.period === period);
      const homeScore = ps?.homeScore ?? 0;
      const awayScore = ps?.awayScore ?? 0;
      const scorers = getScorersForPeriod(period);
      const starters = getStartersForPeriod(period);
      
      // Period score row
      summarySheet.addRow([
        `${period}° Tempo`,
        `${homeScore} - ${awayScore}`,
        scorers.home,
        scorers.away
      ]);
      
      // Starters rows (separate lines for home and away)
      if (starters.home.length > 0 || starters.away.length > 0) {
        summarySheet.addRow([
          '',
          'Titolari Casa:',
          starters.home.join(', ') || '-',
          ''
        ]);
        summarySheet.addRow([
          '',
          'Titolari Ospiti:',
          '',
          starters.away.join(', ') || '-'
        ]);
      }
    }

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
    periodHeaders.push('Tempo Totale');

    homeSheet.addRow([state.homeTeam.name]);
    homeSheet.getRow(1).font = { bold: true, size: 12 };
    homeSheet.addRow(['Numero', 'Nome', 'Stato', ...periodHeaders]);
    homeSheet.getRow(2).font = { bold: true };

    state.homeTeam.players
      .filter(p => p.number !== null)
      .forEach(p => {
        // Use direct per-period tracking from player object
        const periodTimes = getPlayerPerPeriodMinutes(p, periodsPlayed).map(formatMinutesPlayed);
        const totalSeconds = p.totalSecondsPlayed || 0;
        
        homeSheet.addRow([
          p.number,
          p.name,
          p.isExpelled ? 'Espulso' : (p.isOnField ? 'In Campo' : 'Panchina'),
          ...periodTimes,
          formatMinutesPlayed(totalSeconds)
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
        // Use direct per-period tracking from player object
        const periodTimes = getPlayerPerPeriodMinutes(p, periodsPlayed).map(formatMinutesPlayed);
        const totalSeconds = p.totalSecondsPlayed || 0;
        
        awaySheet.addRow([
          p.number,
          p.name || `#${p.number}`,
          p.isExpelled ? 'Espulso' : (p.isOnField ? 'In Campo' : 'Panchina'),
          ...periodTimes,
          formatMinutesPlayed(totalSeconds)
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

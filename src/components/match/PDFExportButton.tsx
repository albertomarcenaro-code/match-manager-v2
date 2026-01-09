import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { MatchState } from '@/types/match';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportButtonProps {
  state: MatchState;
}

interface PlayerMinutes {
  [playerId: string]: {
    [period: number]: number;
    total: number;
  };
}

export function PDFExportButton({ state }: PDFExportButtonProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePlayerMinutes = (team: 'home' | 'away', periodsPlayed: number): PlayerMinutes => {
    const minutes: PlayerMinutes = {};
    const players = team === 'home' ? state.homeTeam.players : state.awayTeam.players;
    
    players.forEach(p => {
      minutes[p.id] = { total: 0 };
      for (let i = 1; i <= periodsPlayed; i++) {
        minutes[p.id][i] = 0;
      }
    });

    for (let period = 1; period <= periodsPlayed; period++) {
      const periodEvents = state.events.filter(e => e.period === period);
      const periodStart = periodEvents.find(e => e.type === 'period_start');
      const periodEnd = periodEvents.find(e => e.type === 'period_end');
      
      if (!periodStart) continue;
      
      const periodDurationSeconds = periodEnd 
        ? periodEnd.timestamp 
        : (period === state.currentPeriod ? state.elapsedTime : state.periodDuration * 60);

      const playerOnField: { [id: string]: boolean } = {};
      const playerEntryTime: { [id: string]: number } = {};
      const playerExpelled: { [id: string]: boolean } = {};

      if (period === 1) {
        if (team === 'home') {
          players.forEach(p => {
            if ('isStarter' in p && (p as any).isStarter) {
              playerOnField[p.id] = true;
              playerEntryTime[p.id] = 0;
            }
          });
        } else {
          const subbedInPlayers = new Set<string>();
          const subbedOutPlayers = new Set<string>();
          
          state.events.filter(e => e.type === 'substitution' && e.team === 'away').forEach(e => {
            if (e.playerInId) subbedInPlayers.add(e.playerInId);
            if (e.playerOutId) subbedOutPlayers.add(e.playerOutId);
          });
          
          players.forEach(p => {
            const wasSubbedOut = subbedOutPlayers.has(p.id);
            const wasSubbedIn = subbedInPlayers.has(p.id);
            const isCurrentlyOnField = p.isOnField;
            
            if ((wasSubbedOut && !wasSubbedIn) || (isCurrentlyOnField && !wasSubbedIn)) {
              playerOnField[p.id] = true;
              playerEntryTime[p.id] = 0;
            }
          });
        }
      } else {
        const previousPeriodEvents = state.events.filter(e => e.period < period);
        const onFieldAtStart: { [id: string]: boolean } = {};
        
        if (team === 'home') {
          players.forEach(p => {
            if ('isStarter' in p && (p as any).isStarter) {
              onFieldAtStart[p.id] = true;
            }
          });
        } else {
          const allSubsAway = state.events.filter(
            e => e.type === 'substitution' && e.team === 'away'
          );
          const allSubbedIn = new Set<string>();
          const allSubbedOut = new Set<string>();
          
          allSubsAway.forEach(e => {
            if (e.playerInId) allSubbedIn.add(e.playerInId);
            if (e.playerOutId) allSubbedOut.add(e.playerOutId);
          });
          
          players.forEach(p => {
            const wasSubbedOut = allSubbedOut.has(p.id);
            const wasSubbedIn = allSubbedIn.has(p.id);
            const isCurrentlyOnField = p.isOnField;
            
            if ((wasSubbedOut && !wasSubbedIn) || (isCurrentlyOnField && !wasSubbedIn)) {
              onFieldAtStart[p.id] = true;
            }
          });
        }

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

      periodEvents.forEach(event => {
        if (event.type === 'substitution' && event.team === team) {
          if (event.playerOutId && playerOnField[event.playerOutId]) {
            const entryTime = playerEntryTime[event.playerOutId] || 0;
            const minutesPlayed = Math.floor((event.timestamp - entryTime) / 60);
            minutes[event.playerOutId][period] += minutesPlayed;
            playerOnField[event.playerOutId] = false;
          }
          if (event.playerInId) {
            playerOnField[event.playerInId] = true;
            playerEntryTime[event.playerInId] = event.timestamp;
          }
        }
        
        if (event.type === 'red_card' && event.team === team && event.playerId) {
          if (playerOnField[event.playerId]) {
            const entryTime = playerEntryTime[event.playerId] || 0;
            const minutesPlayed = Math.floor((event.timestamp - entryTime) / 60);
            minutes[event.playerId][period] += minutesPlayed;
            playerOnField[event.playerId] = false;
            playerExpelled[event.playerId] = true;
          }
        }
      });

      Object.keys(playerOnField).forEach(id => {
        if (playerOnField[id] && !playerExpelled[id]) {
          const entryTime = playerEntryTime[id] || 0;
          const minutesPlayed = Math.floor((periodDurationSeconds - entryTime) / 60);
          minutes[id][period] += minutesPlayed;
        }
      });
    }

    Object.keys(minutes).forEach(id => {
      let total = 0;
      for (let i = 1; i <= periodsPlayed; i++) {
        total += minutes[id][i] || 0;
      }
      minutes[id].total = total;
    });

    return minutes;
  };

  const getPlayerStats = (team: 'home' | 'away') => {
    const players = team === 'home' ? state.homeTeam.players : state.awayTeam.players;
    const stats: { [id: string]: { goals: number; yellowCards: number; redCards: number } } = {};

    players.forEach(p => {
      stats[p.id] = { goals: 0, yellowCards: 0, redCards: 0 };
    });

    state.events.forEach(event => {
      if (event.team !== team) return;
      if (event.type === 'goal' && event.playerId) {
        stats[event.playerId] = stats[event.playerId] || { goals: 0, yellowCards: 0, redCards: 0 };
        stats[event.playerId].goals++;
      }
      if (event.type === 'yellow_card' && event.playerId) {
        stats[event.playerId] = stats[event.playerId] || { goals: 0, yellowCards: 0, redCards: 0 };
        stats[event.playerId].yellowCards++;
      }
      if (event.type === 'red_card' && event.playerId) {
        stats[event.playerId] = stats[event.playerId] || { goals: 0, yellowCards: 0, redCards: 0 };
        stats[event.playerId].redCards++;
      }
    });

    return stats;
  };

  const getGoalScorers = (team: 'home' | 'away', period?: number) => {
    return state.events
      .filter(e => e.team === team && e.type === 'goal' && (period === undefined || e.period === period))
      .map(e => e.playerName || 'N/D');
  };

  const handleExport = () => {
    const periodsPlayed = state.periodScores.length > 0 
      ? Math.max(...state.periodScores.map(ps => ps.period))
      : state.currentPeriod;

    const homeMinutes = calculatePlayerMinutes('home', periodsPlayed);
    const awayMinutes = calculatePlayerMinutes('away', periodsPlayed);
    const homeStats = getPlayerStats('home');
    const awayStats = getPlayerStats('away');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 6;
    
    let y = 8;
    
    // Date small top right
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(new Date().toLocaleDateString('it-IT', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }), pageWidth - margin, y, { align: 'right' });

    // Main score line
    y = 14;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const scoreText = `${state.homeTeam.score} - ${state.awayTeam.score}`;
    const centerX = pageWidth / 2;

    doc.text(state.homeTeam.name, centerX - 25, y, { align: 'right' });
    doc.setFontSize(14);
    doc.text(scoreText, centerX, y, { align: 'center' });
    doc.setFontSize(10);
    doc.text(state.awayTeam.name, centerX + 25, y, { align: 'left' });

    // Period scores with scorers - centered and on new lines
    y = 20;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    state.periodScores.forEach((ps) => {
      const homeScorers = getGoalScorers('home', ps.period);
      const awayScorers = getGoalScorers('away', ps.period);
      
      let text = `${ps.period}° TEMPO: ${ps.homeScore} - ${ps.awayScore}`;
      doc.text(text, centerX, y, { align: 'center' });
      y += 3;
      
      if (homeScorers.length > 0 || awayScorers.length > 0) {
        const scorersText: string[] = [];
        if (homeScorers.length > 0) scorersText.push(`Casa: ${homeScorers.join(', ')}`);
        if (awayScorers.length > 0) scorersText.push(`Ospiti: ${awayScorers.join(', ')}`);
        doc.setFontSize(5);
        doc.text(scorersText.join('  |  '), centerX, y, { align: 'center' });
        doc.setFontSize(6);
        y += 3;
      }
    });
    // Separator
    y += 1;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
    y += 3;

    // Team tables side by side
    const tableWidth = (pageWidth - margin * 3) / 2;
    
    const periodHeaders: string[] = [];
    for (let i = 1; i <= periodsPlayed; i++) {
      periodHeaders.push(`T${i}`);
    }

    // HOME TEAM TABLE
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 70, 63);
    doc.text(state.homeTeam.name.toUpperCase(), margin, y);

    const homeRosterData = state.homeTeam.players
      .filter(p => p.number !== null)
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map(p => {
        const mins = homeMinutes[p.id] || { total: 0 };
        const pStats = homeStats[p.id] || { goals: 0, yellowCards: 0, redCards: 0 };
        
        const row: string[] = [
          p.number?.toString() || '',
          p.name.length > 10 ? p.name.substring(0, 9) + '.' : p.name,
        ];
        
        for (let i = 1; i <= periodsPlayed; i++) {
          row.push((mins[i] || 0).toString());
        }
        
        row.push(mins.total.toString());
        row.push(pStats.goals > 0 ? pStats.goals.toString() : '');
        
        let cards = '';
        if (pStats.yellowCards > 0) cards += 'A';
        if (pStats.redCards > 0) cards += 'E';
        row.push(cards);
        
        return row;
      });

    const tableHeaders = ['#', 'Nome', ...periodHeaders, 'Tot', 'G', 'C'];

    autoTable(doc, {
      startY: y + 1,
      head: [tableHeaders],
      body: homeRosterData,
      theme: 'plain',
      headStyles: { 
        fillColor: [245, 245, 245], 
        textColor: [39, 70, 63],
        fontSize: 5,
        fontStyle: 'bold',
        cellPadding: 0.8,
      },
      bodyStyles: { 
        fontSize: 5,
        cellPadding: 0.8,
      },
      columnStyles: {
        0: { cellWidth: 5 },
        1: { cellWidth: 18 },
      },
      tableWidth: tableWidth,
      margin: { left: margin },
    });

    const homeTableEndY = (doc as any).lastAutoTable?.finalY || y + 30;

    // AWAY TEAM TABLE
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text(state.awayTeam.name.toUpperCase(), pageWidth / 2 + margin / 2, y);

    const awayRosterData = state.awayTeam.players
      .filter(p => p.number !== null)
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map(p => {
        const mins = awayMinutes[p.id] || { total: 0 };
        const pStats = awayStats[p.id] || { goals: 0, yellowCards: 0, redCards: 0 };
        
        const displayName = p.name || `#${p.number}`;
        const row: string[] = [
          p.number?.toString() || '',
          displayName.length > 10 ? displayName.substring(0, 9) + '.' : displayName,
        ];
        
        for (let i = 1; i <= periodsPlayed; i++) {
          row.push((mins[i] || 0).toString());
        }
        
        row.push(mins.total.toString());
        row.push(pStats.goals > 0 ? pStats.goals.toString() : '');
        
        let cards = '';
        if (pStats.yellowCards > 0) cards += 'A';
        if (pStats.redCards > 0) cards += 'E';
        row.push(cards);
        
        return row;
      });

    autoTable(doc, {
      startY: y + 1,
      head: [tableHeaders],
      body: awayRosterData,
      theme: 'plain',
      headStyles: { 
        fillColor: [245, 245, 245], 
        textColor: [75, 85, 99],
        fontSize: 5,
        fontStyle: 'bold',
        cellPadding: 0.8,
      },
      bodyStyles: { 
        fontSize: 5,
        cellPadding: 0.8,
      },
      columnStyles: {
        0: { cellWidth: 5 },
        1: { cellWidth: 18 },
      },
      tableWidth: tableWidth,
      margin: { left: pageWidth / 2 + margin / 2 },
    });

    const awayTableEndY = (doc as any).lastAutoTable?.finalY || y + 30;
    y = Math.max(homeTableEndY, awayTableEndY) + 3;

    // EVENTS TIMELINE
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CRONACA', margin, y);
    y += 2;

    const significantEvents = state.events.filter(
      e => e.type !== 'period_start' && e.type !== 'period_end'
    );

    if (significantEvents.length > 0) {
      const eventData = significantEvents.map(e => {
        // Text labels only - no emojis
        let tipo = '';
        switch (e.type) {
          case 'goal': tipo = 'GOAL'; break;
          case 'own_goal': tipo = 'AUTOGOL'; break;
          case 'substitution': tipo = 'CAMBIO'; break;
          case 'yellow_card': tipo = 'AMMONIZIONE'; break;
          case 'red_card': tipo = 'ESPULSIONE'; break;
        }
        
        // Clean description - remove all emojis and unicode symbols
        let cleanDesc = e.description
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove all emojis
          .replace(/[⚽🔄🟨🟥➡️⬅️↔️]/g, '') // Remove specific symbols
          .replace(/GOL!/gi, '')
          .replace(/AUTOGOL/gi, '')
          .replace(/Cartellino giallo per/gi, '')
          .replace(/Cartellino rosso per/gi, '')
          .replace(/Sostituzione:/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanDesc.length > 50) cleanDesc = cleanDesc.substring(0, 49) + '...';
        
        return [
          `${e.period}T`,
          formatTime(e.timestamp),
          tipo,
          e.team === 'home' ? 'C' : 'O',
          cleanDesc
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Tempo', 'Minuto', 'Evento', 'Sq', 'Descrizione']],
        body: eventData,
        theme: 'plain',
        headStyles: { 
          fillColor: [245, 245, 245],
          fontSize: 5,
          fontStyle: 'bold',
          cellPadding: 0.8,
        },
        bodyStyles: { 
          fontSize: 5,
          cellPadding: 0.8,
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 12 },
          2: { cellWidth: 18 },
          3: { cellWidth: 6 },
          4: { cellWidth: 'auto' },
        },
        tableWidth: pageWidth - margin * 2,
        margin: { left: margin, right: margin },
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(5);
    doc.setTextColor(150);
    doc.text('Match Manager Live', pageWidth / 2, pageHeight - 4, { align: 'center' });

    // Save
    const fileName = `${state.homeTeam.name}_vs_${state.awayTeam.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName.replace(/\s+/g, '_'));
  };

  return (
    <Button onClick={handleExport} variant="outline" className="gap-2">
      <FileText className="h-4 w-4" />
      Esporta PDF
    </Button>
  );
}

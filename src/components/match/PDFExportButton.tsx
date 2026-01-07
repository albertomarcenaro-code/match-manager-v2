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
    const margin = 8;
    
    // Clean header - no colored background
    let y = 10;
    
    // Date (small, top right)
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(new Date().toLocaleDateString('it-IT', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }), pageWidth - margin, y, { align: 'right' });

    // Main score line: HOME  SCORE  AWAY
    y = 18;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    const scoreText = `${state.homeTeam.score} - ${state.awayTeam.score}`;
    const homeNameWidth = doc.getTextWidth(state.homeTeam.name);
    const awayNameWidth = doc.getTextWidth(state.awayTeam.name);
    const scoreWidth = doc.getTextWidth(scoreText);
    
    // Center alignment
    const centerX = pageWidth / 2;
    const scoreX = centerX;
    const homeX = centerX - scoreWidth / 2 - 8;
    const awayX = centerX + scoreWidth / 2 + 8;

    doc.text(state.homeTeam.name, homeX, y, { align: 'right' });
    doc.setFontSize(16);
    doc.text(scoreText, scoreX, y, { align: 'center' });
    doc.setFontSize(12);
    doc.text(state.awayTeam.name, awayX, y, { align: 'left' });

    // Period scores with scorers
    y = 26;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    state.periodScores.forEach((ps, index) => {
      const homeScorers = getGoalScorers('home', ps.period);
      const awayScorers = getGoalScorers('away', ps.period);
      
      const periodLabel = `${ps.period}T: ${ps.homeScore}-${ps.awayScore}`;
      let scorersText = '';
      
      if (homeScorers.length > 0 || awayScorers.length > 0) {
        const homePart = homeScorers.length > 0 ? homeScorers.join(', ') : '';
        const awayPart = awayScorers.length > 0 ? awayScorers.join(', ') : '';
        if (homePart && awayPart) {
          scorersText = ` (${homePart} | ${awayPart})`;
        } else if (homePart) {
          scorersText = ` (${homePart})`;
        } else {
          scorersText = ` (${awayPart})`;
        }
      }
      
      doc.text(`${periodLabel}${scorersText}`, centerX, y, { align: 'center' });
      y += 4;
    });

    y += 2;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Team tables side by side
    const tableWidth = (pageWidth - margin * 3) / 2;
    
    // Generate period headers
    const periodHeaders = [];
    for (let i = 1; i <= periodsPlayed; i++) {
      periodHeaders.push(`T${i}`);
    }

    // HOME TEAM TABLE
    doc.setFontSize(8);
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
          p.name.length > 12 ? p.name.substring(0, 11) + '.' : p.name,
        ];
        
        // Add period minutes
        for (let i = 1; i <= periodsPlayed; i++) {
          row.push((mins[i] || 0).toString());
        }
        
        row.push(mins.total.toString());
        row.push(pStats.goals > 0 ? pStats.goals.toString() : '');
        
        // Cards as text
        let cards = '';
        if (pStats.yellowCards > 0) cards += 'A';
        if (pStats.redCards > 0) cards += 'E';
        row.push(cards);
        
        return row;
      });

    const homeHeaders = ['#', 'Giocatore', ...periodHeaders, 'Tot', 'G', 'C'];

    autoTable(doc, {
      startY: y + 2,
      head: [homeHeaders],
      body: homeRosterData,
      theme: 'plain',
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [39, 70, 63],
        fontSize: 6,
        fontStyle: 'bold',
        cellPadding: 1,
      },
      bodyStyles: { 
        fontSize: 6,
        cellPadding: 1,
      },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 22 },
      },
      tableWidth: tableWidth,
      margin: { left: margin },
    });

    const homeTableEndY = (doc as any).lastAutoTable?.finalY || y + 40;

    // AWAY TEAM TABLE
    doc.setFontSize(8);
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
          displayName.length > 12 ? displayName.substring(0, 11) + '.' : displayName,
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
      startY: y + 2,
      head: [homeHeaders],
      body: awayRosterData,
      theme: 'plain',
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [75, 85, 99],
        fontSize: 6,
        fontStyle: 'bold',
        cellPadding: 1,
      },
      bodyStyles: { 
        fontSize: 6,
        cellPadding: 1,
      },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 22 },
      },
      tableWidth: tableWidth,
      margin: { left: pageWidth / 2 + margin / 2 },
    });

    const awayTableEndY = (doc as any).lastAutoTable?.finalY || y + 40;
    y = Math.max(homeTableEndY, awayTableEndY) + 4;

    // EVENTS TIMELINE
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CRONACA', margin, y);
    y += 3;

    const significantEvents = state.events.filter(
      e => e.type !== 'period_start' && e.type !== 'period_end'
    );

    if (significantEvents.length > 0) {
      const eventData = significantEvents.map(e => {
        // Use simple text symbols that render correctly in PDF
        let icon = '';
        switch (e.type) {
          case 'goal': icon = 'GOL'; break;
          case 'own_goal': icon = 'AG'; break;
          case 'substitution': icon = 'S'; break;
          case 'yellow_card': icon = 'A'; break;
          case 'red_card': icon = 'E'; break;
        }
        
        // Clean description - remove emojis
        const cleanDesc = e.description
          .replace(/[⚽🔄🟨🟥➡️]/g, '')
          .replace(/GOL!/, '')
          .replace(/AUTOGOL/, 'AG')
          .replace(/Cartellino giallo per/, 'Amm.')
          .replace(/Cartellino rosso per/, 'Esp.')
          .trim();
        
        return [
          `${e.period}T`,
          formatTime(e.timestamp),
          icon,
          e.team === 'home' ? 'C' : 'O',
          cleanDesc.length > 45 ? cleanDesc.substring(0, 44) + '...' : cleanDesc
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['T', 'Min', 'Tipo', '', 'Evento']],
        body: eventData,
        theme: 'plain',
        headStyles: { 
          fillColor: [240, 240, 240],
          fontSize: 6,
          fontStyle: 'bold',
          cellPadding: 1,
        },
        bodyStyles: { 
          fontSize: 6,
          cellPadding: 1,
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 12 },
          2: { cellWidth: 10 },
          3: { cellWidth: 6 },
          4: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text('Match Manager Live', pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Legend
    doc.setFontSize(5);
    doc.text('G=Gol | A=Ammonizione | E=Espulsione | C=Casa | O=Ospite | S=Sostituzione | AG=Autogol', pageWidth / 2, pageHeight - 2, { align: 'center' });

    // Download
    const date = new Date().toISOString().split('T')[0];
    const filename = `referto_${state.homeTeam.name.replace(/\s+/g, '_')}_vs_${state.awayTeam.name.replace(/\s+/g, '_')}_${date}.pdf`;
    doc.save(filename);
  };

  return (
    <Button
      onClick={handleExport}
      className="gap-2"
      variant="outline"
      size="lg"
    >
      <FileText className="h-5 w-5" />
      Esporta PDF
    </Button>
  );
}

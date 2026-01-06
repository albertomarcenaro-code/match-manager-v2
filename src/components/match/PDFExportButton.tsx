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

  const handleExport = () => {
    const periodsPlayed = state.periodScores.length > 0 
      ? Math.max(...state.periodScores.map(ps => ps.period))
      : state.currentPeriod;

    const homeMinutes = calculatePlayerMinutes('home', periodsPlayed);
    const awayMinutes = calculatePlayerMinutes('away', periodsPlayed);
    const homeStats = getPlayerStats('home');
    const awayStats = getPlayerStats('away');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors matching the app
    const primaryColor: [number, number, number] = [39, 70, 63]; // Dark green
    const secondaryColor: [number, number, number] = [76, 175, 80]; // Green

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REFERTO PARTITA', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`${state.homeTeam.name} vs ${state.awayTeam.name}`, pageWidth / 2, 25, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), pageWidth / 2, 32, { align: 'center' });

    // Score box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(`${state.homeTeam.score} - ${state.awayTeam.score}`, pageWidth / 2, 55, { align: 'center' });

    // Period scores
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodScoresText = state.periodScores.map(ps => 
      `${ps.period}°T: ${ps.homeScore}-${ps.awayScore}`
    ).join('  |  ');
    doc.text(periodScoresText, pageWidth / 2, 62, { align: 'center' });

    let currentY = 75;

    // Home team table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text(state.homeTeam.name.toUpperCase(), 14, currentY);
    currentY += 5;

    const homeRosterData = state.homeTeam.players
      .filter(p => p.number !== null)
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map(p => {
        const mins = homeMinutes[p.id] || { total: 0 };
        const pStats = homeStats[p.id] || { goals: 0, yellowCards: 0, redCards: 0 };
        return [
          p.number?.toString() || '',
          p.name,
          mins.total.toString(),
          pStats.goals > 0 ? pStats.goals.toString() : '',
          pStats.yellowCards > 0 ? '🟨' : '',
          pStats.redCards > 0 ? '🟥' : ''
        ];
      });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Giocatore', 'Min', 'Gol', 'Amm', 'Esp']],
      body: homeRosterData,
      theme: 'striped',
      headStyles: { fillColor: secondaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 50 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
      },
      margin: { left: 14, right: pageWidth / 2 + 5 },
    });

    // Away team table (on the right)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text(state.awayTeam.name.toUpperCase(), pageWidth / 2 + 10, 75);

    const awayRosterData = state.awayTeam.players
      .filter(p => p.number !== null)
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map(p => {
        const mins = awayMinutes[p.id] || { total: 0 };
        const pStats = awayStats[p.id] || { goals: 0, yellowCards: 0, redCards: 0 };
        return [
          p.number?.toString() || '',
          p.name || `#${p.number}`,
          mins.total.toString(),
          pStats.goals > 0 ? pStats.goals.toString() : '',
          pStats.yellowCards > 0 ? '🟨' : '',
          pStats.redCards > 0 ? '🟥' : ''
        ];
      });

    autoTable(doc, {
      startY: 80,
      head: [['#', 'Giocatore', 'Min', 'Gol', 'Amm', 'Esp']],
      body: awayRosterData,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 50 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
      },
      margin: { left: pageWidth / 2 + 10, right: 14 },
    });

    // Events section
    const eventsY = Math.max(
      (doc as any).lastAutoTable?.finalY || 150,
      150
    ) + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CRONACA EVENTI', 14, eventsY);

    const eventData = state.events
      .filter(e => e.type !== 'period_start' && e.type !== 'period_end')
      .map(e => {
        let icon = '';
        switch (e.type) {
          case 'goal': icon = '⚽'; break;
          case 'own_goal': icon = '⚽ (AG)'; break;
          case 'substitution': icon = '🔄'; break;
          case 'yellow_card': icon = '🟨'; break;
          case 'red_card': icon = '🟥'; break;
        }
        return [
          `${e.period}°`,
          formatTime(e.timestamp),
          icon,
          e.team === 'home' ? state.homeTeam.name : state.awayTeam.name,
          e.description.replace(/[⚽🔄🟨🟥]/g, '').trim()
        ];
      });

    if (eventData.length > 0) {
      autoTable(doc, {
        startY: eventsY + 5,
        head: [['T', 'Min', '', 'Squadra', 'Descrizione']],
        body: eventData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 15 },
          2: { cellWidth: 15 },
          3: { cellWidth: 35 },
          4: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Match Manager Live', pageWidth / 2, pageHeight - 10, { align: 'center' });

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

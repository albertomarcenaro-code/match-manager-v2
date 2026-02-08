import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { MatchState } from '@/types/match';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportButtonProps {
  state: MatchState;
}

// Note: PlayerMinutes interface removed since we now use direct player.secondsPlayedPerPeriod

export function PDFExportButton({ state }: PDFExportButtonProps) {
  // Format time as mm'ss" always including seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
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

  // Get goal scorers including own goals (with AG prefix)
  const getGoalScorers = (team: 'home' | 'away', period?: number) => {
    const goals: string[] = [];
    
    // Regular goals for this team
    state.events
      .filter(e => e.team === team && e.type === 'goal' && (period === undefined || e.period === period))
      .forEach(e => {
        const name = e.playerName?.split('(')[0].trim() || 'N/D';
        goals.push(name);
      });
    
    // Own goals: when the OTHER team scores an own goal, it counts for THIS team
    // An own goal by 'home' team counts as a goal for 'away' team and vice versa
    const oppositeTeam = team === 'home' ? 'away' : 'home';
    state.events
      .filter(e => e.team === oppositeTeam && e.type === 'own_goal' && (period === undefined || e.period === period))
      .forEach(e => {
        const name = e.playerName?.split('(')[0].trim() || '';
        goals.push(`AG ${name}`.trim());
      });
    
    return goals;
  };

  const handleExport = () => {
    const periodsPlayed = state.periodScores.length > 0 
      ? Math.max(...state.periodScores.map(ps => ps.period))
      : state.currentPeriod;

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

    // Period scores with scorers - home left, away right
    y = 20;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    if (state.periodScores.length === 0 && periodsPlayed === 0) {
      doc.setFont('helvetica', 'italic');
      doc.text('Nessun tempo completato', centerX, y, { align: 'center' });
      y += 4;
    } else {
      // Show all periods including 0-0 scores
      for (let period = 1; period <= periodsPlayed; period++) {
        const ps = state.periodScores.find(p => p.period === period);
        const homeScore = ps?.homeScore ?? 0;
        const awayScore = ps?.awayScore ?? 0;
        const homeScorers = getGoalScorers('home', period);
        const awayScorers = getGoalScorers('away', period);
        
        // Period score centered - displays the DELTA (partial) score
        // Force "0" to render as string, not treated as falsey
        const text = `${period}° TEMPO: ${String(homeScore)} - ${String(awayScore)}`;
        doc.text(text, centerX, y, { align: 'center' });
        y += 3;
        
        // Scorers: home left-aligned, away right-aligned
        if (homeScorers.length > 0 || awayScorers.length > 0) {
          doc.setFontSize(5);
          if (homeScorers.length > 0) {
            doc.text(homeScorers.join(', '), margin, y, { align: 'left' });
          }
          if (awayScorers.length > 0) {
            doc.text(awayScorers.join(', '), pageWidth - margin, y, { align: 'right' });
          }
          doc.setFontSize(6);
          y += 3;
        } else if (homeScore === 0 && awayScore === 0) {
          doc.setFontSize(5);
          doc.setFont('helvetica', 'italic');
          doc.text('Nessun gol', centerX, y, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          y += 3;
        }
      }
    }
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

    const homeStats = getPlayerStats('home');
    const homeRosterData = state.homeTeam.players
      .filter(p => p.number !== null)
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map(p => {
        const pStats = homeStats[p.id] || { goals: 0, yellowCards: 0, redCards: 0 };
        const periodTimes = getPlayerPerPeriodMinutes(p, periodsPlayed);
        const totalSeconds = p.totalSecondsPlayed || 0;
        
        // Full name without truncation
        const row: string[] = [
          p.number?.toString() || '',
          p.name,
        ];
        
        for (let i = 0; i < periodsPlayed; i++) {
          row.push(formatMinutesPlayed(periodTimes[i] || 0));
        }
        
        row.push(formatMinutesPlayed(totalSeconds));
        row.push(pStats.goals > 0 ? pStats.goals.toString() : '');
        
        let cards = '';
        if (pStats.yellowCards > 0) cards += 'A';
        if (pStats.redCards > 0) cards += 'E';
        row.push(cards);
        
        return row;
      });

    const tableHeaders = ['#', 'Nome', ...periodHeaders, 'Tot', 'GOAL', 'CARTELLINO'];

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
        0: { cellWidth: 6 },
        1: { cellWidth: 'auto' },
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

    const awayStats = getPlayerStats('away');
    const awayRosterData = state.awayTeam.players
      .filter(p => p.number !== null)
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map(p => {
        const pStats = awayStats[p.id] || { goals: 0, yellowCards: 0, redCards: 0 };
        const periodTimes = getPlayerPerPeriodMinutes(p, periodsPlayed);
        const totalSeconds = p.totalSecondsPlayed || 0;
        
        // Full name without truncation
        const displayName = p.name || `#${p.number}`;
        const row: string[] = [
          p.number?.toString() || '',
          displayName,
        ];
        
        for (let i = 0; i < periodsPlayed; i++) {
          row.push(formatMinutesPlayed(periodTimes[i] || 0));
        }
        
        row.push(formatMinutesPlayed(totalSeconds));
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
        0: { cellWidth: 6 },
        1: { cellWidth: 'auto' },
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

    // Filter out internal player_in/player_out events, keep significant events
    const significantEvents = state.events.filter(
      e => e.type !== 'player_in' && e.type !== 'player_out' && e.type !== 'period_start' && e.type !== 'period_end'
    );

    // Add grouped period starts with SEPARATE lines for home and away starters
    const periodStartEvents = state.events.filter(e => e.type === 'period_start');
    periodStartEvents.forEach(pse => {
      const starters = state.events.filter(
        e => e.type === 'player_in' && e.period === pse.period && e.timestamp === 0
      );
      if (starters.length > 0) {
        const homeStarters = starters.filter(e => e.team === 'home').map(e => e.playerName?.split('(')[0].trim()).filter(Boolean);
        const awayStarters = starters.filter(e => e.team === 'away').map(e => e.playerName?.split('(')[0].trim()).filter(Boolean);
        
        // Add period start event
        significantEvents.unshift({
          ...pse,
          description: `Inizio ${pse.period}° tempo`,
        });
        
        // Add home starters as separate entry
        if (homeStarters.length > 0) {
          significantEvents.push({
            ...pse,
            id: `${pse.id}-home-starters`,
            type: 'period_start' as const,
            team: 'home' as const,
            description: `Titolari ${state.homeTeam.name}: ${homeStarters.join(', ')}`,
          });
        }
        
        // Add away starters as separate entry
        if (awayStarters.length > 0) {
          significantEvents.push({
            ...pse,
            id: `${pse.id}-away-starters`,
            type: 'period_start' as const,
            team: 'away' as const,
            description: `Titolari ${state.awayTeam.name}: ${awayStarters.join(', ')}`,
          });
        }
      }
    });

    // Sort by period then timestamp
    significantEvents.sort((a, b) => a.period - b.period || a.timestamp - b.timestamp);

    if (significantEvents.length > 0) {
      const eventData = significantEvents.map(e => {
        // Clear text labels
        let tipo = '';
        switch (e.type) {
          case 'goal': tipo = 'GOAL'; break;
          case 'own_goal': tipo = 'AUTOGOL'; break;
          case 'substitution': tipo = 'CAMBIO'; break;
          case 'yellow_card': tipo = 'AMMONIZIONE'; break;
          case 'red_card': tipo = 'ESPULSIONE'; break;
          case 'period_start': tipo = 'INIZIO'; break;
        }
        
        // Clean description - remove emojis and redundant text
        let cleanDesc = e.description
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
          .replace(/[⚽🔄🟨🟥➡️⬅️↔️]/g, '')
          .replace(/GOL!/gi, '')
          .replace(/AUTOGOL/gi, '')
          .replace(/Cartellino giallo per/gi, '')
          .replace(/Cartellino rosso per/gi, '')
          .replace(/Sostituzione:/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Remove team name in parentheses from player names
        cleanDesc = cleanDesc.replace(/\s*\([^)]+\)\s*/g, ' ').trim();
        
        // Full team name - no truncation
        const teamName = e.team === 'home' ? state.homeTeam.name : state.awayTeam.name;
        
        return [
          `${e.period}T`,
          formatTime(e.timestamp),
          tipo,
          teamName,
          cleanDesc
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Tempo', 'Minuto', 'Evento', 'SQUADRA', 'Descrizione']],
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
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' },
        },
        tableWidth: pageWidth - margin * 2,
        margin: { left: margin, right: margin },
      });
    } else {
      // No events - show message
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Nessun evento registrato', centerX, y + 3, { align: 'center' });
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

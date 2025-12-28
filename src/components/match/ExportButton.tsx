import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MatchState } from '@/types/match';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  state: MatchState;
}

export function ExportButton({ state }: ExportButtonProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = () => {
    // Prepare match info sheet
    const matchInfo = [
      ['RIEPILOGO PARTITA'],
      [],
      ['Squadra Casa', state.homeTeam.name],
      ['Squadra Ospite', state.awayTeam.name],
      ['Risultato Finale', `${state.homeTeam.score} - ${state.awayTeam.score}`],
      [],
      ['PUNTEGGI PARZIALI'],
      ...state.periodScores.map(ps => [
        `${ps.period}° Tempo`, `${ps.homeScore} - ${ps.awayScore}`
      ]),
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

    // Prepare rosters sheet
    const homeRoster = state.homeTeam.players
      .filter(p => p.number !== null)
      .map(p => [p.number, p.name, p.isOnField ? 'In Campo' : 'Panchina']);
    
    const awayRoster = state.awayTeam.players
      .map(p => [p.number, `#${p.number}`, p.isOnField ? 'In Campo' : 'Panchina']);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Match info sheet
    const ws1 = XLSX.utils.aoa_to_sheet(matchInfo);
    XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

    // Events sheet
    const ws2 = XLSX.utils.aoa_to_sheet([eventsHeader, ...eventsData]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Cronaca');

    // Home roster sheet
    const ws3 = XLSX.utils.aoa_to_sheet([
      [state.homeTeam.name],
      ['Numero', 'Nome', 'Stato'],
      ...homeRoster
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Rosa Casa');

    // Away roster sheet
    const ws4 = XLSX.utils.aoa_to_sheet([
      [state.awayTeam.name],
      ['Numero', 'Giocatore', 'Stato'],
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

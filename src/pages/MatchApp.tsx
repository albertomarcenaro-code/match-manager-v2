import { useParams } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';

const MatchApp = () => {
  const { id } = useParams();
  const { state } = useMatch();

  // Se lo stato non è ancora pronto, mostriamo un messaggio semplice
  if (!state || !state.homeTeam) {
    return <div style={{ padding: "50px", textAlign: "center" }}>Inizializzazione in corso... ID: {id}</div>;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#2ea35f" }}>Test Match App</h1>
      <p>ID Partita: <strong>{id}</strong></p>
      
      <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "10px" }}>
        <h2>Configurazione Squadre</h2>
        <p>Casa: {state.homeTeam.name}</p>
        <p>Ospiti: {state.awayTeam.name}</p>
        <p>Giocatori in lista: {state.homeTeam.players.length + state.awayTeam.players.length}</p>
      </div>

      <p style={{ marginTop: "20px", color: "#666" }}>
        Se vedi questa scritta, il problema è nel componente <strong>RosterSetup</strong> o nell'<strong>Header</strong>.
      </p>
    </div>
  );
};

export default MatchApp;

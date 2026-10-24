import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="p-20 text-center">
      <Helmet>
        <title>Pagina non trovata | Match Manager Live</title>
        <meta name="description" content="La pagina richiesta non esiste. Torna alla home di Match Manager Live." />
      </Helmet>
      <h1 className="text-2xl font-bold">Errore 404</h1>
      <p>Stai cercando di visualizzare: <strong>{location.pathname}</strong></p>
      <p className="mt-4"><a href="/" className="text-blue-500 underline">Torna alla Home</a></p>
    </div>
  );
}

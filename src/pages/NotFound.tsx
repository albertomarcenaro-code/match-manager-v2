import { useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="p-20 text-center">
      <h1 className="text-2xl font-bold">Errore 404</h1>
      <p>Stai cercando di visualizzare: <strong>{location.pathname}</strong></p>
      <p className="mt-4"><a href="/" className="text-blue-500 underline">Torna alla Home</a></p>
    </div>
  );
}

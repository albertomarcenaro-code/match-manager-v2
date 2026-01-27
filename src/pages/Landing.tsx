import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Zap, Users, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] font-sans selection:bg-blue-100">
      <Helmet>
        <title>Match Manager Live | Gestione Professionale Match</title>
      </Helmet>

      {/* Navbar Minimalista */}
      <nav className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue-200 shadow-lg">
            <Trophy className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-gray-900">Match Manager</span>
        </div>
        <Button 
          variant="ghost" 
          className="rounded-full text-gray-600 hover:text-blue-600 transition-colors"
          onClick={() => navigate("/auth")}
        >
          Accedi
        </Button>
      </nav>

      {/* Hero Section stile NotebookLM */}
      <main className="max-w-5xl mx-auto pt-20 pb-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          Novità: Condivisione WhatsApp migliorata
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 text-gray-900 leading-[1.1]">
          Il campo da gioco, <br />
          <span className="text-blue-600">in tempo reale.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
          Gestisci le tue partite di calcio come un professionista. 
          Dalla formazione ai parziali, tutto a portata di click.
        </p>

        <div className="flex flex-col items-center gap-6">
          <Button 
            onClick={() => navigate("/auth")}
            className="h-16 px-10 text-xl rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all transform hover:scale-105 group"
          >
            Prova ora
            <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Zap className="w-4 h-4 fill-current" /> Nessuna carta di credito richiesta
          </p>
        </div>
      </main>

      {/* Sezione Features */}
      <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 py-24">
        <Feature 
          icon={<Users className="w-8 h-8 text-blue-600" />}
          title="Gestione Rose"
          description="Crea le tue squadre in pochi secondi e gestisci i titolari dinamicamente."
        />
        <Feature 
          icon={<Zap className="w-8 h-8 text-amber-500" />}
          title="Live Match"
          description="Cronaca istantanea di gol, cartellini e tempi di gioco senza interruzioni."
        />
        <Feature 
          icon={<Share2 className="w-8 h-8 text-green-600" />}
          title="Export Smart"
          description="Condividi il risultato finale su WhatsApp con un formato pulito e professionale."
        />
      </section>

      <footer className="py-12 text-center border-t border-gray-100 mt-12">
        <p className="text-gray-400 text-sm">© 2026 Match Manager Live. Powered by Innovation.</p>
      </footer>
    </div>
  );
};

const Feature = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col items-center text-center p-6 transition-all hover:bg-white hover:shadow-xl rounded-3xl group">
    <div className="mb-6 p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-50 transition-colors">{icon}</div>
    <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
    <p className="text-gray-500 leading-relaxed">{description}</p>
  </div>
);

export default Landing;

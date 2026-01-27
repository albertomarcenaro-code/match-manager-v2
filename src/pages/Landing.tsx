import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Zap, Users, Share2, MousePointer2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fcfdfc] text-[#1a1c1a] font-sans">
      <Helmet>
        <title>Match Manager Live | Gestione Partite Calcio</title>
      </Helmet>

      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 bg-[#2ea35f] rounded-xl flex items-center justify-center shadow-lg shadow-green-100 group-hover:scale-110 transition-transform">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            Match<span className="text-[#2ea35f]">Manager</span>
          </span>
        </div>
        <Button 
          variant="ghost" 
          className="rounded-full text-gray-600 hover:text-[#2ea35f] hover:bg-green-50 transition-all"
          onClick={() => navigate("/auth")}
        >
          Accedi
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto pt-20 pb-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-[#2ea35f] text-sm font-medium mb-10 animate-fade-in border border-green-100">
          <Zap className="w-4 h-4 fill-current" />
          <span>Gestione in tempo reale per società sportive</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-gray-900 leading-[1.05] animate-fade-up">
          Analizza il match.<br />
          <span className="text-[#2ea35f] italic">Domina il campo.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed font-normal animate-fade-up animation-delay-200">
          L'assistente digitale definitivo per allenatori e dirigenti. 
          Semplice, veloce e pronto per la condivisione istantanea.
        </p>

        <div className="flex flex-col items-center gap-6 animate-fade-up animation-delay-500">
          <Button 
            onClick={() => navigate("/auth")}
            className="h-16 px-12 text-xl rounded-full bg-[#2ea35f] hover:bg-[#258a50] shadow-xl shadow-green-200 transition-all transform hover:scale-105 group text-white border-none"
          >
            Prova ora
            <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1"><MousePointer2 className="w-4 h-4" /> Nessun costo</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="flex items-center gap-1">✨ Accesso Ospite</span>
          </div>
        </div>
      </main>

      {/* Features - NotebookLM Style Cards */}
      <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 py-24">
        <Feature 
          icon={<Users className="w-7 h-7 text-[#2ea35f]" />}
          title="Gestione Rose"
          description="Organizza i tuoi giocatori e le distinte in pochi secondi, con interfaccia drag & drop."
        />
        <Feature 
          icon={<Trophy className="w-7 h-7 text-[#2ea35f]" />}
          title="Eventi Live"
          description="Registra gol, parziali e marcatori durante la partita senza mai staccare gli occhi dal campo."
        />
        <Feature 
          icon={<Share2 className="w-7 h-7 text-[#2ea35f]" />}
          title="Report Istantanei"
          description="Genera il riepilogo in formato testuale pulito per i tuoi gruppi WhatsApp con un click."
        />
      </section>

      <footer className="py-12 text-center border-t border-gray-100 mt-12 bg-gray-50/50">
        <div className="flex justify-center items-center gap-2 mb-4 opacity-50">
           <Trophy className="w-5 h-5 text-gray-600" />
           <span className="font-bold text-gray-900">MatchManager</span>
        </div>
        <p className="text-gray-400 text-sm italic">© 2026 Innovation in Sports. Made for the pitch.</p>
      </footer>
    </div>
  );
};

const Feature = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col p-10 bg-white border border-gray-100 rounded-[32px] transition-all hover:shadow-2xl hover:shadow-green-100/50 hover:-translate-y-1 group">
    <div className="mb-6 w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-[#2ea35f] group-hover:rotate-6 transition-all">
      <div className="group-hover:text-white transition-colors">
        {icon}
      </div>
    </div>
    <h3 className="text-2xl font-bold mb-3 text-gray-900">{title}</h3>
    <p className="text-gray-500 leading-relaxed text-lg font-light">{description}</p>
  </div>
);

export default Landing;

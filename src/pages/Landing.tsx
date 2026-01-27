import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet';
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Trophy, 
  Zap, 
  Users, 
  Share2, 
  CheckCircle2, 
  MousePointer2 
} from "lucide-react";

// Importazione del tuo Header esistente
import { Header } from "@/components/layout/Header";

const Landing = () => {
  const navigate = useNavigate();

  // Colore verde principale del tuo brand
  const brandGreen = "#2ea35f";

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfc] font-sans selection:bg-green-100 selection:text-green-900">
      <Helmet>
        <title>Match Manager Live | Gestione Professionale Partite</title>
      </Helmet>

      {/* 1. HEADER ORIGINALE */}
      <Header />

      <main className="flex-1">
        
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32">
          <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Testo Hero */}
            <div className="text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-[#2ea35f] text-sm font-bold mb-8 animate-fade-in border border-green-100 shadow-sm">
                 <Zap className="w-4 h-4 fill-current" />
                 <span>IL TUO ASSISTENTE DIGITALE DI CAMPO</span>
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-slate-900 leading-[0.95] animate-fade-up">
                Analizza il match. <br />
                <span className="text-[#2ea35f] italic">Domina il campo.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light animate-fade-up animation-delay-200">
                Gestisci le tue squadre con precisione chirurgica. 
                Dalla formazione ai report WhatsApp, tutto in un'unica dashboard veloce e intuitiva.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 animate-fade-up animation-delay-500">
                <Button 
                  onClick={() => navigate("/auth")}
                  className="h-16 px-12 text-xl rounded-full bg-[#2ea35f] hover:bg-[#258a50] shadow-2xl shadow-green-200 transition-all transform hover:scale-105 group text-white border-none"
                >
                  Inizia ora
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="flex flex-col items-start text-left text-sm text-slate-400">
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-[#2ea35f]" /> 
                     <span>Accesso ospite immediato</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-[#2ea35f]" /> 
                     <span>Export WhatsApp pronto all'uso</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Immagine Hero Fotorealistica (Stadio) */}
            <div className="hidden lg:block relative animate-fade-up animation-delay-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2ea35f]/20 via-transparent to-transparent rounded-[3rem] z-10 pointer-events-none border-8 border-white/50"></div>
              <img 
                src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop" 
                alt="Campo da calcio professionale" 
                className="rounded-[3rem] shadow-2xl object-cover h-[650px] w-full"
              />
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="py-24 bg-slate-50 border-y border-slate-100">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-10">
              <FeatureCard 
                icon={<Users className="w-8 h-8" />}
                title="Gestione Rose"
                description="Organizza i titolari e la panchina con un'interfaccia pensata per la velocità a bordo campo."
                color={brandGreen}
              />
              <FeatureCard 
                icon={<Trophy className="w-8 h-8" />}
                title="Live Events"
                description="Registra gol, cartellini e sostituzioni in tempo reale con feedback visivi immediati."
                color={brandGreen}
              />
              <FeatureCard 
                icon={<Share2 className="w-8 h-8" />}
                title="Smart Sharing"
                description="Genera istantaneamente il riepilogo della partita perfetto per i tuoi gruppi WhatsApp."
                color={brandGreen}
              />
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER CON IMMAGINE MANTO ERBOSO --- */}
      <footer className="relative pt-32 pb-16 text-white overflow-hidden min-h-[500px] flex items-center">
        {/* Sfondo: Macro Manto Erboso */}
        <div className="absolute inset-0 w-full h-full z-0">
          <img 
            src="https://images.unsplash.com/photo-1556056504-517173f44412?q=80&w=2076&auto=format&fit=crop"
            alt="Manto erboso campo calcio" 
            className="w-full h-full object-cover"
          />
          {/* Overlay gradiente verde scuro per profondità e contrasto */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a10] via-[#143321]/92 to-[#2ea35f]/40"></div>
        </div>

        {/* Contenuto Footer */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-3 mb-8 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
              <Trophy className="w-6 h-6 text-green-400" />
              <span className="font-bold text-xl tracking-tight">MatchManager Live</span>
            </div>
            
            <h3 className="text-4xl md:text-6xl font-black mb-10 max-w-3xl leading-none">
              Pronto a portare la tua squadra nel <span className="text-green-400">prossimo livello?</span>
            </h3>

            <Button 
              onClick={() => navigate("/auth")}
              className="h-16 px-12 bg-[#2ea35f] hover:bg-[#258a50] text-white font-bold text-xl rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 border-none mb-16"
            >
              Accedi alla Dashboard
            </Button>
            
            <div className="w-full border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center text-sm text-green-100/60">
              <p>© 2026 Match Manager Live. Eccellenza nel coordinamento sportivo.</p>
              <div className="flex gap-8 mt-6 md:mt-0 font-medium tracking-wide">
                <a href="#" className="hover:text-green-400 transition-colors">PRIVACY</a>
                <a href="#" className="hover:text-green-400 transition-colors">TERMINI</a>
                <a href="#" className="hover:text-green-400 transition-colors">CONTATTI</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente Card per le Features
const FeatureCard = ({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) => (
  <div className="group p-10 bg-white border border-slate-100 rounded-[2.5rem] transition-all hover:shadow-2xl hover:shadow-green-100/50 hover:-translate-y-2">
    <div 
      className="mb-8 w-16 h-16 rounded-2xl flex items-center justify-center transition-all bg-slate-50 group-hover:bg-[#2ea35f] group-hover:text-white"
      style={{ color: color }}
    >
      {icon}
    </div>
    <h3 className="text-2xl font-black mb-4 text-slate-900 leading-tight">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-lg font-light">{description}</p>
  </div>
);

export default Landing;

import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet';
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Zap, Users, Share2, CheckCircle2 } from "lucide-react";
// Importiamo il tuo Header esistente per coerenza
import { Header } from "@/components/layout/Header";

const Landing = () => {
  const navigate = useNavigate();

  // Colore verde principale estratto dal tuo logo (analogo a hsl(145 60% 42%))
  const brandGreen = "#2ea35f";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background selection:bg-green-100 selection:text-green-900">
      <Helmet>
        <title>Match Manager Live | Il tuo assistente di campo digitale</title>
      </Helmet>

      {/* 1. IL TUO HEADER ESISTENTE */}
      <Header />

      <main className="flex-1">
        {/* --- HERO SECTION CON IMMAGINE LATERALE --- */}
        <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Colonna Testo (Sinistra) */}
            <div className="text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-8 animate-fade-in border border-green-100">
                 <Zap className="w-4 h-4 fill-current" />
                 <span>La soluzione definitiva per dirigenti e mister</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-foreground leading-[1.1] animate-fade-up">
                Il campo da gioco, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ea35f] to-emerald-600">
                  in tempo reale.
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-fade-up animation-delay-200">
                Dimentica carta e penna. Gestisci rose, eventi live e condividi i risultati 
                su WhatsApp con un tap. Semplice, veloce, professionale.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-up animation-delay-500">
                <Button 
                  onClick={() => navigate("/auth")}
                  className="h-14 px-10 text-lg rounded-full bg-[#2ea35f] hover:bg-[#268c50] shadow-xl shadow-green-200/50 transition-all transform hover:scale-105 group text-white border-0"
                >
                  Inizia Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Nessuna carta richiesta
                </p>
              </div>
            </div>

            {/* Colonna Immagine Fotorealistica (Destra - visibile su desktop) */}
            <div className="hidden lg:block relative animate-fade-up animation-delay-200">
              {/* Overlay sfumato verde per armonizzare l'immagine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2ea35f]/30 via-transparent to-transparent rounded-[2.5rem] z-10 pointer-events-none"></div>
              {/* Immagine Stadio */}
              <img 
                src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop" 
                alt="Stadio da calcio al tramonto" 
                className="rounded-[2.5rem] shadow-2xl shadow-green-900/10 object-cover h-[600px] w-full border border-border/50"
              />
            </div>
          </div>
        </section>


        {/* --- FEATURES SECTION (Stile minimal) --- */}
        <section className="py-24 bg-muted/30 border-t border-border">
          <div className="container mx-auto px-4">
             <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Tutto quello che serve a bordo campo.</h2>
              <p className="text-muted-foreground text-lg">Un set di strumenti essenziali progettati per chi vive la partita minuto per minuto.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Users className="w-6 h-6" />}
                title="Gestione Rose Rapida"
                description="Crea le tue squadre e trascina i giocatori tra titolari e panchina in secondi."
                color={brandGreen}
              />
              <FeatureCard 
                icon={<Trophy className="w-6 h-6" />}
                title="Cronaca Live Match"
                description="Registra gol, assist e cartellini con un'interfaccia ottimizzata per smartphone."
                color={brandGreen}
              />
              <FeatureCard 
                icon={<Share2 className="w-6 h-6" />}
                title="Condivisione Istantanea"
                description="Genera report formattati perfettamente per i tuoi gruppi WhatsApp a fine gara."
                color={brandGreen}
              />
            </div>
          </div>
        </section>
      </main>

      {/* 3. FOOTER CON IMMAGINE FOTOREALISTICA DEL MANTO ERBOSO */}
      <footer className="relative pt-24 pb-12 text-white overflow-hidden">
        {/* Immagine di sfondo (Manto erboso ravvicinato) */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://images.unsplash.com/photo-1589136787385-73733c2cb43a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                alt="Dettaglio manto erboso campo da calcio" 
                className="w-full h-full object-cover filter brightness-[0.6]" // Scurita per leggibilità
            />
            {/* Overlay verde scuro per armonizzare col brand */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f291a] via-[#1a3d2b]/80 to-[#2ea35f]/20 mix-blend-multiply"></div>
        </div>

        {/* Contenuto Footer */}
        <div className="relative z-10 container mx-auto px-4 text-center">
           <div className="inline-flex items-center gap-2 mb-6 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
             <Trophy className="w-5 h-5 text-green-300" />
             <span className="font-bold tracking-tight">Match Manager Live</span>
           </div>
           <h3 className="text-2xl font-bold mb-8">Pronto a scendere in campo?</h3>
           <Button 
              onClick={() => navigate("/auth")}
              className="h-12 px-8 bg-white text-[#2ea35f] hover:bg-green-50 font-semibold rounded-full border-0 mb-12"
           >
             Accedi alla Piattaforma
           </Button>
           
          <div className="border-t border-white/20 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-sm text-green-100/70">
            <p>© 2026 Match Manager Live. Tutti i diritti riservati.</p>
            <div className="flex gap-4 mt-4 md:mt-0 font-medium">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Termini</a>
              <a href="#" className="hover:text-white transition-colors">Contatti</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente di supporto per le Card delle Features
const FeatureCard = ({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) => (
  <div className="group p-8 bg-card rounded-2xl border border-border/60 hover:shadow-xl hover:shadow-green-100/30 transition-all hover:-translate-y-1 relative overflow-hidden">
    {/* Sfondo sfumato all'hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-green-50/0 to-green-50/0 group-hover:from-green-50/50 group-hover:to-transparent transition-all duration-500"></div>
    
    <div className="relative z-10">
        <div 
            className="mb-5 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform bg-green-50"
            style={{ color: color }}
        >
        {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

export default Landing;

import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet';
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Zap, Users, Share2, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";

const Landing = () => {
  const navigate = useNavigate();
  const brandGreen = "#2ea35f";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background selection:bg-green-100">
      <Helmet>
        <title>Match Manager Live | Il tuo assistente di campo</title>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-12 pb-20 lg:pt-20">
          <div className="container mx-auto px-4 text-center lg:text-left grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-8 border border-green-100">
                 <Zap className="w-4 h-4 fill-current" />
                 <span>Gestione sportiva semplificata</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                Il campo, <br />
                <span className="text-[#2ea35f]">in tempo reale.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
                Gestisci rose, eventi live e condividi i risultati su WhatsApp con un tap. 
                La soluzione definitiva per dirigenti e mister.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button 
                  onClick={() => navigate("/auth")}
                  className="h-14 px-10 text-lg rounded-full bg-[#2ea35f] hover:bg-[#268c50] shadow-lg transition-all text-white border-0"
                >
                  Inizia Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Nessun setup complicato
                </span>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <img 
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200" 
                alt="Campo da calcio" 
                className="rounded-3xl shadow-2xl object-cover h-[500px] w-full"
              />
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Users />}
                title="Gestione Rose"
                description="Crea le tue squadre e sposta i giocatori tra titolari e panchina in un istante."
                color={brandGreen}
              />
              <FeatureCard 
                icon={<Trophy />}
                title="Live Match"
                description="Registra gol, assist e cartellini con un'interfaccia pensata per il bordo campo."
                color={brandGreen}
              />
              <FeatureCard 
                icon={<Share2 />}
                title="Condivisione"
                description="Genera report pronti per i gruppi WhatsApp non appena fischia la fine."
                color={brandGreen}
              />
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER SEMPLIFICATO --- */}
      <footer className="bg-gradient-to-b from-background to-green-50/50 pt-20 pb-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
           <h3 className="text-3xl md:text-4xl font-bold mb-8 tracking-tight">
             Pronto per la prossima partita?
           </h3>
           
           <Button 
              onClick={() => navigate("/auth")}
              className="h-12 px-8 bg-[#2ea35f] text-white hover:bg-[#268c50] rounded-full shadow-md mb-16"
           >
             Crea il tuo primo match
           </Button>
           
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>© 2026 Match Manager Live. Tutti i diritti riservati.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-green-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-green-600 transition-colors">Termini</a>
              <a href="#" className="hover:text-green-600 transition-colors">Supporto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente FeatureCard (Versione rifinita)
const FeatureCard = ({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) => (
  <div className="group p-8 bg-card rounded-2xl border border-border/60 hover:border-green-500/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden h-full flex flex-col">
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
    <div className="mb-6 w-12 h-12 rounded-xl flex items-center justify-center bg-green-50" style={{ color: color }}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export default Landing;

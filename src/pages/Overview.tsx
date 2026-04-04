import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardList, Timer, FileText, Share2, Users, Shield } from "lucide-react";
import mockup1 from "@/assets/mockup1.png";
import mockup2 from "@/assets/mockup2.png";
import mockup3 from "@/assets/mockup3.png";

/* ── single sticky-scroll section ── */
function ScrollSection({
  index,
  icon: Icon,
  accentIcon: AccentIcon,
  title,
  body,
  detail,
  mockup,
}: {
  index: number;
  icon: React.ElementType;
  accentIcon?: React.ElementType;
  title: string;
  body: string;
  detail?: string;
  mockup?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0.15, 0.35, 0.65, 0.85], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0.15, 0.35, 0.65, 0.85], [60, 0, 0, -60]);

  const isEven = index % 2 === 0;

  return (
    <section ref={ref} className="relative min-h-[100vh] flex items-center">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className={`grid md:grid-cols-2 gap-12 lg:gap-20 items-center ${isEven ? "" : "direction-rtl"}`}>
          {/* Text */}
          <motion.div
            style={{ opacity, y }}
            className={`space-y-6 ${isEven ? "md:order-1" : "md:order-2"}`}
          >
            <span className="inline-block text-xs font-bold tracking-[0.25em] uppercase text-secondary/80">
              {`0${index + 1}`}
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-md">
              {body}
            </p>
            {detail && (
              <p className="text-sm text-white/50 leading-relaxed max-w-md">
                {detail}
              </p>
            )}
          </motion.div>

          {/* Placeholder visual */}
          <motion.div
            style={{ opacity, y }}
            className={`flex justify-center ${isEven ? "md:order-2" : "md:order-1"}`}
          >
            <div className="relative w-[280px] h-[380px] md:w-[320px] md:h-[440px] rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-6 shadow-2xl">
              <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center">
                <Icon className="w-10 h-10 text-secondary" />
              </div>
              {AccentIcon && (
                <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                  <AccentIcon className="w-7 h-7 text-white/60" />
                </div>
              )}
              <div className="w-3/4 space-y-2 px-4">
                <div className="h-2.5 rounded-full bg-white/10 w-full" />
                <div className="h-2.5 rounded-full bg-white/10 w-4/5" />
                <div className="h-2.5 rounded-full bg-white/10 w-3/5" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── page ── */
export default function Overview() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: ClipboardList,
      accentIcon: Users,
      title: "Prepara la partita",
      body: "Inserisci le squadre, seleziona i titolari e fai partire il cronometro.",
      detail:
        "Crea una o più squadre personalizzate salvando in anticipo la lista dei tuoi giocatori per averli sempre pronti.",
    },
    {
      icon: Timer,
      accentIcon: Shield,
      title: "Tutto sotto controllo",
      body: "Segna gol, cartellini e sostituzioni con un solo tocco direttamente dal campo.",
    },
    {
      icon: FileText,
      accentIcon: Share2,
      title: "Condividi il successo",
      body: "A fine gara, genera automaticamente il report in PDF e invialo istantaneamente in chat.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220,30%,6%)] text-white font-sans selection:bg-secondary/20">
      <Helmet>
        <title>Come funziona | Match Manager Live</title>
        <meta name="description" content="Scopri come Match Manager Live ti aiuta a gestire le partite dal campo al report finale." />
      </Helmet>

      {/* Header */}
      <div className="relative z-50">
        <Header />
      </div>

      {/* Hero intro */}
      <section className="relative flex items-center justify-center text-center pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-bold tracking-[0.3em] uppercase text-secondary/80 mb-6"
          >
            Come funziona
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
          >
            Dal fischio d'inizio<br />
            <span className="text-secondary">al report finale.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed"
          >
            Tre passaggi. Zero carta. Un'esperienza pensata per chi vive la partita dalla panchina.
          </motion.p>
        </div>

        {/* Gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/[0.06] blur-[120px] pointer-events-none" />
      </section>

      {/* Scrolling sections */}
      {sections.map((s, i) => (
        <ScrollSection key={i} index={i} {...s} />
      ))}

      {/* CTA finale */}
      <section className="relative py-32 flex items-center justify-center text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6"
          >
            Pronto a scendere in campo?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg text-white/60 mb-10"
          >
            Registrati gratis e inizia a gestire le partite come un professionista.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Button
              onClick={() => navigate("/auth")}
              className="h-14 px-12 text-lg rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/20 border-0"
            >
              Inizia ora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-secondary/[0.05] blur-[100px] pointer-events-none" />
      </section>

      <Footer />
    </div>
  );
}

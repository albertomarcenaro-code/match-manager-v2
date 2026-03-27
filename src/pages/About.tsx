import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => (
  <div className="min-h-screen flex flex-col font-sans bg-background">
    <Helmet>
      <title>Chi Siamo | Match Manager Live</title>
      <meta name="description" content="Scopri la visione di Match Manager Live e contattaci per supporto o feedback." />
    </Helmet>
    <Header />
    <main className="flex-1 py-12 md:py-16">
      <article className="container mx-auto px-4 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-8">
          Chi Siamo
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed italic mb-2">La Visione di Match Manager</p>

        <p className="text-muted-foreground leading-relaxed mb-4">
          Match Manager nasce da un'esigenza reale: trasformare il caos della panchina in dati chiari,
          professionali e pronti da condividere.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Sappiamo cosa significa gestire una partita: il cronometro che corre, le sostituzioni da ricordare,
          i marcatori da segnare e la pressione del risultato. Spesso tutto questo finisce su foglietti volanti
          o messaggi WhatsApp disordinati.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          La nostra missione è dare a ogni allenatore, dal settore giovanile alle categorie dilettantistiche,
          uno strumento digitale all'altezza della sua passione. Vogliamo che i tuoi report post-partita abbiano
          lo stesso impatto di quelli dei professionisti: eleganti, precisi e immediati.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Oltre a fornire uno strumento professionale per il campo, abbiamo fatto una scelta di campo anche noi:
          la <strong className="text-foreground">trasparenza totale</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Abbiamo deciso di costruire Match Manager senza strumenti di tracciamento invasivi. Crediamo che un
          allenatore debba concentrarsi sulla tattica e sui suoi ragazzi, non preoccuparsi di quali dati sta
          regalando ai giganti del web. Per questo motivo, Match Manager è <strong className="text-foreground">Cookie-Free</strong>:
          niente banner fastidiosi, niente pubblicità, solo la tua passione per il calcio in un'app pulita e veloce.
        </p>

        <blockquote className="border-l-4 border-secondary pl-4 py-2 my-8">
          <p className="text-foreground font-medium italic">
            "Perché ogni partita merita di essere raccontata con precisione."
          </p>
        </blockquote>

        <hr className="my-10 border-border" />

        <h2 className="text-2xl font-bold text-foreground mb-6">Supporto e Contatti</h2>

        <p className="text-muted-foreground leading-relaxed mb-6">
          Hai trovato un bug? Hai un suggerimento per una nuova funzione o vuoi semplicemente darci un feedback
          sulla tua esperienza in campo? La tua opinione è il carburante che fa crescere Match Manager.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 not-prose">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <h3 className="font-bold text-foreground mb-2">Supporto Tecnico</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Se riscontri problemi con il login, la generazione dei PDF o il salvataggio dei dati, siamo qui
              per aiutarti.
            </p>
            <a
              href="mailto:matchmanagerlive@gmail.com"
              className="inline-flex items-center gap-2 text-secondary hover:underline font-medium text-sm"
            >
              <Mail className="w-4 h-4" />
              matchmanagerlive@gmail.com
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <h3 className="font-bold text-foreground mb-2">Suggerimenti e Collaborazioni</h3>
            <p className="text-sm text-muted-foreground mb-4">
              L'app è in continua evoluzione. Se pensi che manchi una statistica fondamentale o hai un'idea per
              migliorare l'interfaccia:
            </p>
            <a
              href="mailto:matchmanagerlive@gmail.com?subject=Feedback%20Match%20Manager"
              className="inline-flex items-center gap-2 text-secondary hover:underline font-medium text-sm"
            >
              <Mail className="w-4 h-4" />
              Scrivici con oggetto "Feedback Match Manager"
            </a>
          </div>
        </div>
      </article>
    </main>
    <Footer />
  </div>
);

export default About;

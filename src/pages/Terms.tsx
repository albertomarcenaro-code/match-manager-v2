import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Terms = () => (
  <div className="min-h-screen flex flex-col font-sans bg-background">
    <Helmet>
      <title>Termini e Condizioni | Match Manager Live</title>
      <meta name="description" content="Termini e Condizioni Generali di Utilizzo di Match Manager Live." />
    </Helmet>
    <Header />
    <main className="flex-1 py-12 md:py-16">
      <article className="container mx-auto px-4 max-w-3xl prose prose-neutral dark:prose-invert">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Torna alla Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-8">
          Termini e Condizioni Generali di Utilizzo
        </h1>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">1. Oggetto del Servizio</h2>
          <p className="text-muted-foreground leading-relaxed">
            Match Manager è una Progressive Web App (PWA) progettata per la gestione statistica delle partite.
            Il servizio fornisce strumenti per la rilevazione dei dati e la generazione di report.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">2. Modello di Servizio e Pagamenti</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>Attualmente il servizio è offerto a titolo gratuito (versione Beta/Lancio).</li>
            <li>
              Match Manager si riserva il diritto di introdurre in futuro funzionalità a pagamento, abbonamenti
              o limitazioni d'uso nella versione gratuita. Qualsiasi variazione di prezzo verrà comunicata
              agli utenti con congruo preavviso.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">3. Valore dei Report e Responsabilità</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              I report generati (PDF, WhatsApp, Dashboard) hanno scopo puramente informativo e statistico.
            </li>
            <li>
              Match Manager non ha alcun valore legale o ufficiale presso federazioni sportive (FIGC, ecc.).
              L'unico dato ufficiale resta il referto arbitrale.
            </li>
            <li>L'utente è l'unico responsabile dell'accuratezza dei dati inseriti.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">4. Gestione dei Minori e Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            L'utente dichiara di avere ottenuto il consenso per il trattamento dei nomi dei giocatori inseriti
            nell'app, con particolare attenzione in caso di atleti minorenni, sollevando Match Manager da ogni
            responsabilità in merito.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">5. Account e Codici Invito</h2>
          <p className="text-muted-foreground leading-relaxed">
            L'accesso tramite codici (es. Primi20) è personale e non cedibile. Ci riserviamo di sospendere
            account che presentino un utilizzo anomalo o scorretto.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">6. Proprietà e Utilizzo dei Dati Caricati</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            L'utente, caricando dati sulla piattaforma (risultati, statistiche, nomi squadre, eventi di gioco),
            concede a Match Manager una licenza gratuita, perpetua e globale per l'utilizzo, la conservazione
            e la visualizzazione di tali dati.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-2">In particolare, Match Manager si riserva il diritto di:</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              Elaborare i dati in forma aggregata e anonima per finalità statistiche e di marketing.
            </li>
            <li>
              Mostrare i contenuti inseriti (es. risultati e classifiche) a terzi o all'interno di sezioni
              pubbliche della piattaforma, per finalità promozionali o di condivisione della "community".
            </li>
            <li>
              L'utente garantisce di essere il titolare dei diritti sui dati inseriti o di aver ricevuto
              l'autorizzazione necessaria alla loro pubblicazione da parte dei diretti interessati.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">7. Rispetto della Privacy e Cookie</h2>
          <p className="text-muted-foreground leading-relaxed">
            L'utente prende atto che il servizio è erogato senza l'ausilio di sistemi di profilazione o
            tracciamento di terze parti. L'assenza di banner di consenso è dovuta all'esclusivo utilizzo di
            tecnologie tecniche indispensabili all'erogazione del servizio (Art. 122 del Codice Privacy).
            Match Manager si impegna a mantenere questo standard di pulizia digitale per tutta la durata del
            servizio gratuito e futuro.
          </p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default Terms;

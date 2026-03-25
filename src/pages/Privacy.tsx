import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet";

const Privacy = () => (
  <div className="min-h-screen flex flex-col font-sans bg-background">
    <Helmet>
      <title>Privacy Policy | Match Manager Live</title>
      <meta name="description" content="Informativa sulla Privacy di Match Manager Live. Scopri come trattiamo i tuoi dati." />
    </Helmet>
    <Header />
    <main className="flex-1 py-12 md:py-16">
      <article className="container mx-auto px-4 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
          Informativa sulla Privacy (Privacy Policy)
        </h1>
        <p className="text-sm text-muted-foreground mb-8">Ultimo aggiornamento: 24/03/2026</p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          La presente Informativa descrive come Match Manager raccoglie, utilizza e protegge i dati personali
          degli utenti in conformità al Regolamento UE 2016/679 (GDPR).
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">1. Titolare del Trattamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Il titolare del trattamento è lo sviluppatore di Match Manager. Per qualsiasi comunicazione relativa
            alla privacy, puoi contattarci all'indirizzo che trovi nella sezione{" "}
            <a href="/about" className="text-secondary hover:underline font-medium">Chi siamo</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">2. Tipologia di Dati Raccolti</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Raccogliamo esclusivamente i dati necessari per il corretto funzionamento dell'app:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong>Dati di Registrazione:</strong> Email e credenziali fornite in fase di creazione account.</li>
            <li>
              <strong>Dati Inseriti dall'Utente:</strong> Nomi dei giocatori, nomi delle squadre, eventi della
              partita, statistiche e codici invito.
            </li>
            <li>
              <strong>Dati Tecnici:</strong> Indirizzo IP, tipo di dispositivo e log di accesso (gestiti
              automaticamente dai fornitori di hosting per scopi di sicurezza).
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">3. Filosofia "Zero Cookie" e Tracciamento</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Match Manager è stata progettata per rispettare la tua privacy e semplificare l'esperienza d'uso:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong>Niente Cookie di Profilazione:</strong> Non utilizziamo Google Analytics, pixel
              pubblicitari o strumenti di tracciamento di terze parti.
            </li>
            <li>
              <strong>Solo Cookie Tecnici:</strong> Utilizziamo esclusivamente cookie tecnici e strettamente
              necessari alla gestione della sessione. Senza di essi, l'app non potrebbe riconoscerti al momento
              del login.
            </li>
            <li>
              <strong>Nessun Banner Invasivo:</strong> Poiché non utilizziamo cookie di profilazione o
              marketing, ai sensi dell'Art. 122 del Codice Privacy e del GDPR, non è necessario il consenso
              preventivo tramite cookie banner.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">4. Finalità del Trattamento</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">I dati vengono trattati esclusivamente per:</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>Fornire il servizio di gestione match e generazione report.</li>
            <li>Gestire l'accesso tramite codici promozionali/invito.</li>
            <li>Migliorare le prestazioni tecniche e la sicurezza dell'app.</li>
            <li>
              Finalità statistiche aggregate e anonime (es. numero totale di partite gestite sulla piattaforma)
              per il miglioramento del prodotto, senza mai analizzare il comportamento del singolo utente.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">5. Base Giuridica del Trattamento</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Il trattamento dei dati si fonda su:</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong>Esecuzione di un contratto:</strong> Per fornirti le funzionalità dell'app.</li>
            <li><strong>Legittimo interesse:</strong> Per la sicurezza del sistema e il miglioramento delle funzioni.</li>
            <li><strong>Consenso:</strong> Per la gestione dei dati di terzi (giocatori) inseriti dall'utente.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">6. Conservazione e Trasferimento dei Dati (Cloud)</h2>
          <p className="text-muted-foreground leading-relaxed">
            I dati sono conservati su server sicuri forniti da provider cloud. Tali fornitori garantiscono elevati
            standard di sicurezza. I dati risiedono prevalentemente in server situati all'interno dell'Unione
            Europea o in paesi che garantiscono un livello di protezione adeguato secondo gli standard GDPR.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">7. Responsabilità sui Dati di Terzi (Importante)</h2>
          <p className="text-muted-foreground leading-relaxed">
            L'utente che inserisce nomi e dati di terzi (es. giocatori, inclusi minori) dichiara di aver
            acquisito il preventivo consenso degli interessati o di chi ne esercita la potestà genitoriale.
            Match Manager agisce come mero elaboratore tecnico e non è responsabile per l'inserimento non
            autorizzato di nomi di terzi.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mt-8 mb-3">8. Diritti dell'Interessato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ai sensi del GDPR, hai il diritto di accedere ai tuoi dati, chiederne la rettifica, la cancellazione
            ("Diritto all'oblio"), opporti al trattamento o chiederne la limitazione e la portabilità. Per
            esercitare tali diritti, invia una mail ai contatti che trovi nella sezione{" "}
            <a href="/about" className="text-secondary hover:underline font-medium">Chi siamo</a>.
          </p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default Privacy;

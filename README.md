# ⚽ Match Manager Pro

**Match Manager Pro** è una PWA (Progressive Web App) avanzata progettata per allenatori e dirigenti sportivi. L'applicazione permette di gestire l'intera vita di una squadra di calcio, dalla preparazione della partita alla generazione di report professionali, con un'interfaccia ottimizzata per l'uso sul campo.

## 🚀 Funzionalità Principali

* **Onboarding Dinamico (`/overview`):** Tour immersivo in stile "Apple Scroll" che guida i nuovi utenti attraverso le funzionalità core dell'app.
* **Gestione Partita Live:** Cronometro integrato con interfaccia "one-touch" per segnare gol, cartellini e sostituzioni senza perdere di vista il campo.
* **Modulo Tornei:** Gestione completa di gironi e fasi eliminatorie con calcolo automatico di classifiche e statistiche.
* **Reportistica PDF:** Generazione istantanea di riepiloghi gara in formato PDF, ottimizzati per la condivisione rapida su WhatsApp o via Email.
* **Area Personale & Privacy:** Gestione sicura del profilo utente con isolamento totale dei dati tra account diversi.

## 🛠️ Tech Stack

Questo progetto è costruito con tecnologie moderne per garantire velocità e affidabilità:

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn-ui
- **Animazioni:** Framer Motion (per lo scroll dinamico e transizioni UI)
- **Icone:** Lucide-React
- **Database & Auth:** Supabase (PostgreSQL)

## ⚠️ Filosofia di Sviluppo: RISCHIO ZERO REGRESSIONI

Il progetto segue una rigorosa politica di sviluppo volta a preservare la stabilità delle funzioni core:
1.  **Isolamento:** Le nuove feature grafiche o di presentazione (come il carosello di onboarding) vengono sviluppate in rotte isolate prima dell'integrazione.
2.  **Integrità Dati:** Ogni modifica alla UI non deve mai interferire con la logica del cronometro o con i filtri di sicurezza `user_id` del database.
3.  **Ottimizzazione Mobile:** Ogni componente è testato per garantire un caricamento rapido (LCP ottimizzato) anche in condizioni di rete instabile (4G/5G sui campi da gioco).

## 💻 Sviluppo Locale

Se desideri lavorare localmente sul codice:

```sh
# 1. Clona il repository
git clone <YOUR_GIT_URL>

# 2. Entra nella cartella
cd <YOUR_PROJECT_NAME>

# 3. Installa le dipendenze
npm install

# 4. Avvia il server di sviluppo
npm run dev

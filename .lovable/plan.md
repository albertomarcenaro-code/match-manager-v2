## Live Match Server – Sincronizzazione Realtime Pubblica

Trasformare l'app in una piattaforma "live" con pagine pubbliche read-only per match e tornei, sincronizzate in tempo reale via Supabase Realtime.

### 1. Database & Realtime
- Migration: abilitare `REPLICA IDENTITY FULL` e aggiungere `matches`, `tournament_matches`, `tournaments` alla pubblicazione `supabase_realtime`.
- Aggiungere policy RLS **SELECT pubblica** (`USING (true)`) per ruolo `anon` su queste 3 tabelle, così le pagine `/live/...` funzionano senza login. Le policy esistenti per `authenticated` (CRUD limitato a `user_id`) restano invariate, garantendo che solo il proprietario possa modificare.

### 2. Nuove rotte pubbliche (in `src/App.tsx`, fuori da `ProtectedRoute`)
- `/live/match/:id` → `LiveMatch.tsx`
- `/live/tournament/:id` → `LiveTournament.tsx`

### 3. Pagina `LiveMatch.tsx` (Spectator Mode)
- Fetch iniziale da `matches` con `id` corrente.
- Sottoscrizione Realtime: `supabase.channel('live-match-'+id).on('postgres_changes', { event: 'UPDATE', table: 'matches', filter: 'id=eq.'+id }, ...)` → aggiorna lo stato in tempo reale.
- UI sola lettura, ottimizzata mobile:
  - Header: logo app + badge **● LIVE** pulsante (animazione `animate-pulse`) se `status === 'in_progress'`.
  - Status testuale: "1° Tempo", "Intervallo", "Finale" derivato da `match_data.currentPeriod` / `isMatchEnded`.
  - Scoreboard grande: `Home Name` / score — score / `Away Name` (layout verticale come MatchSummary).
  - Cronometro: deriva da `match_data.elapsedTime` + tick locale se `isRunning && !isPaused`.
  - Lista marcatori (eventi `goal`/`own_goal`) con minuto, nome, squadra.
  - Timeline eventi compatta (riusa rendering tipo `EventTimeline` ma senza long-press/delete).
  - Footer: "Creato con Match Manager – Gestisci anche tu il tuo Match!" con link a `/`.
- Nessun bottone interattivo, nessuna chiamata di scrittura.

### 4. Pagina `LiveTournament.tsx`
- Fetch `tournaments` + `matches` filtrate per `tournament_id`.
- Realtime su entrambe le tabelle.
- UI: nome torneo, lista partite con punteggi live, badge LIVE su quella in corso, classifica sintetica.
- Footer promozionale identico.

### 5. Tasto "Condividi Live" (Coach side)
- In `MatchApp.tsx` (Live tab, vicino ai TimerControls): bottone con icona `Share2`.
- Al click: `navigator.clipboard.writeText(\`${window.location.origin}/live/match/${id}\`)` + toast "Link Live copiato! Invialo su WhatsApp".
- Fallback Web Share API quando disponibile.
- Analogo bottone in `TournamentDetail.tsx` per il link torneo.

### 6. Componenti riutilizzabili
- `src/components/live/LiveBadge.tsx` – pallino pulsante + "LIVE".
- `src/components/live/LiveFooter.tsx` – banner promozionale.
- `src/components/live/LiveScoreboard.tsx` – scoreboard read-only.

### Note tecniche
- Le pagine live **non** usano `useMatch` (che è stateful e scrive). Leggono solo `match_data` JSONB e renderizzano.
- Status partita: `in_progress` (default) → LIVE; `match_data.isMatchEnded` → "Finale".
- Nessuna modifica al flusso esistente del coach.
- Niente cookie/auth richiesti sulle rotte live (rispetta zero-cookie policy per visitatori).

Procedo con migration → poi codice.
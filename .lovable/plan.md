# Refactor: Numeri Maglia Torneo Persistenti + Stats Deduplicate

## 1. Nuova tabella DB — `tournament_jersey_numbers`

Migration Supabase (richiede approvazione utente):

```sql
CREATE TABLE public.tournament_jersey_numbers (
  id uuid PK default gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id text NOT NULL,            -- id giocatore (uuid client-side)
  player_name text NOT NULL,          -- snapshot nome per fallback
  jersey_number int NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users,
  created_at, updated_at,
  UNIQUE (tournament_id, player_id)
);
```

- GRANT a authenticated + service_role
- RLS: SELECT/INSERT/UPDATE/DELETE solo se `auth.uid() = user_id`
- Indici: `(tournament_id)`, `(tournament_id, player_id)`

## 2. Nuovo hook — `useTournamentJerseys(tournamentId)`

```ts
{
  jerseys: Map<player_id, number>,
  upsertMany(entries: {id, name, number}[]),   // batch upsert + refresh cache
  getNumber(playerId): number | null
}
```

- Carica all'apertura del torneo: `SELECT * WHERE tournament_id = X AND user_id = me`
- `upsertMany` usa `.upsert(..., { onConflict: 'tournament_id,player_id' })`
- Cache locale: aggiornata ottimisticamente per evitare loop

## 3. Salvataggio numeri (RosterSetup → MatchApp)

In `MatchApp.tsx`, quando `tournamentId` è presente nell'URL:

- Al `onUpdatePlayerNumber` / `onUpdateHomePlayerName` (solo squadra casa = "mia squadra"), oltre alla logica corrente, chiamo `upsertJersey(playerId, name, number)` debounced ~400ms per evitare scrittura ad ogni keystroke.
- Al "Salva" / completamento roster: flush completo (upsertMany di tutti i numeri non-null).

## 4. Caricamento numeri all'apertura match

In `MatchApp.tsx` (`useEffect` su `tournamentId` + `state.homeTeam.players.length`):

- Quando il torneo carica i jerseys, faccio merge nella roster home:
  - per ogni player con `number == null` che esiste in `jerseys`, chiamo `updatePlayerNumber(id, jerseys[id])`.
- Eseguito una sola volta per match (guard con ref) per evitare loop.

## 5. Fix duplicati statistiche

`src/lib/tournamentStats.ts` già raggruppa per `playerKey(id, name)`. Problema: quando lo stesso giocatore appare con id diverso tra match (es. ricreato), il fallback name crea duplicati.

Modifica:

- Cambio `playerKey` per usare SOLO `id:${id}` quando id presente, altrimenti `name:normalized`.
- Dopo l'aggregazione, faccio un secondo merge: se due chiavi diverse hanno stesso nome normalizzato AND stesso jersey_number → fondo in una sola riga.
- Filtro finale: escludo giocatori il cui id non compare in `tournament_jersey_numbers` (numero null nel torneo). Passo `jerseys` come secondo parametro a `aggregateTournamentStats`.

Firma nuova:
```ts
aggregateTournamentStats(matches, jerseysMap?: Map<string, number>)
```

Se `jerseysMap` fornito → number proviene da lì, e player senza voce in map è escluso.

## 6. Update consumer

`TournamentDetail.tsx` (e `TournamentArchive` se mostra stats):
- Carica jerseys via `useTournamentJerseys(tournament.id)`
- Passa la map ad `aggregateTournamentStats`

## 7. Anti-loop

- `useTournamentJerseys` espone una funzione stabile via `useCallback`
- Effect di merge in MatchApp guardato da `useRef(false)` che diventa true dopo il primo merge per quel match
- Upsert chiama `setJerseys` solo se il valore è cambiato

## File toccati

- **NEW** `supabase/migrations/<ts>_tournament_jersey_numbers.sql`
- **NEW** `src/hooks/useTournamentJerseys.ts`
- **EDIT** `src/lib/tournamentStats.ts` — firma + filtro by jerseys
- **EDIT** `src/pages/MatchApp.tsx` — load/save jerseys quando tournamentId
- **EDIT** `src/pages/TournamentDetail.tsx` — passa jerseys map alle stats
- **EDIT** `src/pages/TournamentArchive.tsx` — idem (se aggrega stats live)

## Note importanti

- I `player.id` sono uuid client-side memorizzati nel `match_data` JSON. Sono stabili all'interno di un match ma possono cambiare se il giocatore viene ricreato manualmente — per questo manteniamo anche il fallback name+number nel merge finale.
- `player_id` è `text` (non uuid foreign key) perché i player non hanno tabella propria centralizzata nel torneo.
- Nessun impatto sul flusso single-match (no tournamentId → comportamento attuale).

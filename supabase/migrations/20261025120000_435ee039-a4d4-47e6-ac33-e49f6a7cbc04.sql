-- Revoke the accidental bulk publication performed by
-- 20260602191809_c094d706-e4a6-4613-8a7b-adfb59453d7d.sql, which ran
--     UPDATE public.matches/tournaments SET is_public = true WHERE is_public = false
-- and therefore published every row that existed at that moment.
--
-- Rule: a row created BEFORE 2026-06-03 cannot prove it was shared on purpose
-- (it was flipped by the backfill), so it goes back to private. A row created
-- AFTER the backfill defaults to false and can only be true through the
-- "Condividi Live" button — or through its cascade on the tournament's matches —
-- so those are intentional shares and are kept.
--
-- Trade-off: a match/tournament created before the cutoff and explicitly shared
-- after 2026-06-02 is revoked too, because it is indistinguishable from the
-- bulk-published rows. Pressing "Condividi Live" again restores it.
--
-- Idempotent: rows are matched only while they are still public.

UPDATE public.matches
   SET is_public = false
 WHERE is_public = true
   AND created_at < timestamptz '2026-06-03 00:00:00+00';

UPDATE public.tournaments
   SET is_public = false
 WHERE is_public = true
   AND created_at < timestamptz '2026-06-03 00:00:00+00';

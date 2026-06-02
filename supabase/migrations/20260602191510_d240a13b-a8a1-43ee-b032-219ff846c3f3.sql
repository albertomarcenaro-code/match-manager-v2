-- Deduplica squadre salvate con stesso nome per lo stesso utente: tieni la più recente
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, lower(trim(name))
           ORDER BY updated_at DESC, created_at DESC
         ) AS rn
  FROM public.saved_teams
)
DELETE FROM public.saved_teams st
USING ranked r
WHERE st.id = r.id AND r.rn > 1;

-- Vincolo di unicità: un utente non può avere due squadre con lo stesso nome
CREATE UNIQUE INDEX IF NOT EXISTS saved_teams_user_name_unique
  ON public.saved_teams (user_id, lower(trim(name)));
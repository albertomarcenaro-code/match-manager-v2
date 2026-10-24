-- 1) Deduplicate existing players: keep the most recently created row per (user_id, name)
WITH ranked AS (
  SELECT id, user_id, name, number, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id, lower(trim(name)) ORDER BY created_at DESC, id DESC) AS rn
  FROM public.players
),
keepers AS (
  SELECT user_id, lower(trim(name)) AS norm_name,
         (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id,
         MAX(number) AS best_number
  FROM public.players
  GROUP BY user_id, lower(trim(name))
)
UPDATE public.players p
SET number = COALESCE(p.number, k.best_number)
FROM keepers k
WHERE p.id = k.keep_id;

DELETE FROM public.players p
USING (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, lower(trim(name)) ORDER BY created_at DESC, id DESC) AS rn
    FROM public.players
  ) s WHERE rn > 1
) dups
WHERE p.id = dups.id;

-- 2) Add unique constraint on (user_id, lower(trim(name)))
CREATE UNIQUE INDEX IF NOT EXISTS players_user_name_unique_idx
  ON public.players (user_id, lower(trim(name)));

import { z } from 'zod';

// Player validation schema
export const playerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Nome giocatore richiesto" })
    .max(100, { message: "Nome deve essere massimo 100 caratteri" }),
  number: z.number()
    .int()
    .min(0, { message: "Numero maglia deve essere almeno 0" })
    .max(99, { message: "Numero maglia massimo 99" })
    .nullable()
});

// Tournament validation schema
export const tournamentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Nome torneo richiesto" })
    .max(200, { message: "Nome torneo deve essere massimo 200 caratteri" }),
  team_name: z.string()
    .trim()
    .min(1, { message: "Nome squadra richiesto" })
    .max(100, { message: "Nome squadra deve essere massimo 100 caratteri" })
});

// Tournament match validation schema
export const tournamentMatchSchema = z.object({
  home_team_name: z.string()
    .trim()
    .min(1, { message: "Nome squadra casa richiesto" })
    .max(100, { message: "Nome squadra deve essere massimo 100 caratteri" }),
  away_team_name: z.string()
    .trim()
    .min(1, { message: "Nome squadra ospite richiesto" })
    .max(100, { message: "Nome squadra deve essere massimo 100 caratteri" }),
  home_score: z.number()
    .int()
    .min(0, { message: "Punteggio non può essere negativo" })
    .max(999, { message: "Punteggio massimo 999" }),
  away_score: z.number()
    .int()
    .min(0, { message: "Punteggio non può essere negativo" })
    .max(999, { message: "Punteggio massimo 999" })
});

// Tournament player schema for JSONB validation
export const tournamentPlayerSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  number: z.number().int().min(0).max(99).nullable(),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  yellowCards: z.number().int().min(0).default(0),
  redCards: z.number().int().min(0).default(0),
  minutesPlayed: z.number().min(0).default(0),
  matchesPlayed: z.number().int().min(0).default(0)
});

export const tournamentPlayersArraySchema = z.array(tournamentPlayerSchema);

// Helper function to safely validate and return data or throw
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map(e => e.message).join(', ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  return result.data;
}

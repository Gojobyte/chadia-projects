import { z } from "zod/v4";

export const createProjetSchema = z.object({
  titre: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  reference: z.string().optional(),
  description: z.string().min(10, "La description est trop courte"),
  objectifs: z.string().optional(),
  bailleurId: z.string().min(1, "Le bailleur est requis"),
  pays: z.string().optional(),
  budget: z.number().optional(),
  devise: z.string().default("FCFA"),
  datePublication: z.string().optional(),
  dateLimite: z.string().min(1, "La date limite est requise"),
  appelOffreUrl: z.string().optional(),
  // Categories de documents a creer automatiquement
  documents: z.array(z.enum([
    "PROPOSITION_TECHNIQUE", "BUDGET_PREVISIONNEL", "BUDGET_DETAIL",
    "CADRE_LOGIQUE", "NOTE_CONCEPTUELLE", "PLAN_TRAVAIL",
    "GANTT", "CV", "DOCUMENT_LEGAL", "AUTRE",
  ])).default([
    "PROPOSITION_TECHNIQUE", "BUDGET_PREVISIONNEL", "CADRE_LOGIQUE",
    "NOTE_CONCEPTUELLE", "PLAN_TRAVAIL",
  ]),
});

export const updateProjetSchema = createProjetSchema.partial().omit({ documents: true });

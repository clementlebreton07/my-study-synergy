import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistant indisponible : clé IA manquante.");

    const [subjects, chapters, exams, tasks] = await Promise.all([
      context.supabase.from("subjects").select("name"),
      context.supabase.from("chapters").select("title, mastery"),
      context.supabase.from("exams").select("title, exam_date, preparation"),
      context.supabase.from("tasks").select("title, due_date, status"),
    ]);

    const profile = [
      `Matières: ${(subjects.data ?? []).map((s) => s.name).join(", ") || "aucune"}`,
      `Chapitres: ${(chapters.data ?? [])
        .map((c) => `${c.title} (${c.mastery})`)
        .slice(0, 40)
        .join(", ") || "aucun"}`,
      `Examens: ${(exams.data ?? [])
        .map((e) => `${e.title} le ${e.exam_date} (préparation ${e.preparation}%)`)
        .join(", ") || "aucun"}`,
      `Tâches en cours: ${(tasks.data ?? [])
        .filter((t) => t.status !== "done")
        .map((t) => `${t.title}${t.due_date ? ` pour le ${t.due_date}` : ""}`)
        .slice(0, 30)
        .join(", ") || "aucune"}`,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un coach d'études francophone, concret et bienveillant. Tu aides à planifier les révisions, expliquer des notions, générer des quiz et prioriser le travail. Réponds en français, de façon structurée et brève (listes courtes). Voici le contexte de l'étudiant :\n" +
              profile,
          },
          ...data.messages,
        ],
      }),
    });

    if (response.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
    if (response.status === 402) throw new Error("Crédits IA épuisés.");
    if (!response.ok) throw new Error("L'assistant n'a pas pu répondre.");

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { reply: json.choices?.[0]?.message?.content ?? "Je n'ai pas de réponse pour le moment." };
  });
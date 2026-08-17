import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, documentBlocks, parseJson } from "@/lib/ai.server";

const idSchema = z.object({ documentId: z.string().uuid() });

/** Sylly-style: reads a document and produces structured course notes. */
export const analyzeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const doc = await documentBlocks(context.supabase, data.documentId);

    const raw = await callAI(
      "Tu es un assistant d'études francophone. Tu analyses un document de cours et tu réponds UNIQUEMENT par un objet JSON valide, sans texte autour.",
      [
        {
          type: "text",
          text:
            `Analyse le document « ${doc.name} » et renvoie ce JSON :\n` +
            `{"summary": "résumé de 3 phrases", "notes": "notes de cours structurées en markdown (titres, puces, formules)", "key_points": ["point clé", ...], "topics": ["notion", ...], "difficulty": "easy|medium|hard"}`,
        },
        ...doc.blocks,
      ],
    );

    const result = parseJson<{
      summary: string;
      notes: string;
      key_points?: string[];
      topics?: string[];
      difficulty?: string;
    }>(raw);

    const { error } = await context.supabase
      .from("documents")
      .update({
        ai_status: "analyzed",
        ai_summary: result.summary ?? null,
        ai_notes: result.notes ?? null,
        ai_data: {
          key_points: result.key_points ?? [],
          topics: result.topics ?? [],
          difficulty: result.difficulty ?? "medium",
        },
      })
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);

    return result;
  });

const flashcardSchema = z.object({
  documentId: z.string().uuid(),
  count: z.number().int().min(3).max(30).default(12),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => flashcardSchema.parse(data))
  .handler(async ({ data, context }) => {
    const doc = await documentBlocks(context.supabase, data.documentId);

    const raw = await callAI(
      "Tu génères des fiches de révision à partir du contenu réel du document. Réponds UNIQUEMENT par un JSON valide.",
      [
        {
          type: "text",
          text: `Crée ${data.count} fiches question/réponse en français à partir de « ${doc.name} ». Format : {"cards":[{"question":"...","answer":"..."}]}. Les réponses font 1 à 3 phrases.`,
        },
        ...doc.blocks,
      ],
    );

    const { cards } = parseJson<{ cards: { question: string; answer: string }[] }>(raw);
    const rows = (cards ?? [])
      .filter((c) => c?.question && c?.answer)
      .slice(0, data.count)
      .map((c) => ({
        user_id: context.userId,
        question: c.question,
        answer: c.answer,
        document_id: data.documentId,
        subject_id: doc.subjectId,
        chapter_id: doc.chapterId,
      }));
    if (rows.length === 0) throw new Error("Aucune fiche générée, réessayez.");

    const { error } = await context.supabase.from("flashcards").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

const quizSchema = z.object({
  documentId: z.string().uuid(),
  count: z.number().int().min(3).max(30).default(10),
  mode: z.enum(["practice", "exam"]).default("practice"),
  durationMinutes: z.number().int().min(5).max(240).nullable().default(null),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => quizSchema.parse(data))
  .handler(async ({ data, context }) => {
    const doc = await documentBlocks(context.supabase, data.documentId);

    const raw = await callAI(
      "Tu es un professeur qui rédige des questionnaires à partir du contenu réel d'un cours. Réponds UNIQUEMENT par un JSON valide.",
      [
        {
          type: "text",
          text:
            `Rédige ${data.count} questions à choix multiples en français à partir de « ${doc.name} ».\n` +
            `Format : {"title":"titre court","questions":[{"question":"...","choices":["a","b","c","d"],"correct":0,"explanation":"pourquoi cette réponse"}]}\n` +
            `Exactement 4 propositions par question, "correct" est l'index (0-3) de la bonne réponse.`,
        },
        ...doc.blocks,
      ],
    );

    const result = parseJson<{
      title?: string;
      questions: { question: string; choices: string[]; correct: number; explanation?: string }[];
    }>(raw);

    const questions = (result.questions ?? [])
      .filter((q) => q?.question && Array.isArray(q.choices) && q.choices.length >= 2)
      .slice(0, data.count)
      .map((q) => ({
        question: q.question,
        choices: q.choices,
        correct: Math.min(Math.max(Number(q.correct) || 0, 0), q.choices.length - 1),
        explanation: q.explanation ?? "",
      }));
    if (questions.length === 0) throw new Error("Aucune question générée, réessayez.");

    const { data: inserted, error } = await context.supabase
      .from("quizzes")
      .insert({
        user_id: context.userId,
        title: result.title || doc.name,
        mode: data.mode,
        duration_minutes: data.durationMinutes,
        document_id: data.documentId,
        subject_id: doc.subjectId,
        chapter_id: doc.chapterId,
        questions,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { quizId: inserted.id as string, count: questions.length };
  });

const syllabusSchema = z.object({
  documentId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().default(null),
});

/** Sylly-style syllabus scan: extracts graded assessments, exams and chapters. */
export const importSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => syllabusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const doc = await documentBlocks(context.supabase, data.documentId);
    const subjectId = data.subjectId ?? doc.subjectId;
    const todayIso = new Date().toISOString().slice(0, 10);

    const raw = await callAI(
      "Tu extrais la structure d'un syllabus / plan de cours. Réponds UNIQUEMENT par un JSON valide.",
      [
        {
          type: "text",
          text:
            `Nous sommes le ${todayIso}. Extrais du document « ${doc.name} » :\n` +
            `{"course_name":"nom du cours","assessments":[{"title":"...","weight":30,"due_date":"YYYY-MM-DD ou null","is_exam":true}],"chapters":["chapitre 1", ...]}\n` +
            `"weight" est le pourcentage de la note finale (nombre). Ne mets une date que si elle est explicite.`,
        },
        ...doc.blocks,
      ],
    );

    const result = parseJson<{
      course_name?: string;
      assessments?: { title: string; weight?: number; due_date?: string | null; is_exam?: boolean }[];
      chapters?: string[];
    }>(raw);

    const assessments = (result.assessments ?? []).filter((a) => a?.title);
    const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

    if (assessments.length > 0) {
      const { error } = await context.supabase.from("assessments").insert(
        assessments.map((a) => ({
          user_id: context.userId,
          subject_id: subjectId,
          title: a.title,
          weight: Number(a.weight) || 0,
          due_date: isDate(a.due_date) ? a.due_date : null,
        })),
      );
      if (error) throw new Error(error.message);
    }

    const exams = assessments.filter((a) => a.is_exam && isDate(a.due_date));
    if (exams.length > 0) {
      await context.supabase.from("exams").insert(
        exams.map((a) => ({
          user_id: context.userId,
          subject_id: subjectId,
          title: a.title,
          exam_date: a.due_date as string,
          importance: (Number(a.weight) || 0) >= 30 ? "high" : "normal",
        })),
      );
    }

    const chapterTitles = (result.chapters ?? []).filter((c) => typeof c === "string" && c.trim());
    if (subjectId && chapterTitles.length > 0) {
      const { data: existing } = await context.supabase
        .from("chapters")
        .select("title")
        .eq("subject_id", subjectId);
      const known = new Set((existing ?? []).map((c) => (c.title as string).toLowerCase()));
      const fresh = chapterTitles.filter((t) => !known.has(t.toLowerCase()));
      if (fresh.length > 0) {
        await context.supabase.from("chapters").insert(
          fresh.map((title, index) => ({
            user_id: context.userId,
            subject_id: subjectId,
            title,
            position: known.size + index,
          })),
        );
      }
    }

    await context.supabase
      .from("documents")
      .update({ ai_status: "analyzed", kind: "other" })
      .eq("id", data.documentId);

    return {
      courseName: result.course_name ?? doc.name,
      assessments: assessments.length,
      exams: exams.length,
      chapters: chapterTitles.length,
    };
  });

const planSchema = z.object({ days: z.number().int().min(3).max(14).default(7) });

/** Sylly-style weekly planner: turns deadlines + mastery into study tasks. */
export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data, context }) => {
    const todayIso = new Date().toISOString().slice(0, 10);

    const [subjects, chapters, exams, assessments, profile] = await Promise.all([
      context.supabase.from("subjects").select("id, name"),
      context.supabase.from("chapters").select("id, subject_id, title, mastery"),
      context.supabase.from("exams").select("title, exam_date, subject_id").gte("exam_date", todayIso),
      context.supabase.from("assessments").select("title, weight, due_date, subject_id"),
      context.supabase.from("profiles").select("daily_goal_minutes").maybeSingle(),
    ]);

    const subjectList = subjects.data ?? [];
    if (subjectList.length === 0) throw new Error("Ajoutez d'abord une matière.");

    const context_text = [
      `Date du jour : ${todayIso}`,
      `Objectif quotidien : ${profile.data?.daily_goal_minutes ?? 120} minutes`,
      `Matières : ${subjectList.map((s) => `${s.name} [${s.id}]`).join(" | ")}`,
      `Chapitres : ${(chapters.data ?? [])
        .map((c) => `${c.title} [${c.id}] (maîtrise ${c.mastery})`)
        .slice(0, 60)
        .join(" | ") || "aucun"}`,
      `Examens à venir : ${(exams.data ?? [])
        .map((e) => `${e.title} le ${e.exam_date}`)
        .join(" | ") || "aucun"}`,
      `Évaluations notées : ${(assessments.data ?? [])
        .map((a) => `${a.title} (${a.weight}%${a.due_date ? `, ${a.due_date}` : ""})`)
        .join(" | ") || "aucune"}`,
    ].join("\n");

    const raw = await callAI(
      "Tu es un planificateur d'études. Tu répartis le travail sur les prochains jours en tenant compte des échéances, des coefficients et du niveau de maîtrise. Réponds UNIQUEMENT par un JSON valide.",
      `${context_text}\n\nPlanifie les ${data.days} prochains jours. Format : {"sessions":[{"title":"Réviser ...","planned_date":"YYYY-MM-DD","estimated_minutes":45,"priority":"low|normal|high|urgent","subject_id":"uuid ou null","chapter_id":"uuid ou null","reason":"pourquoi maintenant"}]}. Maximum 3 sessions par jour, ne dépasse pas l'objectif quotidien.`,
    );

    const { sessions } = parseJson<{
      sessions: {
        title: string;
        planned_date: string;
        estimated_minutes?: number;
        priority?: string;
        subject_id?: string | null;
        chapter_id?: string | null;
        reason?: string;
      }[];
    }>(raw);

    const subjectIds = new Set(subjectList.map((s) => s.id as string));
    const chapterIds = new Set((chapters.data ?? []).map((c) => c.id as string));
    const priorities = new Set(["low", "normal", "high", "urgent"]);

    const rows = (sessions ?? [])
      .filter((s) => s?.title && /^\d{4}-\d{2}-\d{2}$/.test(s.planned_date ?? ""))
      .slice(0, data.days * 3)
      .map((s) => ({
        user_id: context.userId,
        title: s.title,
        planned_date: s.planned_date,
        due_date: s.planned_date,
        estimated_minutes: Math.min(240, Math.max(10, Number(s.estimated_minutes) || 45)),
        priority: priorities.has(s.priority ?? "") ? s.priority : "normal",
        subject_id: s.subject_id && subjectIds.has(s.subject_id) ? s.subject_id : null,
        chapter_id: s.chapter_id && chapterIds.has(s.chapter_id) ? s.chapter_id : null,
        notes: s.reason ?? null,
      }));
    if (rows.length === 0) throw new Error("Aucune séance planifiée, réessayez.");

    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });
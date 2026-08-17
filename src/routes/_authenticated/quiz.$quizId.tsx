import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Timer, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useRows, type Row } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "Session de quiz — StudyOS" },
      { name: "description", content: "Répondez, obtenez la correction détaillée et rejouez vos erreurs." },
      { property: "og:title", content: "Session de quiz — StudyOS" },
      { property: "og:description", content: "Correction automatique et explications question par question." },
    ],
  }),
  component: QuizPlayPage,
});

type Question = { question: string; choices: string[]; correct: number; explanation?: string };

function QuizPlayPage() {
  const { quizId } = useParams({ from: "/_authenticated/quiz/$quizId" });
  const { data: quizzes = [], isLoading } = useRows<Row>("quizzes");
  const quiz = quizzes.find((q) => q["id"] === quizId);
  const queryClient = useQueryClient();

  const allQuestions = useMemo<Question[]>(
    () => ((quiz?.["questions"] as Question[]) ?? []).filter((q) => q?.question),
    [quiz],
  );

  const [subset, setSubset] = useState<number[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const order = subset ?? allQuestions.map((_, i) => i);
  const questions = order.map((i) => allQuestions[i]!).filter(Boolean);
  const current = questions[index];
  const duration = quiz?.["duration_minutes"] as number | null | undefined;

  const save = useMutation({
    mutationFn: async (payload: { score: number; total: number }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Session expirée");
      const { error } = await supabase.from("quiz_attempts").insert({
        user_id: auth.user.id,
        quiz_id: quizId,
        answers: order.map((qIndex, i) => ({ index: qIndex, answer: answers[i] ?? null })),
        score: payload.score,
        total: payload.total,
        duration_seconds: Math.round((Date.now() - startedAt) / 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_attempts"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  function finish() {
    const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0);
    setFinished(true);
    save.mutate({ score, total: questions.length });
  }

  useEffect(() => {
    if (!duration || finished) return;
    setSecondsLeft(duration * 60 - Math.round((Date.now() - startedAt) / 1000));
    const timer = setInterval(() => {
      const left = duration * 60 - Math.round((Date.now() - startedAt) / 1000);
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        finish();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, finished]);

  if (isLoading) {
    return (
      <AppShell title="Quiz">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <AppShell title="Quiz introuvable" description="Ce quiz n'existe plus.">
        <Button asChild>
          <Link to="/quiz">Retour aux quiz</Link>
        </Button>
      </AppShell>
    );
  }

  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0);
  const wrong = questions.map((q, i) => ({ q, i })).filter(({ q, i }) => answers[i] !== q.correct);

  function restart(indices: number[]) {
    setSubset(indices);
    setAnswers({});
    setIndex(0);
    setFinished(false);
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <AppShell
        title="Résultats"
        description={`${quiz["title"] as string} — ${score}/${questions.length} bonnes réponses`}
        actions={
          <div className="flex flex-wrap gap-2">
            {wrong.length > 0 && (
              <Button onClick={() => restart(wrong.map(({ i }) => order[i]!))}>
                <RotateCcw className="mr-2 size-4" />
                Rejouer mes {wrong.length} erreurs
              </Button>
            )}
            <Button variant="outline" onClick={() => restart(allQuestions.map((_, i) => i))}>
              Tout refaire
            </Button>
          </div>
        }
      >
        <div className="surface mb-5 p-5">
          <p className="font-display text-4xl font-semibold">{percent}%</p>
          <Progress value={percent} className="mt-4" />
        </div>

        <ul className="grid gap-3">
          {questions.map((q, i) => {
            const given = answers[i];
            const ok = given === q.correct;
            return (
              <li key={i} className="surface p-4">
                <div className="flex items-start gap-3">
                  {ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{q.question}</p>
                    {!ok && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Votre réponse : {given === undefined ? "aucune" : q.choices[given]}
                      </p>
                    )}
                    <p className="mt-1 text-xs">
                      Bonne réponse : <span className="font-medium">{q.choices[q.correct]}</span>
                    </p>
                    {q.explanation && (
                      <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={quiz["title"] as string}
      description={`Question ${index + 1} sur ${questions.length}`}
      actions={
        secondsLeft !== null ? (
          <Badge variant={secondsLeft < 60 ? "destructive" : "secondary"}>
            <Timer className="mr-1 size-3" />
            {Math.max(0, Math.floor(secondsLeft / 60))}:
            {String(Math.max(0, secondsLeft % 60)).padStart(2, "0")}
          </Badge>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-2xl">
        <Progress value={((index + 1) / questions.length) * 100} className="mb-5" />
        <div className="surface p-6">
          <p className="text-lg font-medium">{current!.question}</p>
          <div className="mt-5 grid gap-2">
            {current!.choices.map((choice, choiceIndex) => (
              <button
                key={choiceIndex}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [index]: choiceIndex }))}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  answers[index] === choiceIndex
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-secondary",
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="mr-2 size-4" /> Précédent
          </Button>
          {index === questions.length - 1 ? (
            <Button onClick={finish}>Terminer</Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)}>
              Suivant <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play, Sparkles, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateQuiz } from "@/lib/ai.functions";
import { useDeleteRow, useRows, type Row } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/quiz/")({
  head: () => ({
    meta: [
      { title: "Quiz & examens blancs — StudyOS" },
      {
        name: "description",
        content: "Générez des quiz et des examens blancs chronométrés depuis vos propres cours.",
      },
      { property: "og:title", content: "Quiz & examens blancs — StudyOS" },
      { property: "og:description", content: "Correction automatique, explications et rejeu des erreurs." },
    ],
  }),
  component: QuizListPage,
});

function CreateQuizDialog() {
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [mode, setMode] = useState("practice");
  const [duration, setDuration] = useState(20);
  const { data: documents = [] } = useRows<Row>("documents", {
    order: { column: "created_at", ascending: false },
  });
  const create = useServerFn(generateQuiz);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          documentId: documentId as string,
          count,
          mode: mode as "practice" | "exam",
          durationMinutes: mode === "exam" ? duration : null,
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`${result.count} questions générées`);
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2 size-4" />
          Générer un quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Générer depuis un cours</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Document source">
            <OptionSelect
              value={documentId}
              options={documents.map((d) => ({
                value: d["id"] as string,
                label: d["name"] as string,
              }))}
              placeholder="Choisir un document"
              onChange={setDocumentId}
            />
          </Field>
          <Field label="Type">
            <OptionSelect
              value={mode}
              options={[
                { value: "practice", label: "Entraînement" },
                { value: "exam", label: "Examen blanc chronométré" },
              ]}
              onChange={(v) => setMode(v ?? "practice")}
            />
          </Field>
          <Field label="Nombre de questions">
            <Input
              type="number"
              min={3}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
          {mode === "exam" && (
            <Field label="Durée (minutes)">
              <Input
                type="number"
                min={5}
                max={240}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!documentId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuizListPage() {
  const { data: quizzes = [], isLoading } = useRows<Row>("quizzes", {
    order: { column: "created_at", ascending: false },
  });
  const { data: attempts = [] } = useRows<Row>("quiz_attempts");
  const remove = useDeleteRow("quizzes", "Quiz supprimé");

  return (
    <AppShell
      title="Quiz & examens blancs"
      description="Testez-vous sur le contenu réel de vos cours, avec correction et explications."
      actions={<CreateQuizDialog />}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : quizzes.length === 0 ? (
        <EmptyState
          title="Aucun quiz"
          text="Importez un cours puis générez un quiz d'entraînement ou un examen blanc chronométré à partir de son contenu."
          action={<CreateQuizDialog />}
        />
      ) : (
        <div className="grid gap-3">
          {quizzes.map((quiz) => {
            const history = attempts.filter((a) => a["quiz_id"] === quiz["id"]);
            const best = history.reduce(
              (max, a) => Math.max(max, Number(a["total"]) ? Number(a["score"]) / Number(a["total"]) : 0),
              0,
            );
            const questions = (quiz["questions"] as unknown[]) ?? [];
            return (
              <div key={quiz["id"] as string} className="surface flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{quiz["title"] as string}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={quiz["mode"] === "exam" ? "destructive" : "secondary"}>
                      {quiz["mode"] === "exam" ? "Examen blanc" : "Entraînement"}
                    </Badge>
                    <span>{questions.length} questions</span>
                    {quiz["duration_minutes"] && (
                      <span className="flex items-center gap-1">
                        <Timer className="size-3" />
                        {quiz["duration_minutes"] as number} min
                      </span>
                    )}
                    {history.length > 0 && <span>Meilleur score : {Math.round(best * 100)}%</span>}
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link to="/quiz/$quizId" params={{ quizId: quiz["id"] as string }}>
                    <Play className="mr-2 size-4" />
                    Commencer
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => remove.mutate(quiz["id"] as string)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
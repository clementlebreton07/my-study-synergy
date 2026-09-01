import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, FileText, Layers, Loader2, Plus, Sparkles, Target, Trash2, UploadCloud } from "lucide-react";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { EmptyState, Field, OptionSelect } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTIES, DOC_KINDS, EXERCISE_STATUS, formatShortDate, today } from "@/lib/study";
import { analyzeDocument, generateFlashcards, generateQuiz } from "@/lib/ai.functions";

function AiActions({ doc }: { doc: Row }) {
  const queryClient = useQueryClient();
  const analyze = useServerFn(analyzeDocument);
  const cards = useServerFn(generateFlashcards);
  const quiz = useServerFn(generateQuiz);
  const documentId = doc["id"] as string;

  const analyzeMutation = useMutation({
    mutationFn: () => analyze({ data: { documentId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Notes de cours générées");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cardsMutation = useMutation({
    mutationFn: () => cards({ data: { documentId, count: 12 } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`${result.created} fiches ajoutées aux révisions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const quizMutation = useMutation({
    mutationFn: () => quiz({ data: { documentId, count: 10, mode: "practice", durationMinutes: null } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`Quiz de ${result.count} questions créé`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const busy = analyzeMutation.isPending || cardsMutation.isPending || quizMutation.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => analyzeMutation.mutate()}>
        {analyzeMutation.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 size-4" />
        )}
        Analyser
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => cardsMutation.mutate()}>
        {cardsMutation.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Layers className="mr-2 size-4" />
        )}
        Fiches IA
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => quizMutation.mutate()}>
        {quizMutation.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Target className="mr-2 size-4" />
        )}
        Quiz
      </Button>
    </div>
  );
}

function NotesDialog({ doc, onClose }: { doc: Row | null; onClose: () => void }) {
  const keyPoints = ((doc?.["ai_data"] as Row | null)?.["key_points"] as string[] | undefined) ?? [];
  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc?.["name"] as string}</DialogTitle>
        </DialogHeader>
        {doc?.["ai_summary"] && (
          <p className="rounded-xl bg-secondary p-4 text-sm">{doc["ai_summary"] as string}</p>
        )}
        {keyPoints.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {(doc?.["ai_notes"] as string | null) ?? "Aucune note générée."}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentList({ subjectId, chapters }: { subjectId: string; chapters: Row[] }) {
  const { data: documents = [], isLoading } = useRows<Row>("documents", {
    eq: { subject_id: subjectId },
    order: { column: "created_at", ascending: false },
  });
  const [notesDoc, setNotesDoc] = useState<Row | null>(null);
  const [viewDoc, setViewDoc] = useState<Row | null>(null);
  const queryClient = useQueryClient();

  async function removeDocument(doc: Row) {
    await supabase.storage.from("documents").remove([doc["storage_path"] as string]);
    const { error } = await supabase.from("documents").delete().eq("id", doc["id"] as string);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Document supprimé");
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Cours &amp; documents</h2>
        <DocumentUpload
          defaultSubjectId={subjectId}
          trigger={
            <Button variant="outline" size="sm">
              <UploadCloud className="mr-2 size-4" />
              Importer un cours
            </Button>
          }
        />
      </div>

      <NotesDialog doc={notesDoc} onClose={() => setNotesDoc(null)} />
      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : documents.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun document pour cette matière. Importez vos PDF, images ou notes de cours.
        </p>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => {
            const chapter = chapters.find((c) => c["id"] === doc["chapter_id"]);
            return (
              <div key={doc["id"] as string} className="surface flex flex-wrap items-center gap-4 p-4">
                <button
                  type="button"
                  onClick={() => setViewDoc(doc)}
                  className="flex min-w-0 flex-1 basis-64 items-center gap-4 text-left"
                >
                  <FileText className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc["name"] as string}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {chapter && <Badge variant="outline">{chapter["title"] as string}</Badge>}
                      <Badge variant="secondary">
                        {DOC_KINDS.find((k) => k.value === doc["kind"])?.label}
                      </Badge>
                      <span>{Math.max(1, Math.round(Number(doc["size_bytes"] ?? 0) / 1024))} Ko</span>
                    </div>
                  </div>
                </button>
                {doc["ai_notes"] ? (
                  <Button variant="ghost" size="sm" onClick={() => setNotesDoc(doc)}>
                    Notes IA
                  </Button>
                ) : null}
                <AiActions doc={doc} />
                <Button variant="ghost" size="icon" aria-label="Visualiser" onClick={() => setViewDoc(doc)}>
                  <Eye className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => removeDocument(doc)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/matieres/$subjectId")({
  head: () => ({
    meta: [
      { title: "Détail de la matière — StudyOS" },
      { name: "description", content: "Cours, documents et exercices de la matière." },
      { property: "og:title", content: "Détail de la matière — StudyOS" },
      { property: "og:description", content: "Vos cours et vos exercices, matière par matière." },
    ],
  }),
  component: SubjectDetail,
});

function ExerciseDialog({
  subjectId,
  trigger,
  initial,
}: {
  subjectId: string;
  trigger: React.ReactNode;
  initial?: Row;
}) {
  const [open, setOpen] = useState(false);
  const base = () => ({
    title: "",
    subject_id: subjectId,
    difficulty: "medium",
    due_date: today(),
    status: "todo",
    difficulty_notes: "",
  });
  const [form, setForm] = useState<Row>(initial ?? base());
  const save = useSaveRow("exercises", "Exercice enregistré");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(initial ?? base());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'exercice" : "Nouvel exercice"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Intitulé">
            <Input
              value={(form["title"] as string) ?? ""}
              maxLength={140}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Exercices 12 à 18 page 45"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Difficulté">
              <OptionSelect
                value={form["difficulty"] as string}
                options={DIFFICULTIES}
                onChange={(v) => set("difficulty", v ?? "medium")}
              />
            </Field>
            <Field label="Statut">
              <OptionSelect
                value={form["status"] as string}
                options={EXERCISE_STATUS}
                onChange={(v) => set("status", v ?? "todo")}
              />
            </Field>
          </div>
          <Field label="Date">
            <Input
              type="date"
              value={(form["due_date"] as string) ?? ""}
              onChange={(e) => set("due_date", e.target.value || null)}
            />
          </Field>
          <Field label="Mes difficultés">
            <Textarea
              value={(form["difficulty_notes"] as string) ?? ""}
              maxLength={1000}
              placeholder="Je n'ai pas compris la question 3…"
              onChange={(e) => set("difficulty_notes", e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={!String(form["title"] ?? "").trim() || save.isPending}
            onClick={() => save.mutate(form, { onSuccess: () => setOpen(false) })}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExerciseList({ subjectId }: { subjectId: string }) {
  const { data: exercises = [], isLoading } = useRows<Row>("exercises", {
    eq: { subject_id: subjectId },
    order: { column: "due_date" },
  });
  const remove = useDeleteRow("exercises", "Exercice supprimé");
  const save = useSaveRow("exercises", "Statut mis à jour");

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Exercices</h2>
        <ExerciseDialog
          subjectId={subjectId}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="mr-2 size-4" />
              Nouvel exercice
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : exercises.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun exercice pour cette matière. Ajoutez-en pour suivre ce qui est acquis et ce qui reste à revoir.
        </p>
      ) : (
        <div className="grid gap-3">
          {exercises.map((ex) => (
            <div key={ex["id"] as string} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{ex["title"] as string}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {DIFFICULTIES.find((d) => d.value === ex["difficulty"])?.label}
                    </Badge>
                    {ex["due_date"] && <span>{formatShortDate(ex["due_date"] as string)}</span>}
                  </div>
                  {ex["difficulty_notes"] ? (
                    <p className="mt-2 rounded-lg bg-secondary p-2 text-sm text-muted-foreground">
                      {ex["difficulty_notes"] as string}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ExerciseDialog
                    subjectId={subjectId}
                    initial={ex}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Modifier
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer"
                    onClick={() => remove.mutate(ex["id"] as string)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXERCISE_STATUS.map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={ex["status"] === s.value ? "default" : "outline"}
                    onClick={() => save.mutate({ id: ex["id"], status: s.value })}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const { data: subjects = [] } = useRows<Row>("subjects");
  const subject = subjects.find((s) => s["id"] === subjectId);
  const { data: chapters = [] } = useRows<Row>("chapters", {
    eq: { subject_id: subjectId },
    order: { column: "position" },
  });

  return (
    <AppShell
      title={(subject?.["name"] as string) ?? "Matière"}
      description="Vos cours et vos exercices pour cette matière."
      actions={
        <Button variant="outline" asChild>
          <Link to="/matieres">
            <ArrowLeft className="mr-2 size-4" />
            Retour
          </Link>
        </Button>
      }
    >
      <DocumentList subjectId={subjectId} chapters={chapters} />
      <ExerciseList subjectId={subjectId} />
    </AppShell>
  );
}
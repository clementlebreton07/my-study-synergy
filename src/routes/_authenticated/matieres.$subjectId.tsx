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
import { DOC_KINDS, MASTERY, masteryLabel, masteryWeight } from "@/lib/study";
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
      { name: "description", content: "Chapitres, documents, exercices et notes de la matière." },
      { property: "og:title", content: "Détail de la matière — StudyOS" },
      { property: "og:description", content: "Suivez le détail d'une matière chapitre par chapitre." },
    ],
  }),
  component: SubjectDetail,
});

function ChapterDialog({
  subjectId,
  trigger,
  initial,
  position,
}: {
  subjectId: string;
  trigger: React.ReactNode;
  initial?: Row;
  position?: number;
}) {
  const [open, setOpen] = useState(false);
  const base = () => ({
    subject_id: subjectId,
    title: "",
    description: "",
    mastery: "not_started",
    position: position ?? 0,
  });
  const [form, setForm] = useState<Row>(initial ?? base());
  const save = useSaveRow("chapters", "Chapitre enregistré");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le chapitre" : "Nouveau chapitre"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Titre">
            <Input
              value={(form["title"] as string) ?? ""}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Chapitre 1 — Fonctions"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={(form["description"] as string) ?? ""}
              maxLength={500}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Niveau de maîtrise">
            <OptionSelect
              value={form["mastery"] as string}
              options={MASTERY.map((m) => ({ value: m.value, label: m.label }))}
              onChange={(v) => set("mastery", v ?? "not_started")}
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

function ChapterCard({ chapter }: { chapter: Row }) {
  const id = chapter["id"] as string;
  const { data: documents = [] } = useRows<Row>("documents", { eq: { chapter_id: id } });
  const { data: exercises = [] } = useRows<Row>("exercises", { eq: { chapter_id: id } });
  const { data: notes = [] } = useRows<Row>("notes", { eq: { chapter_id: id } });
  const { data: flashcards = [] } = useRows<Row>("flashcards", { eq: { chapter_id: id } });
  const save = useSaveRow("chapters", "Chapitre mis à jour");
  const remove = useDeleteRow("chapters", "Chapitre supprimé");
  const [noteContent, setNoteContent] = useState("");
  const saveNote = useSaveRow("notes", "Note ajoutée");

  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{chapter["title"] as string}</h3>
          {chapter["description"] ? (
            <p className="mt-1 text-sm text-muted-foreground">{chapter["description"] as string}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <ChapterDialog
            subjectId={chapter["subject_id"] as string}
            initial={chapter}
            trigger={
              <Button variant="ghost" size="sm">
                Modifier
              </Button>
            }
          />
          <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => remove.mutate(id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">{masteryLabel(chapter["mastery"] as string)}</Badge>
        <Badge variant="outline">{documents.length} document(s)</Badge>
        <Badge variant="outline">{exercises.length} exercice(s)</Badge>
        <Badge variant="outline">{notes.length} note(s)</Badge>
        <Badge variant="outline">{flashcards.length} flashcard(s)</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={masteryWeight(chapter["mastery"] as string)} />
        <div className="flex flex-wrap gap-2">
          {MASTERY.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={chapter["mastery"] === m.value ? "default" : "outline"}
              onClick={() => save.mutate({ id, mastery: m.value })}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {notes.map((n) => (
            <li key={n["id"] as string} className="rounded-lg bg-secondary p-3 text-sm">
              {n["content"] as string}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={noteContent}
          maxLength={500}
          placeholder="Ajouter une note sur ce chapitre…"
          onChange={(e) => setNoteContent(e.target.value)}
        />
        <Button
          variant="outline"
          disabled={!noteContent.trim()}
          onClick={() =>
            saveNote.mutate(
              { chapter_id: id, title: "Note", content: noteContent.trim() },
              { onSuccess: () => setNoteContent("") },
            )
          }
        >
          Ajouter
        </Button>
      </div>
    </div>
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

  const progress =
    chapters.length === 0
      ? 0
      : Math.round(
          chapters.reduce((sum, c) => sum + masteryWeight(c["mastery"] as string), 0) / chapters.length,
        );

  return (
    <AppShell
      title={(subject?.["name"] as string) ?? "Matière"}
      description={`${chapters.length} chapitre(s) · progression ${progress}%`}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/matieres">
              <ArrowLeft className="mr-2 size-4" />
              Retour
            </Link>
          </Button>
          <ChapterDialog
            subjectId={subjectId}
            position={chapters.length}
            trigger={
              <Button>
                <Plus className="mr-2 size-4" />
                Nouveau chapitre
              </Button>
            }
          />
        </>
      }
    >
      {chapters.length === 0 ? (
        <EmptyState
          title="Aucun chapitre"
          text="Ajoutez les chapitres de cette matière pour y rattacher vos cours, exercices et notes."
          action={
            <ChapterDialog
              subjectId={subjectId}
              position={0}
              trigger={<Button>Ajouter un chapitre</Button>}
            />
          }
        />
      ) : (
        <div className="grid gap-4">
          {chapters.map((c) => (
            <ChapterCard key={c["id"] as string} chapter={c} />
          ))}
        </div>
      )}

      <DocumentList subjectId={subjectId} chapters={chapters} />
    </AppShell>
  );
}
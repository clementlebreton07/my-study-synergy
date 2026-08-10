import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import { MASTERY, masteryLabel, masteryWeight } from "@/lib/study";

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
    </AppShell>
  );
}
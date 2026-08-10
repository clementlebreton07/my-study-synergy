import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect, useChapterOptions, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import { DIFFICULTIES, EXERCISE_STATUS, formatShortDate, today } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/exercices")({
  head: () => ({
    meta: [
      { title: "Exercices — StudyOS" },
      { name: "description", content: "Suivez vos exercices par matière, chapitre, difficulté et statut." },
      { property: "og:title", content: "Exercices — StudyOS" },
      { property: "og:description", content: "Notez vos difficultés et repérez ce qui est à revoir." },
    ],
  }),
  component: ExercisesPage,
});

function ExerciseDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Row }) {
  const [open, setOpen] = useState(false);
  const base = () => ({
    title: "",
    subject_id: null as string | null,
    chapter_id: null as string | null,
    difficulty: "medium",
    due_date: today(),
    status: "todo",
    difficulty_notes: "",
  });
  const [form, setForm] = useState<Row>(initial ?? base());
  const subjects = useSubjectOptions();
  const chapters = useChapterOptions(form["subject_id"] as string | null);
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
            <Field label="Matière">
              <OptionSelect
                allowEmpty
                value={form["subject_id"] as string | null}
                options={subjects}
                onChange={(v) => {
                  set("subject_id", v);
                  set("chapter_id", null);
                }}
              />
            </Field>
            <Field label="Chapitre">
              <OptionSelect
                allowEmpty
                value={form["chapter_id"] as string | null}
                options={chapters}
                onChange={(v) => set("chapter_id", v)}
              />
            </Field>
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

function ExercisesPage() {
  const { data: exercises = [], isLoading } = useRows<Row>("exercises", {
    order: { column: "due_date" },
  });
  const subjects = useSubjectOptions();
  const remove = useDeleteRow("exercises", "Exercice supprimé");
  const save = useSaveRow("exercises", "Statut mis à jour");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () => (filter === "all" ? exercises : exercises.filter((e) => e["status"] === filter)),
    [exercises, filter],
  );

  return (
    <AppShell
      title="Exercices"
      description="Ce qui est fait, ce qui reste, ce qui est à revoir."
      actions={
        <ExerciseDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Nouvel exercice
            </Button>
          }
        />
      }
    >
      <Tabs value={filter} onValueChange={setFilter} className="mb-5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {EXERCISE_STATUS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun exercice"
          text="Ajoutez vos exercices pour suivre ce que vous maîtrisez et ce qui doit être retravaillé."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((ex) => {
            const subject = subjects.find((s) => s.value === ex["subject_id"]);
            return (
              <div key={ex["id"] as string} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ex["title"] as string}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {subject && <Badge variant="outline">{subject.label}</Badge>}
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
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
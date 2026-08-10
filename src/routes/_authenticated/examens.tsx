import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import { IMPORTANCE, daysUntil, formatShortDate, hhmm, today } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/examens")({
  head: () => ({
    meta: [
      { title: "Examens — StudyOS" },
      { name: "description", content: "Vos examens, leur compte à rebours et votre niveau de préparation." },
      { property: "og:title", content: "Examens — StudyOS" },
      { property: "og:description", content: "Ne soyez plus jamais surpris par une date d'examen." },
    ],
  }),
  component: ExamsPage,
});

export function ExamDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Row }) {
  const [open, setOpen] = useState(false);
  const base = () => ({
    title: "",
    subject_id: null as string | null,
    exam_date: today(),
    exam_time: "",
    location: "",
    chapter_ids: [] as string[],
    importance: "normal",
    preparation: 0,
  });
  const [form, setForm] = useState<Row>(initial ?? base());
  const subjects = useSubjectOptions();
  const { data: chapters = [] } = useRows<Row>("chapters", { order: { column: "position" } });
  const save = useSaveRow("exams", "Examen enregistré");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const selected = (form["chapter_ids"] as string[] | null) ?? [];
  const subjectChapters = chapters.filter((c) => c["subject_id"] === form["subject_id"]);

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
          <DialogTitle>{initial ? "Modifier l'examen" : "Nouvel examen"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Intitulé">
            <Input
              value={(form["title"] as string) ?? ""}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Partiel de mathématiques"
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
                  set("chapter_ids", []);
                }}
              />
            </Field>
            <Field label="Importance">
              <OptionSelect
                value={form["importance"] as string}
                options={IMPORTANCE}
                onChange={(v) => set("importance", v ?? "normal")}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={(form["exam_date"] as string) ?? ""}
                onChange={(e) => set("exam_date", e.target.value)}
              />
            </Field>
            <Field label="Heure">
              <Input
                type="time"
                value={hhmm(form["exam_time"] as string)}
                onChange={(e) => set("exam_time", e.target.value || null)}
              />
            </Field>
          </div>
          <Field label="Lieu">
            <Input
              value={(form["location"] as string) ?? ""}
              maxLength={120}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
          {subjectChapters.length > 0 && (
            <Field label="Chapitres concernés">
              <div className="grid gap-2">
                {subjectChapters.map((c) => {
                  const id = c["id"] as string;
                  return (
                    <label key={id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.includes(id)}
                        onCheckedChange={(checked) =>
                          set(
                            "chapter_ids",
                            checked ? [...selected, id] : selected.filter((x) => x !== id),
                          )
                        }
                      />
                      {c["title"] as string}
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
          <Field label={`Niveau de préparation : ${Number(form["preparation"] ?? 0)}%`}>
            <Slider
              value={[Number(form["preparation"] ?? 0)]}
              max={100}
              step={5}
              onValueChange={(v) => set("preparation", v[0] ?? 0)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={!String(form["title"] ?? "").trim() || !form["exam_date"] || save.isPending}
            onClick={() => save.mutate(form, { onSuccess: () => setOpen(false) })}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExamsPage() {
  const { data: exams = [], isLoading } = useRows<Row>("exams", { order: { column: "exam_date" } });
  const subjects = useSubjectOptions();
  const remove = useDeleteRow("exams", "Examen supprimé");

  return (
    <AppShell
      title="Examens"
      description="Compte à rebours et préparation."
      actions={
        <ExamDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Nouvel examen
            </Button>
          }
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : exams.length === 0 ? (
        <EmptyState
          title="Aucun examen planifié"
          text="Ajoutez vos dates d'examens : StudyOS calculera le temps restant et votre préparation."
          action={<ExamDialog trigger={<Button>Ajouter un examen</Button>} />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const days = daysUntil(exam["exam_date"] as string);
            const subject = subjects.find((s) => s.value === exam["subject_id"]);
            return (
              <div key={exam["id"] as string} className="surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{exam["title"] as string}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subject ? subject.label + " · " : ""}
                      {formatShortDate(exam["exam_date"] as string)}
                      {exam["exam_time"] ? ` à ${hhmm(exam["exam_time"] as string)}` : ""}
                      {exam["location"] ? ` · ${exam["location"] as string}` : ""}
                    </p>
                  </div>
                  <Badge variant={days < 0 ? "outline" : days <= 7 ? "destructive" : "secondary"}>
                    {days < 0 ? "Passé" : days === 0 ? "Aujourd'hui" : `dans ${days} j`}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Préparation</span>
                    <span>{Number(exam["preparation"] ?? 0)}%</span>
                  </div>
                  <Progress value={Number(exam["preparation"] ?? 0)} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {((exam["chapter_ids"] as string[] | null) ?? []).length} chapitre(s) au programme
                </p>
                <div className="mt-4 flex justify-end gap-1">
                  <ExamDialog
                    initial={exam}
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
                    onClick={() => remove.mutate(exam["id"] as string)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
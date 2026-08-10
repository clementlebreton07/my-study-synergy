import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ColorDot, EmptyState, Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useRows, useSaveRow, type Row } from "@/lib/api";
import { daysUntil, formatShortDate, masteryWeight } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/matieres")({
  head: () => ({
    meta: [
      { title: "Mes matières — StudyOS" },
      { name: "description", content: "Créez vos matières, leurs chapitres et suivez leur progression." },
      { property: "og:title", content: "Mes matières — StudyOS" },
      { property: "og:description", content: "Toutes vos matières et chapitres au même endroit." },
    ],
  }),
  component: SubjectsPage,
});

const COLORS = ["#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function SubjectDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Row }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(
    initial ?? { name: "", description: "", color: COLORS[0], teacher: "" },
  );
  const save = useSaveRow("subjects", "Matière enregistrée");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(initial ?? { name: "", description: "", color: COLORS[0], teacher: "" });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Nom">
            <Input
              value={(form["name"] as string) ?? ""}
              maxLength={80}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Mathématiques"
            />
          </Field>
          <Field label="Professeur">
            <Input
              value={(form["teacher"] as string) ?? ""}
              maxLength={80}
              onChange={(e) => set("teacher", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={(form["description"] as string) ?? ""}
              maxLength={500}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Couleur">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${c}`}
                  onClick={() => set("color", c)}
                  className={`size-8 rounded-full border-2 transition ${form["color"] === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={!String(form["name"] ?? "").trim() || save.isPending}
            onClick={() => save.mutate(form, { onSuccess: () => setOpen(false) })}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function subjectProgress(chapters: Row[]) {
  if (chapters.length === 0) return 0;
  const total = chapters.reduce((sum, c) => sum + masteryWeight(c["mastery"] as string), 0);
  return Math.round(total / chapters.length);
}

function SubjectsPage() {
  const { data: subjects = [], isLoading } = useRows<Row>("subjects", { order: { column: "name" } });
  const { data: chapters = [] } = useRows<Row>("chapters", { order: { column: "position" } });
  const { data: exams = [] } = useRows<Row>("exams", { order: { column: "exam_date" } });

  return (
    <AppShell
      title="Mes matières"
      description="Organisez vos cours par matière et par chapitre."
      actions={
        <SubjectDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Nouvelle matière
            </Button>
          }
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : subjects.length === 0 ? (
        <EmptyState
          title="Commencez par créer une matière"
          text="Chaque matière contiendra vos chapitres, vos documents, vos exercices et votre progression."
          action={<SubjectDialog trigger={<Button>Créer ma première matière</Button>} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => {
            const subjectChapters = chapters.filter((c) => c["subject_id"] === s["id"]);
            const nextExam = exams.find((e) => e["subject_id"] === s["id"]);
            const progress = subjectProgress(subjectChapters);
            return (
              <Link
                key={s["id"] as string}
                to="/matieres/$subjectId"
                params={{ subjectId: s["id"] as string }}
                className="surface block p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <ColorDot color={s["color"] as string} />
                  <h2 className="truncate text-base font-semibold">{s["name"] as string}</h2>
                </div>
                {s["teacher"] ? (
                  <p className="mt-1 text-xs text-muted-foreground">{s["teacher"] as string}</p>
                ) : null}
                {s["description"] ? (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {s["description"] as string}
                  </p>
                ) : null}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{subjectChapters.length} chapitre(s)</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {nextExam
                    ? `Prochain examen : ${formatShortDate(nextExam["exam_date"] as string)} (dans ${daysUntil(nextExam["exam_date"] as string)} j)`
                    : "Aucun examen planifié"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
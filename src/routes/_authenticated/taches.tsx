import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect, useChapterOptions, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import { PRIORITIES, TASK_STATUS, formatMinutes, formatShortDate, priorityLabel, today } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/taches")({
  head: () => ({
    meta: [
      { title: "Tâches — StudyOS" },
      { name: "description", content: "Votre to-do list d'études avec priorités, durées et échéances." },
      { property: "og:title", content: "Tâches — StudyOS" },
      { property: "og:description", content: "Gérez vos tâches d'études au quotidien." },
    ],
  }),
  component: TasksPage,
});

const emptyTask = () => ({
  title: "",
  subject_id: null as string | null,
  chapter_id: null as string | null,
  estimated_minutes: 30,
  priority: "normal",
  planned_date: today(),
  due_date: null as string | null,
  status: "todo",
  notes: "",
});

export function TaskDialog({
  trigger,
  initial,
  defaultDate,
}: {
  trigger: React.ReactNode;
  initial?: Row;
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(initial ?? { ...emptyTask(), planned_date: defaultDate ?? today() });
  const subjects = useSubjectOptions();
  const chapters = useChapterOptions(form["subject_id"] as string | null);
  const save = useSaveRow("tasks", "Tâche enregistrée");

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(initial ?? { ...emptyTask(), planned_date: defaultDate ?? today() });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Titre">
            <Input
              value={(form["title"] as string) ?? ""}
              maxLength={140}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Réviser le chapitre 3"
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
            <Field label="Durée estimée (min)">
              <Input
                type="number"
                min={5}
                max={600}
                value={Number(form["estimated_minutes"] ?? 30)}
                onChange={(e) => set("estimated_minutes", Number(e.target.value))}
              />
            </Field>
            <Field label="Priorité">
              <OptionSelect
                value={form["priority"] as string}
                options={PRIORITIES}
                onChange={(v) => set("priority", v ?? "normal")}
              />
            </Field>
            <Field label="Date prévue">
              <Input
                type="date"
                value={(form["planned_date"] as string) ?? ""}
                onChange={(e) => set("planned_date", e.target.value || null)}
              />
            </Field>
            <Field label="Échéance">
              <Input
                type="date"
                value={(form["due_date"] as string) ?? ""}
                onChange={(e) => set("due_date", e.target.value || null)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={(form["notes"] as string) ?? ""}
              maxLength={1000}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={!String(form["title"] ?? "").trim() || save.isPending}
            onClick={() =>
              save.mutate(form, {
                onSuccess: () => setOpen(false),
              })
            }
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const priorityTone: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-warning/20 text-warning-foreground",
  urgent: "bg-destructive/15 text-destructive",
};

export function TaskRow({ task }: { task: Row }) {
  const save = useSaveRow("tasks", "Tâche mise à jour");
  const remove = useDeleteRow("tasks", "Tâche supprimée");
  const subjects = useSubjectOptions();
  const subject = subjects.find((s) => s.value === task["subject_id"]);
  const done = task["status"] === "done";
  const late =
    !done && task["due_date"] && (task["due_date"] as string) < today();

  return (
    <div className="surface flex items-start gap-3 p-4">
      <Checkbox
        className="mt-1"
        checked={done}
        onCheckedChange={(checked) =>
          save.mutate({
            id: task["id"],
            status: checked ? "done" : "todo",
            completed_at: checked ? new Date().toISOString() : null,
          })
        }
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
          {task["title"] as string}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {subject && <Badge variant="outline">{subject.label}</Badge>}
          <Badge className={priorityTone[task["priority"] as string] ?? ""} variant="secondary">
            {priorityLabel(task["priority"] as string)}
          </Badge>
          <span>{formatMinutes(Number(task["estimated_minutes"] ?? 0))}</span>
          {task["planned_date"] && <span>Prévue le {formatShortDate(task["planned_date"] as string)}</span>}
          {late && <span className="font-medium text-destructive">En retard</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <TaskDialog
          initial={task}
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
          onClick={() => remove.mutate(task["id"] as string)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function TasksPage() {
  const { data: tasks = [], isLoading } = useRows<Row>("tasks", {
    order: { column: "planned_date" },
  });
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "late")
      return tasks.filter(
        (t) => t["status"] !== "done" && t["due_date"] && (t["due_date"] as string) < today(),
      );
    return tasks.filter((t) => t["status"] === filter);
  }, [tasks, filter]);

  return (
    <AppShell
      title="Tâches"
      description="Tout ce que vous devez faire, priorisé."
      actions={
        <TaskDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Nouvelle tâche
            </Button>
          }
        />
      }
    >
      <Tabs value={filter} onValueChange={setFilter} className="mb-5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          {TASK_STATUS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="late">En retard</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune tâche ici"
          text="Ajoutez vos révisions, exercices et devoirs pour que StudyOS puisse organiser vos journées."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((task) => (
            <TaskRow key={task["id"] as string} task={task} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
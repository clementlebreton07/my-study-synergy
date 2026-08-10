import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import {
  EVENT_KINDS,
  WEEKDAYS,
  addDays,
  formatLongDate,
  hhmm,
  startOfWeek,
  toISODate,
  today,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({
    meta: [
      { title: "Planning — StudyOS" },
      { name: "description", content: "Votre semaine de cours, révisions et séances de travail." },
      { property: "og:title", content: "Planning — StudyOS" },
      { property: "og:description", content: "Organisez votre semaine d'étude heure par heure." },
    ],
  }),
  component: PlanningPage,
});

function EventDialog({
  trigger,
  initial,
  defaultDate,
}: {
  trigger: React.ReactNode;
  initial?: Row;
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = () => ({
    title: "",
    subject_id: null as string | null,
    kind: "course",
    event_date: defaultDate ?? today(),
    start_time: "08:00",
    end_time: "09:00",
    location: "",
  });
  const [form, setForm] = useState<Row>(initial ?? base());
  const subjects = useSubjectOptions();
  const save = useSaveRow("events", "Créneau enregistré");
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
          <DialogTitle>{initial ? "Modifier le créneau" : "Nouveau créneau"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Intitulé">
            <Input
              value={(form["title"] as string) ?? ""}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Cours de physique"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <OptionSelect
                value={form["kind"] as string}
                options={EVENT_KINDS}
                onChange={(v) => set("kind", v ?? "course")}
              />
            </Field>
            <Field label="Matière">
              <OptionSelect
                allowEmpty
                value={form["subject_id"] as string | null}
                options={subjects}
                onChange={(v) => set("subject_id", v)}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={(form["event_date"] as string) ?? ""}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </Field>
            <Field label="Lieu">
              <Input
                value={(form["location"] as string) ?? ""}
                maxLength={120}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
            <Field label="Début">
              <Input
                type="time"
                value={hhmm(form["start_time"] as string)}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </Field>
            <Field label="Fin">
              <Input
                type="time"
                value={hhmm(form["end_time"] as string)}
                onChange={(e) => set("end_time", e.target.value)}
              />
            </Field>
          </div>
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

function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const { data: events = [], isLoading } = useRows<Row>("events", {
    order: { column: "start_time" },
  });
  const subjects = useSubjectOptions();
  const remove = useDeleteRow("events", "Créneau supprimé");

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayIso = today();

  return (
    <AppShell
      title="Planning"
      description="Vos cours et séances de révision, semaine par semaine."
      actions={
        <EventDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Nouveau créneau
            </Button>
          }
        />
      }
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button variant="outline" size="icon" aria-label="Semaine précédente" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium">
          Semaine du {formatLongDate(weekStart)}
        </p>
        <Button variant="outline" size="icon" aria-label="Semaine suivante" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-7">
          {days.map((day, index) => {
            const iso = toISODate(day);
            const dayEvents = events.filter((e) => e["event_date"] === iso);
            return (
              <div
                key={iso}
                className={`surface flex min-h-40 flex-col gap-2 p-3 ${
                  iso === todayIso ? "ring-1 ring-primary" : ""
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{WEEKDAYS[index]}</span>
                  <span className="text-xs text-muted-foreground">{day.getDate()}</span>
                </div>
                {dayEvents.map((event) => {
                  const subject = subjects.find((s) => s.value === event["subject_id"]);
                  return (
                    <div key={event["id"] as string} className="rounded-lg bg-secondary p-2">
                      <p className="text-sm font-medium leading-tight">{event["title"] as string}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hhmm(event["start_time"] as string)} – {hhmm(event["end_time"] as string)}
                      </p>
                      {subject && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {subject.label}
                        </Badge>
                      )}
                      <div className="mt-1 flex justify-end gap-1">
                        <EventDialog
                          initial={event}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              Modifier
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="Supprimer"
                          onClick={() => remove.mutate(event["id"] as string)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <EventDialog
                  defaultDate={iso}
                  trigger={
                    <Button variant="ghost" size="sm" className="mt-auto justify-start text-xs text-muted-foreground">
                      <Plus className="mr-1 size-3.5" /> Ajouter
                    </Button>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Aucun créneau"
            text="Ajoutez vos cours et vos séances de révision pour visualiser votre semaine."
          />
        </div>
      )}
    </AppShell>
  );
}
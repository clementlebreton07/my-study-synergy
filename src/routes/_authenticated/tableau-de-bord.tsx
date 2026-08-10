import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Plus, Timer, Trophy } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Field, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useProfile, useRows, useSaveRow, type Row } from "@/lib/api";
import {
  daysUntil,
  formatLongDate,
  formatMinutes,
  formatShortDate,
  hhmm,
  masteryWeight,
  today,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — StudyOS" },
      { name: "description", content: "Votre journée d'étude en un coup d'œil : cours, tâches et examens." },
      { property: "og:title", content: "Tableau de bord — StudyOS" },
      { property: "og:description", content: "Ce qu'il faut faire aujourd'hui, sans rien oublier." },
    ],
  }),
  component: DashboardPage,
});

function Card({ title, children, to }: { title: string; children: React.ReactNode; to?: string }) {
  return (
    <section className="surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {to && (
          <Button asChild variant="ghost" size="sm">
            <Link to={to}>Voir tout</Link>
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function LogSessionDialog() {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const subjects = useSubjectOptions();
  const save = useSaveRow("study_sessions", "Séance enregistrée");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Timer className="mr-2 size-4" />
          Noter une séance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Temps de travail</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Durée (minutes)">
            <Input
              type="number"
              min={5}
              max={600}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </Field>
          <Field label="Matière">
            <OptionSelect allowEmpty value={subjectId} options={subjects} onChange={setSubjectId} />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  session_date: today(),
                  duration_minutes: Math.min(600, Math.max(5, minutes || 30)),
                  subject_id: subjectId,
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardPage() {
  const iso = today();
  const { data: profile } = useProfile();
  const { data: events = [] } = useRows<Row>("events", { order: { column: "start_time" } });
  const { data: tasks = [] } = useRows<Row>("tasks", { order: { column: "due_date" } });
  const { data: exams = [] } = useRows<Row>("exams", { order: { column: "exam_date" } });
  const { data: chapters = [] } = useRows<Row>("chapters");
  const { data: sessions = [] } = useRows<Row>("study_sessions");
  const saveTask = useSaveRow("tasks", "Tâche mise à jour");

  const todayEvents = events.filter((e) => e["event_date"] === iso);
  const openTasks = tasks.filter((t) => t["status"] !== "done");
  const todayTasks = openTasks.filter((t) => !t["due_date"] || String(t["due_date"]) <= iso);
  const nextExams = exams.filter((e) => daysUntil(e["exam_date"] as string) >= 0).slice(0, 3);
  const goal = Number(profile?.daily_goal_minutes ?? 120);
  const doneToday = sessions
    .filter((s) => s["session_date"] === iso)
    .reduce((sum, s) => sum + Number(s["duration_minutes"] ?? 0), 0);
  const mastery = chapters.length
    ? Math.round(
        chapters.reduce((sum, c) => sum + masteryWeight(String(c["mastery"] ?? "not_started")), 0) /
          chapters.length,
      )
    : 0;

  return (
    <AppShell
      title={`Bonjour${profile?.first_name ? ` ${profile.first_name}` : ""} 👋`}
      description={formatLongDate(new Date())}
      actions={
        <div className="flex flex-wrap gap-2">
          <LogSessionDialog />
          <Button asChild>
            <Link to="/taches">
              <Plus className="mr-2 size-4" />
              Nouvelle tâche
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface gradient-hero p-5 text-primary-foreground">
          <p className="flex items-center gap-2 text-sm opacity-90">
            <Clock className="size-4" /> Objectif du jour
          </p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {formatMinutes(doneToday)} / {formatMinutes(goal)}
          </p>
          <Progress value={goal ? Math.min(100, (doneToday / goal) * 100) : 0} className="mt-4" />
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Tâches à faire aujourd'hui</p>
          <p className="mt-2 font-display text-3xl font-semibold">{todayTasks.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{openTasks.length} au total</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Maîtrise globale</p>
          <p className="mt-2 font-display text-3xl font-semibold">{mastery}%</p>
          <Progress value={mastery} className="mt-4" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Aujourd'hui" to="/planning">
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun cours ni séance planifiée aujourd'hui.</p>
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((event) => (
                <li key={event["id"] as string} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                  <CalendarDays className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event["title"] as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {hhmm(event["start_time"] as string)} – {hhmm(event["end_time"] as string)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="À faire" to="/taches">
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien d'urgent, profitez-en pour prendre de l'avance.</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks.slice(0, 6).map((task) => (
                <li key={task["id"] as string} className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Marquer comme terminée"
                    onClick={() => saveTask.mutate({ id: task["id"], status: "done" })}
                  >
                    <CheckCircle2 className="size-4" />
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-sm">{task["title"] as string}</span>
                  {task["due_date"] && String(task["due_date"]) < iso && (
                    <Badge variant="destructive">En retard</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Prochains examens" to="/examens">
          {nextExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun examen à venir.</p>
          ) : (
            <ul className="space-y-2">
              {nextExams.map((exam) => {
                const days = daysUntil(exam["exam_date"] as string);
                return (
                  <li key={exam["id"] as string} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                    <Trophy className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{exam["title"] as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(exam["exam_date"] as string)}
                      </p>
                    </div>
                    <Badge variant={days <= 7 ? "destructive" : "secondary"}>
                      {days === 0 ? "Aujourd'hui" : `J-${days}`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
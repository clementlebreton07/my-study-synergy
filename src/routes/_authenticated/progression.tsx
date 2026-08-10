import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRows, type Row } from "@/lib/api";
import { formatMinutes, masteryWeight, toISODate, addDays } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/progression")({
  head: () => ({
    meta: [
      { title: "Progression — StudyOS" },
      { name: "description", content: "Statistiques de révision, maîtrise par matière et temps de travail." },
      { property: "og:title", content: "Progression — StudyOS" },
      { property: "og:description", content: "Mesurez vos progrès semaine après semaine." },
    ],
  }),
  component: ProgressPage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProgressPage() {
  const { data: subjects = [] } = useRows<Row>("subjects", { order: { column: "name" } });
  const { data: chapters = [] } = useRows<Row>("chapters");
  const { data: tasks = [] } = useRows<Row>("tasks");
  const { data: exercises = [] } = useRows<Row>("exercises");
  const { data: sessions = [] } = useRows<Row>("study_sessions");

  const since = toISODate(addDays(new Date(), -7));
  const weekMinutes = sessions
    .filter((s) => String(s["session_date"] ?? "") >= since)
    .reduce((sum, s) => sum + Number(s["minutes"] ?? 0), 0);
  const totalMinutes = sessions.reduce((sum, s) => sum + Number(s["minutes"] ?? 0), 0);
  const doneTasks = tasks.filter((t) => t["status"] === "done").length;
  const doneExercises = exercises.filter((e) => e["status"] === "done").length;
  const globalMastery = chapters.length
    ? Math.round(
        chapters.reduce((sum, c) => sum + masteryWeight(String(c["mastery"] ?? "not_started")), 0) /
          chapters.length,
      )
    : 0;

  return (
    <AppShell title="Progression" description="Vos statistiques d'étude.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Maîtrise globale" value={`${globalMastery}%`} hint={`${chapters.length} chapitres`} />
        <Stat label="Temps cette semaine" value={formatMinutes(weekMinutes)} hint={`${formatMinutes(totalMinutes)} au total`} />
        <Stat label="Tâches terminées" value={`${doneTasks}/${tasks.length}`} />
        <Stat label="Exercices terminés" value={`${doneExercises}/${exercises.length}`} />
      </div>

      <h2 className="mt-8 mb-3 font-display text-lg font-semibold">Maîtrise par matière</h2>
      {subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ajoutez des matières pour voir votre progression.</p>
      ) : (
        <div className="grid gap-3">
          {subjects.map((subject) => {
            const list = chapters.filter((c) => c["subject_id"] === subject["id"]);
            const value = list.length
              ? Math.round(
                  list.reduce((sum, c) => sum + masteryWeight(String(c["mastery"] ?? "not_started")), 0) /
                    list.length,
                )
              : 0;
            return (
              <div key={subject["id"] as string} className="surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{subject["name"] as string}</span>
                  <Badge variant="secondary">{value}%</Badge>
                </div>
                <Progress value={value} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">{list.length} chapitre(s)</p>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
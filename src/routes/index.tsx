import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  LineChart,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyOS — Votre système d'études personnel" },
      {
        name: "description",
        content:
          "Importez vos cours, organisez vos chapitres, planifiez vos révisions et suivez votre progression jusqu'aux examens.",
      },
      { property: "og:title", content: "StudyOS — Votre système d'études personnel" },
      {
        property: "og:description",
        content: "Un seul espace pour vos cours, votre planning, vos tâches et vos examens.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: BookOpen, title: "Cours & chapitres", text: "Vos matières structurées, chapitre par chapitre, avec documents et notes." },
  { icon: CheckCircle2, title: "Tâches & exercices", text: "Une to-do list d'études avec priorités, durées et échéances." },
  { icon: CalendarDays, title: "Planning", text: "Cours, sessions de travail et examens sur une vue jour, semaine ou mois." },
  { icon: LineChart, title: "Progression", text: "Niveau de maîtrise par chapitre et retards visibles en un coup d'œil." },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="gradient-hero flex size-9 items-center justify-center rounded-xl">
            <GraduationCap className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold">StudyOS</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Se connecter</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="size-3.5" /> Votre système d'exploitation d'études
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">
          Arrêtez d'organiser vos études. Concentrez-vous sur le travail.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Importez vos cours, suivez vos chapitres, planifiez vos révisions et sachez chaque matin
          exactement quoi faire pour être prêt le jour de l'examen.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Commencer gratuitement</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="surface p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

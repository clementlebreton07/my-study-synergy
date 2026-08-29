import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useRows, type Row } from "@/lib/api";
import { today, toISODate, addDays } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/revisions")({
  head: () => ({
    meta: [
      { title: "Révisions — StudyOS" },
      {
        name: "description",
        content: "Révisez vos fiches en répétition espacée, générées depuis vos propres cours.",
      },
      { property: "og:title", content: "Révisions — StudyOS" },
      { property: "og:description", content: "Fiches intelligentes et rappels au bon moment." },
    ],
  }),
  component: RevisionPage,
});

const GRADES = [
  { label: "À revoir", value: 0, variant: "destructive" as const },
  { label: "Difficile", value: 3, variant: "outline" as const },
  { label: "Bien", value: 4, variant: "secondary" as const },
  { label: "Facile", value: 5, variant: "default" as const },
];

/** SM-2 simplifié : renvoie le prochain intervalle et la nouvelle facilité. */
function schedule(grade: number, interval: number, ease: number) {
  if (grade < 3) return { interval: 1, ease: Math.max(1.3, ease - 0.2) };
  const nextEase = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  const nextInterval = interval === 0 ? 1 : interval === 1 ? 6 : Math.round(interval * nextEase);
  return { interval: Math.min(180, nextInterval), ease: nextEase };
}

function RevisionPage() {
  const iso = today();
  const { data: cards = [], isLoading } = useRows<Row>("flashcards", {
    order: { column: "next_review" },
  });
  const subjects = useSubjectOptions();
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const queryClient = useQueryClient();

  const pool = useMemo(
    () => cards.filter((c) => !subjectFilter || c["subject_id"] === subjectFilter),
    [cards, subjectFilter],
  );
  const due = pool.filter((c) => String(c["next_review"] ?? iso) <= iso);
  const card = due[0];

  const review = useMutation({
    mutationFn: async ({ row, grade }: { row: Row; grade: number }) => {
      const next = schedule(grade, Number(row["interval_days"] ?? 0), Number(row["ease"] ?? 2.5));
      const { error } = await supabase
        .from("flashcards")
        .update({
          interval_days: next.interval,
          ease: next.ease,
          box: grade < 3 ? 1 : Math.min(5, Number(row["box"] ?? 1) + 1),
          last_review: iso,
          next_review: toISODate(addDays(new Date(), next.interval)),
        })
        .eq("id", row["id"] as string);
      if (error) throw error;
    },
    onSuccess: async () => {
      setRevealed(false);
      setReviewed((n) => n + 1);
      await queryClient.invalidateQueries({ queryKey: ["flashcards"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const total = reviewed + due.length;

  return (
    <AppShell
      title="Révisions"
      description="Répétition espacée : chaque fiche revient juste avant que vous ne l'oubliiez."
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <OptionSelect
            allowEmpty
            value={subjectFilter}
            options={subjects}
            placeholder="Toutes les matières"
            onChange={(v) => {
              setSubjectFilter(v);
              setRevealed(false);
            }}
          />
        </div>
        <Badge variant="secondary">
          <Layers className="mr-1 size-3" />
          {pool.length} fiches
        </Badge>
        <Badge variant={due.length ? "default" : "outline"}>{due.length} à réviser</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : pool.length === 0 ? (
        <EmptyState
          title="Aucune fiche pour l'instant"
          text="Ouvrez une matière, puis cliquez sur « Fiches IA » sur un document : les fiches sont générées à partir de votre contenu réel."
          action={
            <Button asChild>
              <Link to="/matieres">
                <Sparkles className="mr-2 size-4" /> Générer depuis un cours
              </Link>
            </Button>
          }
        />
      ) : !card ? (
        <EmptyState
          title="Tout est à jour 🎉"
          text="Aucune fiche à réviser aujourd'hui. Revenez demain, ou générez de nouvelles fiches depuis vos cours."
        />
      ) : (
        <div className="mx-auto max-w-2xl">
          {total > 0 && <Progress value={(reviewed / total) * 100} className="mb-5" />}
          <div className="surface min-h-56 p-6">
            <p className="text-xs text-muted-foreground">Question</p>
            <p className="mt-2 text-lg font-medium">{card["question"] as string}</p>
            {revealed && (
              <>
                <div className="my-5 border-t border-border" />
                <p className="text-xs text-muted-foreground">Réponse</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{card["answer"] as string}</p>
              </>
            )}
          </div>

          {revealed ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <Button
                  key={g.value}
                  variant={g.value >= 4 ? "default" : "outline"}
                  disabled={review.isPending}
                  onClick={() => review.mutate({ row: card, grade: g.value })}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          ) : (
            <Button className="mt-4 w-full" onClick={() => setRevealed(true)}>
              <RotateCcw className="mr-2 size-4" /> Afficher la réponse
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
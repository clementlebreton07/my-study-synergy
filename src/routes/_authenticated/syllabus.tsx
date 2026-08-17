import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, FileScan, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, Field, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { generateStudyPlan, importSyllabus } from "@/lib/ai.functions";
import { useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/api";
import { formatShortDate } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus & moyenne — StudyOS" },
      {
        name: "description",
        content: "Importez votre syllabus : évaluations, coefficients et planning de révision automatiques.",
      },
      { property: "og:title", content: "Syllabus & moyenne — StudyOS" },
      { property: "og:description", content: "Coefficients extraits, moyenne projetée et plan de travail généré." },
    ],
  }),
  component: SyllabusPage,
});

function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const subjects = useSubjectOptions();
  const { data: documents = [] } = useRows<Row>("documents", {
    order: { column: "created_at", ascending: false },
  });
  const run = useServerFn(importSyllabus);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => run({ data: { documentId: documentId as string, subjectId } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(
        `${result.assessments} évaluations, ${result.exams} examens et ${result.chapters} chapitres importés`,
      );
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileScan className="mr-2 size-4" />
          Scanner un syllabus
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer un plan de cours</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Document (syllabus, plan de cours)">
            <OptionSelect
              value={documentId}
              options={documents.map((d) => ({
                value: d["id"] as string,
                label: d["name"] as string,
              }))}
              placeholder="Choisir un document"
              onChange={setDocumentId}
            />
          </Field>
          <Field label="Matière">
            <OptionSelect allowEmpty value={subjectId} options={subjects} onChange={setSubjectId} />
          </Field>
          <p className="text-xs text-muted-foreground">
            L'IA extrait les évaluations, leurs coefficients et leurs dates, crée les examens et les
            chapitres correspondants.
          </p>
        </div>
        <DialogFooter>
          <Button disabled={!documentId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Analyser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanButton() {
  const run = useServerFn(generateStudyPlan);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => run({ data: { days: 7 } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`${result.created} séances ajoutées à vos tâches`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 size-4" />
      )}
      Générer mon plan de la semaine
    </Button>
  );
}

function SyllabusPage() {
  const { data: assessments = [], isLoading } = useRows<Row>("assessments", {
    order: { column: "due_date" },
  });
  const subjects = useSubjectOptions();
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const save = useSaveRow("assessments", "Note enregistrée");
  const remove = useDeleteRow("assessments", "Évaluation supprimée");

  const rows = subjectFilter
    ? assessments.filter((a) => a["subject_id"] === subjectFilter)
    : assessments;

  const graded = rows.filter((a) => a["grade"] !== null && a["grade"] !== undefined);
  const gradedWeight = graded.reduce((sum, a) => sum + Number(a["weight"] ?? 0), 0);
  const earned = graded.reduce(
    (sum, a) =>
      sum + (Number(a["grade"]) / Number(a["max_grade"] || 20)) * Number(a["weight"] ?? 0),
    0,
  );
  const projected = gradedWeight > 0 ? Math.round((earned / gradedWeight) * 100) : null;
  const totalWeight = rows.reduce((sum, a) => sum + Number(a["weight"] ?? 0), 0);

  return (
    <AppShell
      title="Syllabus & moyenne"
      description="Vos évaluations, leurs coefficients et votre moyenne projetée."
      actions={
        <div className="flex flex-wrap gap-2">
          <PlanButton />
          <ImportDialog />
        </div>
      }
    >
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="surface gradient-hero p-5 text-primary-foreground">
          <p className="text-sm opacity-90">Moyenne projetée</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {projected === null ? "—" : `${projected}%`}
          </p>
          <Progress value={projected ?? 0} className="mt-4" />
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Coefficients notés</p>
          <p className="mt-2 font-display text-3xl font-semibold">{Math.round(gradedWeight)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">sur {Math.round(totalWeight)}% déclarés</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Évaluations à venir</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {rows.length - graded.length}
          </p>
        </div>
      </div>

      <div className="mb-5 max-w-xs">
        <OptionSelect
          allowEmpty
          value={subjectFilter}
          options={subjects}
          placeholder="Toutes les matières"
          onChange={setSubjectFilter}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucune évaluation"
          text="Importez le syllabus de votre cours : l'IA en extrait les devoirs, examens, coefficients et dates, puis peut générer votre planning de révision."
          action={<ImportDialog />}
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((item) => {
            const subject = subjects.find((s) => s.value === item["subject_id"]);
            return (
              <div key={item["id"] as string} className="surface flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item["title"] as string}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {subject && <Badge variant="outline">{subject.label}</Badge>}
                    <Badge variant="secondary">{Number(item["weight"] ?? 0)}% de la note</Badge>
                    {item["due_date"] && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        {formatShortDate(item["due_date"] as string)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24"
                    step="0.5"
                    min={0}
                    placeholder="Note"
                    defaultValue={(item["grade"] as number | null) ?? ""}
                    aria-label={`Note obtenue pour ${item["title"]}`}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      const grade = value === "" ? null : Number(value);
                      if (grade === Number(item["grade"] ?? NaN)) return;
                      save.mutate({ id: item["id"], grade });
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    / {Number(item["max_grade"] ?? 20)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer"
                    onClick={() => remove.mutate(item["id"] as string)}
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
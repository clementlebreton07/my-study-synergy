import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, FileText, Layers, Loader2, Sparkles, Target, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { EmptyState, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRows, type Row } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { DOC_KINDS } from "@/lib/study";
import { analyzeDocument, generateFlashcards, generateQuiz } from "@/lib/ai.functions";


export const Route = createFileRoute("/_authenticated/cours")({
  head: () => ({
    meta: [
      { title: "Mes cours — StudyOS" },
      { name: "description", content: "Importez et classez vos cours, documents et supports par matière." },
      { property: "og:title", content: "Mes cours — StudyOS" },
      { property: "og:description", content: "Tous vos documents de cours, classés et accessibles." },
    ],
  }),
  component: CoursesPage,
});

function AiActions({ doc }: { doc: Row }) {
  const queryClient = useQueryClient();
  const analyze = useServerFn(analyzeDocument);
  const cards = useServerFn(generateFlashcards);
  const quiz = useServerFn(generateQuiz);
  const documentId = doc["id"] as string;

  const analyzeMutation = useMutation({
    mutationFn: () => analyze({ data: { documentId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Notes de cours générées");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cardsMutation = useMutation({
    mutationFn: () => cards({ data: { documentId, count: 12 } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`${result.created} fiches ajoutées aux révisions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const quizMutation = useMutation({
    mutationFn: () => quiz({ data: { documentId, count: 10, mode: "practice", durationMinutes: null } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`Quiz de ${result.count} questions créé`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const busy = analyzeMutation.isPending || cardsMutation.isPending || quizMutation.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => analyzeMutation.mutate()}>
        {analyzeMutation.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 size-4" />
        )}
        Analyser
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => cardsMutation.mutate()}>
        {cardsMutation.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Layers className="mr-2 size-4" />
        )}
        Fiches IA
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => quizMutation.mutate()}>
        {quizMutation.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Target className="mr-2 size-4" />
        )}
        Quiz
      </Button>
    </div>
  );
}

function NotesDialog({ doc, onClose }: { doc: Row | null; onClose: () => void }) {
  const keyPoints = ((doc?.["ai_data"] as Row | null)?.["key_points"] as string[] | undefined) ?? [];
  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc?.["name"] as string}</DialogTitle>
        </DialogHeader>
        {doc?.["ai_summary"] && (
          <p className="rounded-xl bg-secondary p-4 text-sm">{doc["ai_summary"] as string}</p>
        )}
        {keyPoints.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {(doc?.["ai_notes"] as string | null) ?? "Aucune note générée."}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CoursesPage() {
  const { data: documents = [], isLoading } = useRows<Row>("documents", {
    order: { column: "created_at", ascending: false },
  });
  const { data: chapters = [] } = useRows<Row>("chapters");
  const subjects = useSubjectOptions();
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [notesDoc, setNotesDoc] = useState<Row | null>(null);
  const [viewDoc, setViewDoc] = useState<Row | null>(null);
  const queryClient = useQueryClient();

  const filtered = subjectFilter
    ? documents.filter((d) => d["subject_id"] === subjectFilter)
    : documents;



  async function removeDocument(doc: Row) {
    await supabase.storage.from("documents").remove([doc["storage_path"] as string]);
    const { error } = await supabase.from("documents").delete().eq("id", doc["id"] as string);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Document supprimé");
  }

  return (
    <AppShell
      title="Mes cours"
      description="Importez vos documents et rattachez-les à un chapitre."
      actions={
        <DocumentUpload
          trigger={
            <Button>
              <UploadCloud className="mr-2 size-4" />
              Importer un cours
            </Button>
          }
        />
      }
    >
      <div className="mb-5 max-w-xs">
        <OptionSelect
          allowEmpty
          value={subjectFilter}
          options={subjects}
          placeholder="Toutes les matières"
          onChange={setSubjectFilter}
        />
      </div>

      <NotesDialog doc={notesDoc} onClose={() => setNotesDoc(null)} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun document"
          text="Glissez-déposez vos PDF, DOCX, PPTX ou photos de cours : ils seront classés par matière et chapitre."
          action={<DocumentUpload trigger={<Button>Importer un document</Button>} />}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((doc) => {
            const subject = subjects.find((s) => s.value === doc["subject_id"]);
            const chapter = chapters.find((c) => c["id"] === doc["chapter_id"]);
            return (
              <div key={doc["id"] as string} className="surface flex flex-wrap items-center gap-4 p-4">
                <FileText className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate font-medium">{doc["name"] as string}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {subject && <Badge variant="outline">{subject.label}</Badge>}
                    {chapter && <Badge variant="outline">{chapter["title"] as string}</Badge>}
                    <Badge variant="secondary">
                      {DOC_KINDS.find((k) => k.value === doc["kind"])?.label}
                    </Badge>
                    <span>
                      {Math.max(1, Math.round(Number(doc["size_bytes"] ?? 0) / 1024))} Ko
                    </span>
                    {doc["ai_notes"] ? (
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => setNotesDoc(doc)}
                      >
                        Voir les notes IA
                      </button>
                    ) : (
                      <span>Pas encore analysé</span>
                    )}
                  </div>
                </div>
                <AiActions doc={doc} />
                <Button variant="ghost" size="icon" aria-label="Ouvrir" onClick={() => openDocument(doc)}>
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => removeDocument(doc)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
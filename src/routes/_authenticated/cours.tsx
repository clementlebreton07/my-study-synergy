import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { DocumentUpload } from "@/components/DocumentUpload";
import { EmptyState, OptionSelect, useSubjectOptions } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRows, type Row } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { DOC_KINDS } from "@/lib/study";

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

function CoursesPage() {
  const { data: documents = [], isLoading } = useRows<Row>("documents", {
    order: { column: "created_at", ascending: false },
  });
  const { data: chapters = [] } = useRows<Row>("chapters");
  const subjects = useSubjectOptions();
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const filtered = subjectFilter
    ? documents.filter((d) => d["subject_id"] === subjectFilter)
    : documents;

  async function openDocument(doc: Row) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc["storage_path"] as string, 60);
    if (error || !data) {
      toast.error("Fichier introuvable");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

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
              <div key={doc["id"] as string} className="surface flex items-center gap-4 p-4">
                <FileText className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
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
                    <span className="text-muted-foreground">Analyse IA : non activée</span>
                  </div>
                </div>
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
import { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, OptionSelect, useChapterOptions, useSubjectOptions } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { DOC_KINDS } from "@/lib/study";

const ACCEPTED = ".pdf,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.webp,.txt,.md";
const MAX_BYTES = 25 * 1024 * 1024;

export function DocumentUpload({
  trigger,
  defaultSubjectId,
  defaultChapterId,
}: {
  trigger: React.ReactNode;
  defaultSubjectId?: string | null;
  defaultChapterId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(defaultSubjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(defaultChapterId ?? null);
  const [kind, setKind] = useState("course");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const subjects = useSubjectOptions();
  const chapters = useChapterOptions(subjectId);
  const queryClient = useQueryClient();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} dépasse 25 Mo`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
  }

  async function upload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Session expirée");

      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type || undefined });
        if (storageError) throw storageError;

        const { error } = await supabase.from("documents").insert({
          user_id: userId,
          subject_id: subjectId,
          chapter_id: chapterId,
          name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          kind,
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries();
      toast.success(files.length > 1 ? "Documents importés" : "Document importé");
      setFiles([]);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import impossible");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un cours ou un document</DialogTitle>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragging ? "border-primary bg-accent" : "border-border"
          }`}
        >
          <UploadCloud className="size-6 text-primary" />
          <span className="text-sm font-medium">Glissez-déposez vos fichiers ici</span>
          <span className="text-xs text-muted-foreground">
            PDF, DOCX, PPTX, images — 25 Mo maximum par fichier
          </span>
          <input
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        {files.length > 0 && (
          <ul className="space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                <span className="truncate">{f.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles((prev) => prev.filter((_, index) => index !== i))}
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matière">
            <OptionSelect
              allowEmpty
              value={subjectId}
              options={subjects}
              onChange={(v) => {
                setSubjectId(v);
                setChapterId(null);
              }}
            />
          </Field>
          <Field label="Chapitre">
            <OptionSelect allowEmpty value={chapterId} options={chapters} onChange={setChapterId} />
          </Field>
          <Field label="Type de document">
            <OptionSelect value={kind} options={DOC_KINDS} onChange={(v) => setKind(v ?? "course")} />
          </Field>
        </div>

        <p className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
          L'analyse automatique par IA (résumé, fiche, flashcards) n'est pas encore activée : vos
          documents sont importés et classés, et seront analysables dès l'activation de l'IA.
        </p>

        <DialogFooter>
          <Button onClick={upload} disabled={files.length === 0 || uploading}>
            {uploading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
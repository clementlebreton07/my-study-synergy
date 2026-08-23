import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/lib/api";

function kindOf(doc: Row) {
  const name = String(doc["name"] ?? "").toLowerCase();
  const mime = String(doc["mime_type"] ?? "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif)$/.test(name)) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("text/") || /\.(txt|md|csv)$/.test(name)) return "text";
  return "other";
}

export function DocumentViewer({ doc, onClose }: { doc: Row | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setText(null);
    setError(null);
    if (!doc) return;
    (async () => {
      const { data, error: err } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc["storage_path"] as string, 3600);
      if (cancelled) return;
      if (err || !data) {
        setError("Fichier introuvable");
        return;
      }
      setUrl(data.signedUrl);
      if (kindOf(doc) === "text") {
        try {
          const res = await fetch(data.signedUrl);
          const body = await res.text();
          if (!cancelled) setText(body);
        } catch {
          if (!cancelled) setError("Lecture impossible");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  const kind = doc ? kindOf(doc) : "other";

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[96vw] overflow-hidden p-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{(doc?.["name"] as string) ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="h-[70vh] overflow-auto rounded-xl border border-border bg-secondary/40">
          {error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : !url ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : kind === "image" ? (
            <img src={url} alt={(doc?.["name"] as string) ?? "Document"} className="mx-auto max-w-full" />
          ) : kind === "pdf" ? (
            <iframe src={url} title={(doc?.["name"] as string) ?? "Document"} className="h-full w-full" />
          ) : kind === "text" ? (
            <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed">{text ?? "…"}</pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <p>Aperçu indisponible pour ce format.</p>
              <Button asChild variant="outline">
                <a href={url} target="_blank" rel="noopener">
                  <Download className="mr-2 size-4" />
                  Ouvrir le fichier
                </a>
              </Button>
            </div>
          )}
        </div>

        {url && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noopener">
                <Download className="mr-2 size-4" />
                Télécharger
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

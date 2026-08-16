import type { SupabaseClient } from "@supabase/supabase-js";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export async function callAI(system: string, content: string | Block[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Fonction IA indisponible : clé manquante.");

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
    }),
  });

  if (response.status === 429) throw new Error("Trop de requêtes IA, réessayez dans un instant.");
  if (response.status === 402) throw new Error("Crédits IA épuisés.");
  if (!response.ok) {
    const body = await response.text();
    console.error(`[AI] ${response.status}: ${body}`);
    throw new Error("L'IA n'a pas pu traiter ce contenu.");
  }

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("Réponse IA illisible, réessayez.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Downloads a stored document and turns it into AI-ready content blocks. */
export async function documentBlocks(
  supabase: SupabaseClient<any>,
  documentId: string,
): Promise<{ name: string; blocks: Block[]; subjectId: string | null; chapterId: string | null }> {
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, name, storage_path, mime_type, subject_id, chapter_id")
    .eq("id", documentId)
    .single();
  if (error || !doc) throw new Error("Document introuvable.");

  const file = await supabase.storage.from("documents").download(doc.storage_path as string);
  if (file.error || !file.data) throw new Error("Impossible de lire le fichier.");

  const buffer = new Uint8Array(await file.data.arrayBuffer());
  if (buffer.byteLength === 0) throw new Error("Ce fichier est vide.");

  const name = doc.name as string;
  const mime = (doc.mime_type as string | null) ?? "application/octet-stream";
  const blocks: Block[] = [];

  if (mime.startsWith("image/")) {
    blocks.push({ type: "image_url", image_url: { url: `data:${mime};base64,${toBase64(buffer)}` } });
  } else if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    blocks.push({
      type: "file",
      file: { filename: name, file_data: `data:application/pdf;base64,${toBase64(buffer)}` },
    });
  } else if (mime.startsWith("text/") || /\.(txt|md|csv)$/i.test(name)) {
    blocks.push({ type: "text", text: new TextDecoder().decode(buffer).slice(0, 120000) });
  } else {
    throw new Error(
      "Format non pris en charge par l'IA. Convertissez le fichier en PDF, image ou texte.",
    );
  }

  return {
    name,
    blocks,
    subjectId: (doc.subject_id as string | null) ?? null,
    chapterId: (doc.chapter_id as string | null) ?? null,
  };
}
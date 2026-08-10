import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/assistant.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant IA — StudyOS" },
      { name: "description", content: "Un coach d'études qui connaît vos matières, examens et tâches." },
      { property: "og:title", content: "Assistant IA — StudyOS" },
      { property: "og:description", content: "Plan de révision, explications et quiz personnalisés." },
    ],
  }),
  component: AssistantPage,
});

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Fais-moi un plan de révision pour la semaine.",
  "Quels chapitres dois-je travailler en priorité ?",
  "Pose-moi 5 questions de quiz sur mon prochain examen.",
];

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const ask = useServerFn(askAssistant);

  const mutation = useMutation({
    mutationFn: (next: Message[]) => ask({ data: { messages: next } }),
    onSuccess: (result) =>
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]),
    onError: (error: Error) => toast.error(error.message),
  });

  function send(text: string) {
    const value = text.trim();
    if (!value || mutation.isPending) return;
    const next: Message[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  }

  return (
    <AppShell title="Assistant IA" description="Il connaît vos matières, vos examens et vos tâches.">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && (
          <div className="surface p-6 text-center">
            <Sparkles className="mx-auto size-6 text-primary" />
            <p className="mt-3 font-medium">Comment puis-je vous aider à réviser ?</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                : "surface max-w-[90%] whitespace-pre-wrap p-4 text-sm"
            }
          >
            {message.content}
          </div>
        ))}

        {mutation.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> L'assistant réfléchit…
          </p>
        )}

        <div className="sticky bottom-4 flex items-end gap-2 rounded-2xl border border-border bg-card p-2">
          <Textarea
            value={input}
            maxLength={2000}
            rows={2}
            placeholder="Posez votre question…"
            className="min-h-0 resize-none border-0 focus-visible:ring-0"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button size="icon" aria-label="Envoyer" onClick={() => send(input)} disabled={mutation.isPending}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
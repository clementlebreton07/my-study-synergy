import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile, useSaveProfile } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — StudyOS" },
      { name: "description", content: "Réglez votre objectif de travail quotidien et vos préférences." },
      { property: "og:title", content: "Paramètres — StudyOS" },
      { property: "og:description", content: "Personnalisez votre espace d'étude." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useProfile();
  const save = useSaveProfile();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(120);

  useEffect(() => {
    if (!profile) return;
    setName((profile["full_name"] as string) ?? "");
    setGoal(Number(profile["daily_goal_minutes"] ?? 120));
  }, [profile]);

  return (
    <AppShell title="Paramètres" description="Votre profil et vos préférences.">
      <div className="surface max-w-xl space-y-5 p-6">
        <Field label="Adresse e-mail">
          <Input value={(profile?.["email"] as string) ?? ""} disabled />
        </Field>
        <Field label="Nom affiché">
          <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Objectif de travail quotidien (minutes)">
          <Input
            type="number"
            min={15}
            max={720}
            step={15}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                full_name: name.trim() || null,
                daily_goal_minutes: Math.min(720, Math.max(15, goal || 120)),
              })
            }
          >
            Enregistrer
          </Button>
          <Button variant="outline" onClick={toggle}>
            Passer en thème {theme === "dark" ? "clair" : "sombre"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
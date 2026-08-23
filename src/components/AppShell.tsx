import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  GraduationCap,
  Home,
  Layers,
  LineChart,
  LogOut,
  Menu,
  Moon,
  PencilRuler,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/tableau-de-bord", label: "Accueil", icon: Home },
  { to: "/cours", label: "Mes cours", icon: FileText },
  { to: "/matieres", label: "Mes matières", icon: BookOpen },
  { to: "/taches", label: "Tâches", icon: CheckSquare },
  { to: "/planning", label: "Planning", icon: CalendarDays },
  { to: "/revisions", label: "Révisions", icon: Layers },
  { to: "/assistant", label: "Assistant IA", icon: Sparkles },
] as const;

export const NAV_MORE = [
  { to: "/quiz", label: "Quiz & examens blancs", icon: Target },
  { to: "/exercices", label: "Exercices", icon: PencilRuler },
  { to: "/examens", label: "Examens", icon: Trophy },
  { to: "/syllabus", label: "Syllabus & moyenne", icon: ScrollText },
  { to: "/progression", label: "Progression", icon: LineChart },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [showMore, setShowMore] = useState(
    NAV_MORE.some((item) => pathname === item.to || pathname.startsWith(item.to + "/")),
  );

  const renderItem = (item: { to: string; label: string; icon: typeof Home }) => {
    const active = pathname === item.to || pathname.startsWith(item.to + "/");
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        <item.icon className="size-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(renderItem)}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent"
      >
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", showMore && "rotate-180")} />
        Plus d'outils
      </button>
      {showMore && NAV_MORE.map(renderItem)}
    </nav>
  );
}


export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: profile } = useProfile();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/tableau-de-bord" className="flex items-center gap-2 px-1">
        <span className="gradient-hero flex size-9 items-center justify-center rounded-xl">
          <GraduationCap className="size-5 text-primary-foreground" />
        </span>
        <span className="font-display text-lg font-semibold">StudyOS</span>
      </Link>
      <NavLinks onNavigate={() => setOpen(false)} />
      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        <p className="truncate px-1 text-xs text-muted-foreground">{profile?.email}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={toggle}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="ml-2">{theme === "dark" ? "Clair" : "Sombre"}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Se déconnecter">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
            {description && (
              <p className="truncate text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
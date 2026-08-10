export const MASTERY = [
  { value: "not_started", label: "Non commencé", weight: 0 },
  { value: "discovery", label: "Découverte", weight: 25 },
  { value: "learning", label: "En apprentissage", weight: 50 },
  { value: "understood", label: "Compris", weight: 75 },
  { value: "mastered", label: "Maîtrisé", weight: 100 },
] as const;

export const masteryLabel = (value: string) =>
  MASTERY.find((m) => m.value === value)?.label ?? "Non commencé";
export const masteryWeight = (value: string) =>
  MASTERY.find((m) => m.value === value)?.weight ?? 0;

export const TASK_STATUS = [
  { value: "todo", label: "À faire" },
  { value: "doing", label: "En cours" },
  { value: "done", label: "Terminée" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Faible" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Importante" },
  { value: "urgent", label: "Urgente" },
] as const;

export const priorityLabel = (v: string) => PRIORITIES.find((p) => p.value === v)?.label ?? v;

export const EXERCISE_STATUS = [
  { value: "todo", label: "À faire" },
  { value: "doing", label: "En cours" },
  { value: "success", label: "Réussi" },
  { value: "review", label: "À revoir" },
] as const;

export const DIFFICULTIES = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Moyen" },
  { value: "hard", label: "Difficile" },
] as const;

export const IMPORTANCE = [
  { value: "low", label: "Faible" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Majeure" },
] as const;

export const EVENT_KINDS = [
  { value: "course", label: "Cours" },
  { value: "session", label: "Session de travail" },
  { value: "homework", label: "Devoir" },
  { value: "other", label: "Autre" },
] as const;

export const DOC_KINDS = [
  { value: "course", label: "Cours" },
  { value: "exercise", label: "Exercices" },
  { value: "sheet", label: "Fiche" },
  { value: "other", label: "Autre" },
] as const;

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function toISODate(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

export const today = () => toISODate(new Date());

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date: Date) {
  return addDays(date, -weekdayIndex(date));
}

export function daysUntil(isoDate: string) {
  const target = new Date(isoDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
    new Date(iso + "T00:00:00"),
  );
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${String(m).padStart(2, "0")}`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function hhmm(time?: string | null) {
  return time ? time.slice(0, 5) : "";
}

export function minutesFromTime(time: string) {
  const parts = time.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

export function timeFromMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
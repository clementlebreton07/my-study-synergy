import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRows, type Row } from "@/lib/api";

export const NONE = "__none__";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 p-10 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function OptionSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner",
  allowEmpty,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value={NONE}>Aucune</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function useSubjectOptions() {
  const { data } = useRows<Row>("subjects", { order: { column: "name" } });
  return (data ?? []).map((s) => ({ value: s["id"] as string, label: s["name"] as string }));
}

export function useChapterOptions(subjectId?: string | null) {
  const { data } = useRows<Row>("chapters", { order: { column: "position" } });
  return (data ?? [])
    .filter((c) => !subjectId || c["subject_id"] === subjectId)
    .map((c) => ({ value: c["id"] as string, label: c["title"] as string }));
}

export function ColorDot({ color }: { color?: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
    />
  );
}
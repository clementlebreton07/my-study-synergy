import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TableName =
  | "profiles"
  | "subjects"
  | "chapters"
  | "documents"
  | "exercises"
  | "tasks"
  | "exams"
  | "events"
  | "availabilities"
  | "study_sessions"
  | "notes"
  | "flashcards";

export type Row = Record<string, any>;

type ListOptions = {
  order?: { column: string; ascending?: boolean };
  eq?: Record<string, string | number | boolean | null | undefined>;
  enabled?: boolean;
};

export function useRows<T = Row>(table: TableName, options: ListOptions = {}) {
  const { order, eq, enabled = true } = options;
  return useQuery({
    queryKey: [table, eq ?? null, order ?? null],
    enabled,
    queryFn: async (): Promise<T[]> => {
      let query = (supabase.from(table as any) as any).select("*");
      if (eq) {
        for (const [key, value] of Object.entries(eq)) {
          if (value === undefined) continue;
          query = query.eq(key, value);
        }
      }
      if (order) query = query.order(order.column, { ascending: order.ascending ?? true });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Session expirée, reconnectez-vous.");
  return data.user.id;
}

export function useSaveRow(table: TableName, successMessage = "Enregistré") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const user_id = await currentUserId();
      const payload: Row = { ...values, user_id };
      const existingId = payload["id"] as string | undefined;
      if (existingId) {
        const rest = { ...payload };
        delete rest["id"];
        const { error } = await (supabase.from(table as any) as any)
          .update(rest)
          .eq("id", existingId);
        if (error) throw error;
        return existingId;
      }
      const { data, error } = await (supabase.from(table as any) as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRow(table: TableName, successMessage = "Supprimé") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return { ...data, email: auth.user.email as string };
      const inserted = await supabase
        .from("profiles")
        .insert({ id: auth.user.id, first_name: auth.user.email?.split("@")[0] ?? null })
        .select("*")
        .single();
      if (inserted.error) throw inserted.error;
      return { ...inserted.data, email: auth.user.email as string };
    },
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const id = await currentUserId();
      const { error } = await (supabase.from("profiles") as any).update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Préférences enregistrées");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

import { supabase } from "@/integrations/supabase/client";

export type Analysis = {
  id: string;
  user_id: string;
  file_name: string;
  original_path: string;
  mask_path: string | null;
  status: string;
  model_name: string;
  notes: string | null;
  created_at: string;
};

export async function listAnalyses(): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Analysis[];
}

export async function signedUrl(path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("ct-scans").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteAnalysis(analysis: Analysis): Promise<void> {
  const paths = [analysis.original_path, analysis.mask_path].filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("ct-scans").remove(paths);
  const { error } = await supabase.from("analyses").delete().eq("id", analysis.id);
  if (error) throw error;
}

export async function getProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: data?.email ?? user.email ?? "",
    fullName:
      data?.full_name ??
      (user.user_metadata?.["full_name"] as string | undefined) ??
      (user.user_metadata?.["name"] as string | undefined) ??
      "",
    createdAt: data?.created_at ?? user.created_at,
  };
}

export async function updateFullName(fullName: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: fullName, email: user.email ?? null });
  if (error) throw error;
  await supabase.auth.updateUser({ data: { full_name: fullName } });
}

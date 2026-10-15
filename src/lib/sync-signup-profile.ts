import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { syncLanguageFromProfile } from "@/services/language";

type SignUpMeta = {
  first_name?: string;
  last_name?: string;
  country?: string;
  language?: string;
};

/** Copy sign-up metadata into profiles when the row is still missing names. */
export async function syncSignupProfileFromMetadata(user: User): Promise<void> {
  const meta = user.user_metadata as SignUpMeta;
  const firstName = meta.first_name?.trim();
  const lastName = meta.last_name?.trim();
  const country = meta.country?.trim();
  const language = meta.language?.trim();
  if (!firstName && !lastName && !country && !language) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, country, language, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const row = profile as {
    first_name?: string | null;
    last_name?: string | null;
    country?: string | null;
    language?: string | null;
    display_name?: string | null;
  } | null;

  const patch: Record<string, string> = {};
  if (firstName && !row?.first_name?.trim()) patch.first_name = firstName;
  if (lastName && !row?.last_name?.trim()) patch.last_name = lastName;
  // country is NOT written from the client: it sets the member's tier floor, so
  // it is backend-only (schema/188 revoked the column grant; a write here would
  // be refused). The platform backend's signup sync stamps it with service_role.
  if (language && !row?.language?.trim()) patch.language = language;

  const resolvedFirst = patch.first_name ?? row?.first_name?.trim() ?? "";
  const resolvedLast = patch.last_name ?? row?.last_name?.trim() ?? "";
  const displayName = `${resolvedFirst} ${resolvedLast}`.trim();
  if (displayName && !row?.display_name?.trim()) {
    patch.display_name = displayName;
  }

  if (Object.keys(patch).length === 0) return;

  await supabase.from("profiles").update(patch as never).eq("id", user.id);

  if (patch.language) {
    await syncLanguageFromProfile(patch.language);
  }
}

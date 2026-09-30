import { createClient } from "@/lib/supabase/server";
import { authDestination } from "@/lib/auth-redirects";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = type === "recovery" ? "/auth/update-password" : authDestination(searchParams.get("next"));
  const supabase = await createClient();
  if (token_hash && (type === "email" || type === "signup" || type === "recovery" || type === "invite" || type === "email_change" || type === "magiclink")) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }
  redirect("/auth/error");
}

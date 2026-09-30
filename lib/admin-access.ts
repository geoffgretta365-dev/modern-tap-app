import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function adminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.MODERNTAP_ADMIN_USER_IDS ?? "")
    .split(",").map(id => id.trim()).filter(Boolean);
  return Boolean(user && allowed.includes(user.id));
}

export async function adminDenied() {
  return await adminAccess() ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

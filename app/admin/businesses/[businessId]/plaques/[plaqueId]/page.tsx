export const instant = false;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditPlaqueForm } from "../../edit-forms";

export default async function AdminPlaquePage({
  params,
}: {
  params: Promise<{ businessId: string; plaqueId: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const adminUserIds = (process.env.MODERNTAP_ADMIN_USER_IDS ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  if (!adminUserIds.includes(user.id)) redirect("/dashboard");

  const { businessId, plaqueId } = await params;
  const admin = createAdminClient();
  const { data: business, error: businessError } = await admin
    .from("businesses").select("id, name").eq("id", businessId).maybeSingle();
  if (businessError) throw businessError;
  if (!business) notFound();

  const { data: plaque, error: plaqueError } = await admin
    .from("plaques")
    .select("id, name, code, destination_url, active, created_at")
    .eq("id", plaqueId).eq("business_id", businessId).maybeSingle();
  if (plaqueError) throw plaqueError;
  if (!plaque) notFound();

  const { count, error: tapsError } = await admin
    .from("tap_events").select("id", { count: "exact", head: true })
    .eq("plaque_id", plaque.id);
  if (tapsError) throw tapsError;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href={`/admin/businesses/${business.id}#plaques`}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Back to {business.name}
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Manage Plaque</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{plaque.name}</h1>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Tap Path</dt><dd className="mt-1 font-mono text-slate-900">/t/{plaque.code}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-semibold text-slate-900">{plaque.active ? "Active" : "Inactive"}</dd></div>
            <div><dt className="text-slate-500">Total Taps</dt><dd className="mt-1 font-semibold text-slate-900">{(count ?? 0).toLocaleString("en-US")}</dd></div>
            <div><dt className="text-slate-500">Created</dt><dd className="mt-1 text-slate-900">{new Date(plaque.created_at).toLocaleDateString("en-US")}</dd></div>
          </dl>
          <EditPlaqueForm businessId={business.id} plaqueId={plaque.id}
            initialName={plaque.name} initialDestination={plaque.destination_url} />
        </div>
      </div>
    </main>
  );
}

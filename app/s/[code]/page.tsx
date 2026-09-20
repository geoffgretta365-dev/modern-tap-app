export const instant = false;

import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function SmartPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createAdminClient();
  const { data: plaque, error: plaqueError } = await supabase
    .from("plaques")
    .select("id, destination_url")
    .eq("code", code)
    .eq("active", true)
    .eq("mode", "smart_page")
    .maybeSingle();

  if (plaqueError) {
    console.error("Public Smart Page plaque lookup failed", { code: plaqueError.code });
    notFound();
  }
  if (!plaque) notFound();

  const fallback = safeHttpUrl(plaque.destination_url);
  const { data: page, error: pageError } = await supabase
    .from("smart_pages")
    .select("id, heading, subheading")
    .eq("plaque_id", plaque.id)
    .maybeSingle();

  if (pageError) {
    console.error("Public Smart Page lookup failed", { code: pageError.code });
    if (fallback) redirect(fallback);
    notFound();
  }
  if (!page) {
    if (fallback) redirect(fallback);
    notFound();
  }

  const { data: buttons, error: buttonsError } = await supabase
    .from("smart_page_buttons")
    .select("id, label, destination_url")
    .eq("smart_page_id", page.id)
    .eq("enabled", true)
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (buttonsError) {
    console.error("Public Smart Page buttons lookup failed", { code: buttonsError.code });
    if (fallback) redirect(fallback);
    notFound();
  }

  const usableButtons = (buttons ?? []).flatMap((button) => {
    const href = safeHttpUrl(button.destination_url);
    return href ? [{ id: button.id, label: button.label, href }] : [];
  });

  if (usableButtons.length === 0) {
    if (fallback) redirect(fallback);
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-center text-sm font-bold tracking-wide text-slate-500">ModernTap</p>
        {page.heading ? (
          <h1 className="mt-5 text-center text-3xl font-bold tracking-tight">{page.heading}</h1>
        ) : null}
        {page.subheading ? (
          <p className="mt-3 text-center text-sm leading-6 text-slate-600">{page.subheading}</p>
        ) : null}
        <div className="mt-8 space-y-3">
          {usableButtons.map((button) => (
            <a
              key={button.id}
              href={button.href}
              className="block rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {button.label}
            </a>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">Powered by ModernTap</p>
      </div>
    </main>
  );
}

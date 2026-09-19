import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/app-shell";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-slate-950">
            ModernTap
          </h1>

          <p className="mt-2 text-slate-500">
            No business found for this account.
          </p>
        </div>
      </AppShell>
    );
  }

  const { data: plaques } = await supabase
    .from("plaques")
    .select("id, name, code, destination_url, active")
    .eq("business_id", business.id);

  const plaqueIds = plaques?.map((plaque) => plaque.id) ?? [];

  let tapEvents: {
    plaque_id: string;
    created_at: string;
  }[] = [];

  if (plaqueIds.length > 0) {
    const { data } = await supabase
      .from("tap_events")
      .select("plaque_id, created_at")
      .in("plaque_id", plaqueIds);

    tapEvents = data ?? [];
  }

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const totalTaps = tapEvents.length;

  const todayTaps = tapEvents.filter(
    (tap) => new Date(tap.created_at) >= startOfToday
  ).length;

  const weekTaps = tapEvents.filter(
    (tap) => new Date(tap.created_at) >= sevenDaysAgo
  ).length;

  const activePlaques =
    plaques?.filter((plaque) => plaque.active).length ?? 0;

  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Overview
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Welcome back
            </h1>

            <p className="mt-2 text-slate-500">
              Here&apos;s how {business.name} is performing.
            </p>
          </div>

          <Link
            href="/plaques"
            className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Manage Plaques
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Taps"
            value={totalTaps}
            detail="All-time engagement"
          />

          <StatCard
            title="Today"
            value={todayTaps}
            detail="Taps since midnight"
          />

          <StatCard
            title="Last 7 Days"
            value={weekTaps}
            detail="Recent engagement"
          />

          <StatCard
            title="Active Plaques"
            value={activePlaques}
            detail={`${plaques?.length ?? 0} total plaques`}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Plaque Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Live tap totals across your smart plaques.
                </p>
              </div>

              <Link
                href="/plaques"
                className="text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                View all →
              </Link>
            </div>

            <div className="mt-6 divide-y divide-slate-100">

              {plaques?.map((plaque) => {
                const plaqueTaps = tapEvents.filter(
                  (tap) => tap.plaque_id === plaque.id
                ).length;

                return (
                  <div
                    key={plaque.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">

                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {plaque.name}
                        </p>

                        <span
                          className={`h-2 w-2 rounded-full ${
                            plaque.active
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }`}
                        />
                      </div>

                      <p className="mt-1 truncate text-sm text-slate-400">
                        /t/{plaque.code}
                      </p>

                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold tracking-tight text-slate-950">
                        {plaqueTaps}
                      </p>

                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        taps
                      </p>
                    </div>
                  </div>
                );
              })}

              {(!plaques || plaques.length === 0) && (
                <div className="py-10 text-center text-sm text-slate-500">
                  No plaques yet.
                </div>
              )}

            </div>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">

            <p className="text-sm font-semibold text-slate-400">
              QUICK START
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Grow your tap network.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Add another plaque, choose its destination, and start
              tracking engagement immediately.
            </p>

            <Link
              href="/plaques/new"
              className="mt-8 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              + Add New Plaque
            </Link>

          </section>

        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {detail}
      </p>

    </div>
  );
}
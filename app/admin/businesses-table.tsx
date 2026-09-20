"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminBusinessRow = {
  id: string;
  name: string;
  created_at: string;
  status: string | null;
  stripe_price_id: string | null;
  stripe_customer_id: string | null;
};

type Filter = "all" | "active" | "trialing" | "past_due" | "none" | "inactive";
type Sort = "newest" | "oldest" | "name";
const pageSize = 25;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past Due" },
  { value: "none", label: "No Subscription" },
  { value: "inactive", label: "Canceled / Inactive" },
];

function matchesFilter(status: string | null, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "none") return status === null;
  if (filter === "inactive") {
    return status !== null && !["active", "trialing", "past_due"].includes(status);
  }
  return status === filter;
}

export default function BusinessesTable({
  businesses,
  modernTapPriceId,
}: {
  businesses: AdminBusinessRow[];
  modernTapPriceId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);

  const searched = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return businesses.filter((business) =>
      !query || [business.name, business.id, business.stripe_customer_id ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(query))
    );
  }, [businesses, search]);

  const filtered = useMemo(() => {
    const rows = searched.filter((business) => matchesFilter(business.status, filter));
    rows.sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name, "en-US", { sensitivity: "base" }) ||
          a.id.localeCompare(b.id);
      }
      const dateOrder = a.created_at.localeCompare(b.created_at);
      return (sort === "newest" ? -dateOrder : dateOrder) || a.id.localeCompare(b.id);
    });
    return rows;
  }, [searched, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block w-full max-w-md text-sm font-medium text-slate-700">
          Search businesses
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Name, business ID, or Stripe customer ID"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Sort by
          <select
            value={sort}
            onChange={(event) => { setSort(event.target.value as Sort); setPage(1); }}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Business Name A–Z</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Subscription filters">
        {filters.map((item) => {
          const count = searched.filter((business) => matchesFilter(business.status, item.value)).length;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => { setFilter(item.value); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === item.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.label} <span className="ml-1 opacity-75">{count}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-sm text-slate-500" role="status">
        {filtered.length.toLocaleString("en-US")} matching {filtered.length === 1 ? "business" : "businesses"}
      </p>
      {visible.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          {businesses.length ? "No businesses match these search and filter settings." : "No businesses yet."}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Business</th>
                <th className="px-3 py-3">Subscription</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((business) => {
                const status = business.status;
                const statusClass = status === "active" || status === "trialing"
                  ? "bg-emerald-50 text-emerald-700"
                  : status === "past_due"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-700";
                const isModernTapMonthly = Boolean(
                  modernTapPriceId && business.stripe_price_id === modernTapPriceId
                );
                const href = `/admin/businesses/${business.id}`;
                return (
                  <tr key={business.id} className="text-slate-600">
                    <td className="px-3 py-4 font-semibold">
                      <Link href={href} className="text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-600 hover:decoration-slate-500">
                        {business.name}
                      </Link>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
                        {status ? status.replaceAll("_", " ") : "No subscription"}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {isModernTapMonthly ? (
                        <><span className="block font-semibold text-slate-900">ModernTap Monthly</span><span className="text-xs text-slate-500">$29.99/month</span></>
                      ) : business.stripe_price_id ? (
                        <><span className="block text-slate-700">Other Stripe price</span><span className="break-all font-mono text-xs text-slate-500">{business.stripe_price_id}</span></>
                      ) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      {new Date(business.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Link href={href} className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-slate-600">
                        View Business
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > pageSize ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-3">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
            <span>Page {currentPage} of {pageCount}</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

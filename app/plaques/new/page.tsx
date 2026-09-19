export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewPlaqueForm from "./new-plaque-form";

export default async function NewPlaquePage() {
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
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/plaques"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back to My Plaques
        </Link>

        <div className="mt-6 rounded-xl border bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">
            MODERNTAP
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Add Plaque
          </h1>

          <p className="mt-2 text-gray-500">
            Create a new smart plaque for {business.name}.
          </p>

          <NewPlaqueForm businessId={business.id} />
        </div>
      </div>
    </main>
  );
}
import { NextResponse } from "next/server";
import { adminDenied } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const denied = await adminDenied();
  if (denied) return denied;
  let input;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).some(key => !["reviews", "rating"].includes(key))
    || !(input.reviews === null || (Number.isInteger(input.reviews) && input.reviews >= 0 && input.reviews <= 2147483647))
    || !(input.rating === null || (typeof input.rating === "number" && Number.isFinite(input.rating) && input.rating >= 1 && input.rating <= 5))) {
    return NextResponse.json({ error: "Enter a non-negative whole review count and a star rating from 1 to 5, or leave either blank." }, { status: 400 });
  }
  const { businessId } = await params;
  const { data, error } = await createAdminClient().from("businesses")
    .update({ pilot_reviews_end: input.reviews, pilot_rating_end: input.rating })
    .eq("id", businessId).eq("is_pilot", true).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save review results." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Pilot business not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return <Card><CardHeader><CardTitle className="text-2xl">This link couldn’t be completed.</CardTitle></CardHeader><CardContent>
    <p className="text-sm leading-6 text-slate-600">It may have expired or already been used. For confirmation links, try the browser where you created your account, or sign in if you already confirmed your email.</p>
    <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-[#0f766e]"><Link className="underline" href="/auth/login">Sign in</Link><Link className="underline" href="/auth/forgot-password">Request a new password reset</Link></div>
  </CardContent></Card>;
}

"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const submissionPending = useRef(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionPending.current) return;
    submissionPending.current = true;
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      submissionPending.current = false;
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) {
        setError(error.code === "user_already_exists" || error.code === "email_exists"
          ? "An account with this email may already exist. Try signing in instead."
          : error.code === "weak_password"
            ? "Please choose a stronger password and try again."
            : error.code === "email_address_invalid"
              ? "Please enter a valid email address."
              : error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit"
                ? "Please wait a moment before trying again."
                : "We couldn't create your account. Please try again.");
        return;
      }
      router.push("/auth/sign-up-success");
    } catch {
      setError("We couldn't create your account. Please try again.");
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="min-w-0 rounded-2xl border-[#dbe4ea] bg-white text-[#17324d] shadow-sm">
        <CardHeader className="p-5 sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight">Create Your Account</h1>
          <CardDescription className="leading-6 text-slate-600">Set up your ModernTap account to manage your business.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-7 sm:pt-0">
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  autoComplete="email"
                  className="h-12 min-w-0 rounded-xl border-[#dbe4ea] text-slate-900 focus-visible:ring-[#0f8f8a]"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-12 min-w-0 rounded-xl border-[#dbe4ea] text-slate-900 focus-visible:ring-[#0f8f8a]"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Confirm Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-12 min-w-0 rounded-xl border-[#dbe4ea] text-slate-900 focus-visible:ring-[#0f8f8a]"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <button type="button" aria-controls="password repeat-password" aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                onClick={() => setShowPasswords((visible) => !visible)}
                className="-mt-3 min-h-11 self-start rounded-lg px-2 text-xs font-semibold text-[#0f8f8a] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">
                {showPasswords ? "Hide" : "Show"} passwords
              </button>
              {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl bg-[#17324d] font-semibold text-white hover:bg-[#244560] focus-visible:ring-[#16c7c0] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">You may need to confirm your email before setting up your business.</p>
            <div className="mt-6 text-center text-sm text-slate-600">
              Already have a ModernTap account?{" "}
              <Link href="/auth/login" className="font-semibold text-[#0f8f8a] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

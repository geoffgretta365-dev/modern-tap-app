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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submissionPending = useRef(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionPending.current) return;
    submissionPending.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.code === "invalid_credentials"
          ? "Email or password is incorrect."
          : error.code === "email_not_confirmed"
            ? "Please confirm your email before signing in."
            : "We couldn't sign you in. Please try again.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Could not load your account.");
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) throw businessError;

      router.push(business ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch {
      setError("We couldn't sign you in. Please try again.");
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="min-w-0 rounded-2xl border-[#dbe4ea] bg-white text-[#17324d] shadow-sm">
        <CardHeader className="p-5 sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
          <CardDescription className="leading-6 text-slate-600">
            Sign in to manage your ModernTap account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-7 sm:pt-0">
          <form onSubmit={handleLogin}>
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
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-[#0f8f8a] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-12 min-w-0 rounded-xl border-[#dbe4ea] pr-16 text-slate-900 focus-visible:ring-[#0f8f8a]"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" aria-controls="password" aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-1 right-1 min-w-12 rounded-lg px-2 text-xs font-semibold text-[#0f8f8a] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl bg-[#17324d] font-semibold text-white hover:bg-[#244560] focus-visible:ring-[#16c7c0] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-slate-600">
              New to ModernTap?{" "}
              <Link
                href="/auth/sign-up"
                className="font-semibold text-[#0f8f8a] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
              >
                Create Account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

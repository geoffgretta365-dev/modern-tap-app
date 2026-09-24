import Image from "next/image";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-[#f3f7f9] px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full min-w-0 max-w-md">
        <header className="mb-6 text-center">
          <Image src="/modern-tap-logo.png" alt="ModernTap" width={2172} height={724}
            sizes="208px" priority className="mx-auto h-auto w-52 max-w-full" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f8f8a]">Business Portal</p>
        </header>
        <SignUpForm />
        <p className="mx-auto mt-6 max-w-sm px-2 text-center text-xs leading-6 text-slate-500">
          Manage plaques, Smart Pages, analytics, design requests, replacements, and billing from one account.
        </p>
      </div>
    </main>
  );
}

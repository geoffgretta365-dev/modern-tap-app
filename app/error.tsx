"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f8fcfd] p-5 text-[#0f172a]">
    <div className="mt-panel w-full max-w-lg p-8 text-center">
      <p className="mt-kicker">ModernTap</p>
      <h1 className="mt-3 text-2xl font-bold text-[#17324d]">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-600">Please try again. If the issue continues, contact support.</p>
      <button onClick={reset} className="mt-primary-action mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">Try again</button>
    </div>
  </main>;
}

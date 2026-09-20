import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight">
            ModernTap
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Log in
            </Link>

            <Link
              href="/auth/sign-up"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center lg:px-8 lg:py-32">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Tap. Connect. Track.
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Smarter plaques for modern businesses.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          ModernTap gives your business tap-enabled plaques with
          destinations you can update anytime, built-in analytics,
          and simple management from one dashboard.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/sign-up"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950"
          >
            Create Your Account
          </Link>

          <Link
            href="/auth/login"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white"
          >
            Customer Login
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-24 md:grid-cols-3 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold">
            Change destinations anytime
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Update where a plaque sends customers without replacing
            or reprogramming the physical plaque.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold">
            Track customer taps
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            See tap activity and performance from your ModernTap
            analytics dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold">
            Manage everything in one place
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Manage plaques, support, replacements, billing, and
            analytics from one account.
          </p>
        </div>
      </section>
    </main>
  );
}
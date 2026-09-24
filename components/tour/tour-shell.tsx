"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import ActionContent from "@/components/smart-page/action-content";
import { DEMO_ACTIONS, DEMO_ACTIVITY, DEMO_BUSINESS, DEMO_DAYS, DEMO_PLAQUES } from "@/lib/demo/fixtures";

const steps = [
  ["Dashboard", "Everything in one place", "See your plaques and customer activity as soon as you log in."],
  ["Plaques", "Change destinations anytime", "Your physical plaque stays the same, even when its destination changes."],
  ["Analytics", "Understand how customers interact", "See which plaques get used, when customers engage, and what actions they choose."],
  ["Smart Page", "One tap. Your customer's next action.", "You control the page, branding, buttons, and destinations."],
];
export default function TourShell() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string>("menu");
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [destination, setDestination] = useState<string>(DEMO_PLAQUES[2].destination);
  const [period, setPeriod] = useState<7 | 14>(7);
  const [activity, setActivity] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const title = useRef<HTMLHeadingElement>(null);
  const selectedPlaque = DEMO_PLAQUES.find(p => p.id === selected)!;
  function move(next: number) { setStep(next); setMessage(""); requestAnimationFrame(() => title.current?.focus()); }
  function choose(id: string) { const plaque = DEMO_PLAQUES.find(p => p.id === id)!; setSelected(id); setDestination(destinations[id] ?? plaque.destination); setMessage(""); }
  return <main className="min-h-svh bg-[#f3f7f9] px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between gap-4"><p className="mt-kicker">ModernTap · Quick Tour</p><Link href="/billing" className="text-sm font-semibold text-[#0f766e] underline">Skip Tour</Link></header>
      <ol aria-label="Tour progress" className="mt-6 grid grid-cols-4 gap-2">{steps.map(([label], i) => <li key={label} aria-current={step === i ? "step" : undefined} className={`border-t-4 pt-2 text-xs sm:text-sm ${i <= step ? "border-[#0f8f8a] text-[#17324d]" : "border-slate-200 text-slate-500"}`}>{i + 1}. {label}</li>)}</ol>
      <h1 ref={title} tabIndex={-1} className="mt-7 text-3xl font-bold text-[#17324d] outline-none">{steps[step][0]}</h1>
      <div className="mt-4 border-l-4 border-[#0f8f8a] pl-4"><h2 className="text-lg font-semibold text-[#17324d]">{steps[step][1]}</h2><p className="mt-1 text-sm text-slate-600">{steps[step][2]}</p></div>
      <div className="mt-6 rounded-2xl border border-[#dbe4ea] bg-white p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-[#17324d]">{DEMO_BUSINESS}</h2><span className="rounded-full bg-[#dffaf8] px-3 py-1 text-xs text-[#0f766e]">Fictional demo · no live changes</span></div>
        {step === 0 && <>
          <div className="grid grid-cols-1 gap-3 rounded-xl p-2 ring-2 ring-[#0f8f8a]/30 sm:grid-cols-3">{[["Active plaques", 6], ["Taps this week", 280], ["Smart Page actions", 96]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f3f7f9] p-4"><p className="text-xs text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-[#17324d]">{value}</p></div>)}</div>
          <div className="mt-6 flex gap-2" role="group" aria-label="Demo overview"><button aria-pressed={!activity} onClick={() => setActivity(false)} className="mt-secondary-action">My Plaques</button><button aria-pressed={activity} onClick={() => setActivity(true)} className="mt-secondary-action">Recent Activity</button></div>
          <div className="mt-4 min-h-44">{activity ? DEMO_ACTIVITY.map((text, i) => <p key={text} className="border-b py-3 text-sm">{text}<span className="block text-xs text-slate-500">{i + 1} minutes ago · example</span></p>) : DEMO_PLAQUES.slice(0, 3).map(p => <button key={p.id} onClick={() => { choose(p.id); move(1); }} className="flex w-full items-center justify-between border-b py-4 text-left text-sm"><span>{p.name}<span className="block text-xs text-slate-500">{p.mode} · Active</span></span><span className="text-[#0f766e]">Explore →</span></button>)}</div>
        </>}
        {step === 1 && <div className="grid items-start gap-5 md:grid-cols-2">
          <div className="grid gap-2">{DEMO_PLAQUES.map(p => <button type="button" key={p.id} aria-pressed={selected === p.id} onClick={() => choose(p.id)} className={`min-w-0 rounded-xl border p-4 text-left ${selected === p.id ? "border-[#0f8f8a] bg-[#f0fdfa] ring-2 ring-[#0f8f8a]/20" : "border-slate-200"}`}><span className="font-semibold">{p.name}</span><span className="mt-1 block text-xs text-[#0f766e]">{p.mode} · Active</span><span className="mt-2 block break-all text-xs text-slate-500">{destinations[p.id] ?? p.destination}</span></button>)}</div>
          <form className="rounded-xl bg-[#f0fdfa] p-5 ring-2 ring-[#0f8f8a]/30" onSubmit={event => { event.preventDefault(); setDestinations(prev => ({ ...prev, [selected]: destination })); setMessage("Demo destination updated. The physical plaque stays the same."); }}>
            <p className="mt-kicker">Try it · local demo</p><h3 className="mt-2 text-xl font-bold">{selectedPlaque.name}</h3><p className="mt-2 text-sm text-slate-600">{selectedPlaque.mode === "Smart Page" ? "Your branded page can point customers toward a new destination." : "Point this plaque to a new website without replacing it."}</p>
            <label htmlFor="demo-destination" className="mt-5 block text-sm font-semibold">Demo destination</label><input id="demo-destination" value={destination} maxLength={200} onChange={e => setDestination(e.target.value)} required className="mt-2 w-full min-w-0 rounded-lg border p-3 text-sm"/><button type="submit" className="mt-secondary-action mt-4">Try Update</button><p className="mt-3 text-xs text-slate-600">Only this example changes. No website is opened.</p>
          </form>
        </div>}
        {step === 2 && <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Demo analytics period">{([7, 14] as const).map(days => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)} className={`rounded-xl border px-4 py-3 text-sm ${period === days ? "bg-[#17324d] text-white" : "bg-white text-slate-600"}`}>Last {days} Days</button>)}</div>
          <div className="grid grid-cols-2 gap-3 rounded-xl p-2 ring-2 ring-[#0f8f8a]/30"><div className="rounded-xl bg-[#dffaf8] p-4"><p className="text-sm">Taps</p><p className="mt-2 text-3xl font-bold">{period === 7 ? 280 : 560}</p></div><div className="rounded-xl bg-[#f3f7f9] p-4"><p className="text-sm">Smart Page Actions</p><p className="mt-2 text-3xl font-bold">{period === 7 ? 96 : 192}</p></div></div>
          <h3 className="mt-6 font-semibold">Activity trend</h3><div className="mt-4 flex h-40 items-end gap-2" aria-label="Fictional taps over time">{DEMO_DAYS.map((value, i) => <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end text-xs"><span>{value * (period / 7)}</span><div className="mt-1 w-full rounded-t bg-[#16c7c0]" style={{ height: value * 1.5 }}/><span className="mt-2">{period === 7 ? `D${i + 1}` : `${i * 2 + 1}–${i * 2 + 2}`}</span></div>)}</div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><section><h3 className="font-semibold">Top Plaques</h3>{DEMO_PLAQUES.slice(0, 3).map(p => <p key={p.id} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{p.name}</span><strong className="shrink-0">{p.taps * (period / 7)} taps</strong></p>)}</section><section><h3 className="font-semibold">Busiest Time</h3><p className="mt-2 text-xl font-bold text-[#17324d]">12 PM – 1 PM</p><p className="mt-3 text-xs text-slate-500">Activity shows taps and selected actions, not completed reviews, purchases, or revenue.</p></section></div>
        </>}
        {step === 3 && <div className="grid items-center gap-7 sm:grid-cols-2"><div className="mx-auto w-full max-w-sm rounded-[32px] border-[6px] border-[#17324d] bg-[#F3E9DC] p-4 shadow-lg"><div className="rounded-2xl bg-[#FFFCF7] p-5 text-center text-[#40251D]"><div aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-[#9C442B] text-xl font-bold text-white">C&S</div><h3 className="mt-4 text-2xl font-bold">Cedar & Stone</h3><p className="mt-2 text-sm">Good coffee. Good company. Find your next stop.</p><div className="mt-5 space-y-3">{DEMO_ACTIONS.map(item => <button key={item.icon} type="button" aria-pressed={action === item.label} onClick={() => { setAction(item.label); setMessage(`Demo: ${item.label} selected. No website opened or activity recorded.`); }} className={`flex min-h-14 w-full items-center rounded-xl bg-[#9C442B] px-3 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${action === item.label ? "ring-4 ring-[#9C442B]/30 ring-offset-2" : ""}`}><ActionContent label={item.label} iconKey={item.icon}/></button>)}</div><p className="mt-5 text-xs">Powered by ModernTap</p></div></div><div className="rounded-xl border border-[#0f8f8a]/30 bg-[#f0fdfa] p-5"><p className="mt-kicker">Try an action</p><h3 className="mt-2 text-xl font-semibold">{action ?? "Where will your customers go?"}</h3><p className="mt-3 text-sm text-slate-600">{action ? `A real customer would open your ${action === "Contact Us" ? "contact destination" : action === "Leave a Review" ? "review destination" : action === "Follow on Instagram" ? "Instagram profile" : "menu"}. This demo stays right here.` : "Tap a button in the phone to see how customers find your menu, reviews, social profile, or contact details."}</p></div></div>}
        <p role="status" className="mt-4 min-h-5 text-sm text-[#0f766e]">{message}</p>
      </div>
      {step === 3 && <p className="mt-6 text-center text-xl font-semibold text-[#17324d]">You&apos;re ready to use ModernTap.</p>}
      <nav aria-label="Tour navigation" className="mt-6 flex items-center justify-between gap-3"><div>{step > 0 && <button type="button" onClick={() => move(step - 1)} className="mt-secondary-action">Back</button>}</div>{step < 3 ? <button type="button" onClick={() => move(step + 1)} className="mt-primary-action">Next →</button> : <Link href="/billing" className="mt-primary-action">Choose Your Plan</Link>}</nav>
    </div>
  </main>;
}

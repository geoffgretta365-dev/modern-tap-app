export default function Loading() {
  return <main className="min-h-screen bg-[#f8fcfd] p-5 text-[#17324d] sm:p-8" aria-busy="true" aria-label="Loading ModernTap">
    <div className="mx-auto max-w-[1280px] animate-pulse">
      <div className="h-3 w-24 rounded-full bg-[#dffaf8]" />
      <div className="mt-5 h-9 w-64 max-w-full rounded-lg bg-[#dbe4ea]" />
      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-[20px] border border-[#dbe4ea] bg-white p-5 shadow-sm">
          <div className="h-1 w-8 rounded-full bg-[#16c7c0]" /><div className="mt-5 h-4 w-20 rounded bg-[#f3f7f9]" />
          <div className="mt-4 h-8 w-16 rounded bg-[#dbe4ea]" />
        </div>)}
      </div>
      <div className="mt-6 h-56 rounded-[20px] border border-[#dbe4ea] bg-white shadow-sm" />
    </div>
  </main>;
}

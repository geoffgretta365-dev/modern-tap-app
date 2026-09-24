import SmartPageLogo from "@/app/s/[code]/smart-page-logo";
import SmartPageAction from "@/components/smart-page/smart-page-action";
import type { PageAction, ResolvedPresentation } from "@/lib/smart-page-presentation";

export type SmartPageViewProps = {
  heading: string; subheading: string; logoSrc?: string | null;
  appearance: ResolvedPresentation; actions: PageAction[]; preview?: boolean;
};
export default function SmartPageView({ heading, subheading, logoSrc, appearance, actions, preview = false }: SmartPageViewProps) {
  const customStyle = !appearance.legacyClean;
  if (appearance.v2) return <main className="flex min-h-full w-full min-w-0 items-center justify-center px-4 py-10 text-base"
    style={{ minHeight: preview ? 580 : "100svh", backgroundColor: appearance.pageBackground, backgroundImage: appearance.backgroundImage, color: appearance.textColor }}>
    <div className="w-full min-w-0 max-w-md rounded-[28px] border px-6 py-8 shadow-[0_16px_60px_-28px_rgba(15,23,42,0.3)]"
      style={{ backgroundColor: appearance.surfaceBackground, borderColor: appearance.borderColor, textAlign: appearance.alignment }}>
      {logoSrc && <SmartPageLogo key={logoSrc} src={logoSrc} size={appearance.logoSize} alignment={appearance.alignment} />}
      {heading && <h1 className="text-[28px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">{heading}</h1>}
      {subheading && <p className={`${heading ? "mt-3" : ""} text-[15px] leading-7 [overflow-wrap:anywhere]`} style={{ color: appearance.secondaryTextColor }}>{subheading}</p>}
      <div className={`${heading || subheading || logoSrc ? "mt-8" : ""} space-y-3`}>
        {actions.map(action => <SmartPageAction key={action.id} action={action} appearance={appearance} preview={preview} />)}
      </div>
      <p className="mt-8 text-center text-xs leading-5" style={{ color: appearance.footerColor }}>Powered by ModernTap</p>
    </div>
  </main>;
  return (
    <main className="flex min-h-screen min-h-svh items-center justify-center bg-slate-50 px-3 py-6 text-slate-950 sm:px-6 sm:py-12"
      style={preview ? { minHeight: 580, ...(customStyle ? { backgroundColor: appearance.pageBackground, color: appearance.textColor } : {}) } : customStyle ? { backgroundColor: appearance.pageBackground, color: appearance.textColor } : undefined}>
      <div className="w-full min-w-0 max-w-md rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10"
        style={customStyle ? { backgroundColor: appearance.surfaceBackground, borderColor: appearance.borderColor } : undefined}>
        {logoSrc ? <SmartPageLogo key={logoSrc} src={logoSrc} /> : null}
        {heading ? (
          <h1 className="break-words text-center text-2xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl"
            style={customStyle ? { color: appearance.textColor } : undefined}>{heading}</h1>
        ) : null}
        {subheading ? (
          <p className={`${heading ? "mt-3" : ""} mx-auto max-w-sm break-words text-center text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] sm:text-base sm:leading-7`}
            style={customStyle ? { color: appearance.secondaryTextColor } : undefined}>{subheading}</p>
        ) : null}
        <div className={`${heading || subheading ? "mt-7" : ""} space-y-3`}>
          {actions.map((action) => <SmartPageAction key={action.id} action={action} appearance={appearance} preview={preview} />)}
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-slate-500"
          style={customStyle ? { color: appearance.footerColor } : undefined}>Powered by ModernTap</p>
      </div>
    </main>
  );
}

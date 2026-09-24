import ActionContent from "@/components/smart-page/action-content";
import type { PageAction, ResolvedPresentation } from "@/lib/smart-page-presentation";

export default function SmartPageAction({ action, appearance, preview, onDemoAction, primary = false }: { action: PageAction; appearance: ResolvedPresentation; preview: boolean; onDemoAction?: (id: string) => void; primary?: boolean }) {
  const customStyle = appearance.v2 || !appearance.legacyClean;
  const radius = appearance.buttonRadius === "pill" ? "9999px" : appearance.buttonRadius === "square" ? "4px" : "12px";
  const className = appearance.v2
    ? `${appearance.design.actionClass} flex min-h-14 w-full min-w-0 items-center justify-center px-4 py-3 text-center text-[15px] font-semibold leading-6 [overflow-wrap:anywhere] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4`
    : `flex min-h-12 w-full min-w-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-3.5 text-center text-base font-semibold leading-6 text-white [overflow-wrap:anywhere] transition-colors active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950 ${customStyle ? "hover:opacity-90" : "hover:bg-slate-800"}`;
  const style = customStyle ? {
    backgroundColor: appearance.buttonBackground, color: appearance.buttonTextColor,
    borderColor: appearance.buttonBorderColor, borderStyle: "solid" as const,
    borderWidth: appearance.buttonStyle === "outline" ? 1 : 0, borderRadius: radius,
    minHeight: appearance.v2 ? primary ? 64 : 56 : 48, outlineColor: appearance.textColor,
  } : undefined;
  const content = <ActionContent label={action.label} iconKey={action.iconKey} imageSrc={action.imageSrc} polished={appearance.v2} />;
  if (preview && onDemoAction) return <button type="button" onClick={() => onDemoAction(action.id)} className={className} style={style}>{content}</button>;
  return preview ? <span className={className} style={style}>{content}</span>
    : <a href={action.href} className={className} style={style}>{content}</a>;
}

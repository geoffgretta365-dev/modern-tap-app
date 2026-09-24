import type { ThemePreset } from "./smart-page-appearance";
export type SmartPageDesign = {
  description: string; headingClass: string; surfaceClass: string; headerClass: string;
  actionClass: string; logoTreatment: "bare" | "card" | "circle";
  font: string; alignment: "center" | "left";
};
const sans = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const serif = 'Georgia, "Times New Roman", serif';
const modern: SmartPageDesign = {
  description: "Crisp structure for professional businesses", font: sans, alignment: "left",
  headingClass: "text-[30px] font-semibold tracking-[-0.04em]", surfaceClass: "rounded-lg border p-6 sm:p-8", headerClass: "pb-6 border-b",
  actionClass: "shadow-sm", logoTreatment: "bare",
};
export const SMART_PAGE_DESIGNS: Record<ThemePreset, SmartPageDesign> = {
  clean: modern, modern, minimal: { ...modern, description: "Quiet, pared-back essentials" },
  dark: { ...modern, description: "Clean structure after dark", logoTreatment: "card" },
  warm: { ...modern, description: "A warm welcome", logoTreatment: "card" },
  bistro: { description: "Warm, editorial dining & café design", font: serif, alignment: "center",
    headingClass: "text-[36px] font-normal tracking-[-0.045em]", surfaceClass: "rounded-t-[64px] rounded-b-lg border px-6 pb-7 pt-9 sm:px-8", headerClass: "pb-6 border-b border-double",
    actionClass: "shadow-[0_3px_0_rgba(0,0,0,0.10)]", logoTreatment: "bare" },
  espresso: { description: "Rich, intimate café & evening dining", font: serif, alignment: "center",
    headingClass: "text-[34px] font-normal tracking-[-0.025em]", surfaceClass: "rounded-2xl border px-6 py-8 sm:px-8 shadow-xl", headerClass: "pb-5",
    actionClass: "shadow-[0_4px_14px_rgba(0,0,0,0.15)]", logoTreatment: "circle" },
  studio: { description: "Confident beauty, fitness & services", font: sans, alignment: "left",
    headingClass: "text-[36px] font-bold tracking-[-0.055em]", surfaceClass: "rounded-xl border p-6 sm:p-8", headerClass: "pb-6 border-b-2",
    actionClass: "shadow-[3px_3px_0_rgba(0,0,0,0.12)]", logoTreatment: "card" },
  motion: { ...modern, description: "High-energy fitness & movement", headingClass: "text-[36px] font-extrabold tracking-[-0.045em]", logoTreatment: "card" },
  boutique: { description: "Refined retail, beauty & wellness", font: serif, alignment: "center",
    headingClass: "text-[34px] font-normal tracking-[-0.025em]", surfaceClass: "rounded-sm border px-6 py-9 sm:px-9", headerClass: "pb-7",
    actionClass: "shadow-none", logoTreatment: "bare" },
  coastal: { description: "Airy hospitality & relaxed living", font: sans, alignment: "center",
    headingClass: "text-[30px] font-medium tracking-[-0.035em]", surfaceClass: "rounded-[24px] border px-6 py-8 sm:px-8 shadow-sm", headerClass: "pb-6",
    actionClass: "shadow-[0_5px_18px_rgba(0,0,0,0.06)]", logoTreatment: "circle" },
  bold: { description: "Big type. Strong actions. Your brand.", font: sans, alignment: "left",
    headingClass: "text-[40px] font-extrabold tracking-[-0.055em]", surfaceClass: "rounded-lg border-2 p-6 sm:p-8", headerClass: "pb-6 border-b-2",
    actionClass: "shadow-[4px_4px_0_rgba(0,0,0,0.2)]", logoTreatment: "card" },
};

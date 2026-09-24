"use client";
import { useEffect, useRef, useState } from "react";
import { mergeDraft } from "@/lib/smart-page-drafts";

export function useSmartPageDraft<T extends object>(saved: T) {
  const previous = useRef(saved);
  const [draft, setDraft] = useState(saved);
  useEffect(() => {
    if (JSON.stringify(previous.current) === JSON.stringify(saved)) return;
    const old = previous.current;
    previous.current = saved;
    setDraft(current => mergeDraft(current, old, saved));
  }, [saved]);
  return [draft, setDraft] as const;
}

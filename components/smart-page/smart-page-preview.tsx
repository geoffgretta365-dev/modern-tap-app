"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SmartPageView, { type SmartPageViewProps } from "@/components/smart-page/smart-page-view";

// A real narrow viewport keeps legacy sm: breakpoints identical to the public page.
// The iframe grows with content, avoiding a second scrolling area on phones.
export default function SmartPagePreview(props: SmartPageViewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(580);
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    function connect() {
      const doc = iframe?.contentDocument;
      if (!doc?.body || doc.readyState !== "complete") return;
      doc.head.querySelectorAll("[data-preview-style]").forEach(node => node.remove());
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.setAttribute("data-preview-style", "true"); doc.head.appendChild(copy);
      });
      setTarget(doc.body);
    }
    // srcDoc can finish loading before a server-rendered editor hydrates.
    // Subscribe for future loads AND attach to the already-loaded document.
    iframe.addEventListener("load", connect);
    connect();
    return () => iframe.removeEventListener("load", connect);
  }, []);
  useEffect(() => {
    if (!target) return;
    const observer = new ResizeObserver(() => setHeight(Math.max(580, target.scrollHeight)));
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);
  return <aside className="min-w-0 self-start xl:sticky xl:top-6" aria-label="Smart Page draft preview">
    <h3 className="text-lg font-bold text-[#17324d]">Live Preview</h3>
    <p className="mt-1 text-xs leading-5 text-slate-500">Draft changes appear here. Save each section to update your page. Image uploads publish immediately.</p>
    <div className="mx-auto mt-4 max-w-[390px] overflow-hidden rounded-[32px] border-[7px] border-[#17324d] shadow-xl">
      <iframe ref={frame} title="Mobile Smart Page preview"
        srcDoc={'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;min-height:0}body{display:flow-root}</style></head><body class="antialiased"></body></html>'}
        className="block w-full border-0" style={{ height }} />
      {target && createPortal(<SmartPageView {...props} preview />, target)}
    </div>
  </aside>;
}

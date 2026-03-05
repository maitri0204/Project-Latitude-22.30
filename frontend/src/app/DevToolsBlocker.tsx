"use client";

import { useEffect } from "react";

export default function DevToolsBlocker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Block keyboard shortcuts that open DevTools
    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      // F12
      if (key === "F12") { e.preventDefault(); e.stopPropagation(); return false; }
      // Ctrl/Cmd + Shift + I / J / C
      if (ctrl && shift && (key === "I" || key === "i" || key === "J" || key === "j" || key === "C" || key === "c")) {
        e.preventDefault(); e.stopPropagation(); return false;
      }
      // Ctrl/Cmd + U (view source)
      if (ctrl && (key === "U" || key === "u")) {
        e.preventDefault(); e.stopPropagation(); return false;
      }
    };

    // Disable right-click context menu
    const blockContext = (e: MouseEvent) => { e.preventDefault(); return false; };

    // DevTools detection via window size difference
    let devtoolsInterval: ReturnType<typeof setInterval> | null = null;
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = "";
        window.location.replace("/login");
      }
    };
    devtoolsInterval = setInterval(detectDevTools, 1000);

    document.addEventListener("keydown", blockKeys, true);
    document.addEventListener("contextmenu", blockContext, true);

    return () => {
      document.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("contextmenu", blockContext, true);
      if (devtoolsInterval) clearInterval(devtoolsInterval);
    };
  }, []);

  return null;
}

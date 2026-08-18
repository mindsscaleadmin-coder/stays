"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdvancedFilterPopover({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="Close filters"
      />
      <div
        ref={panelRef}
        className={cn(
          "absolute end-0 top-full mt-2 z-50 w-[min(360px,calc(100vw-2rem))] max-h-[min(70vh,480px)]",
          "rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

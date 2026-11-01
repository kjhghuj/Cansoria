"use client";

import { useRef, useState } from "react";
import QuickViewModal from "./QuickViewModal";

/**
 * "Quick View" trigger shown over catalogue card images. Hover reveals it on
 * pointer devices, keyboard focus keeps it reachable (see lorencess-features.css),
 * and touch layouts hide it entirely — phones go straight to the detail page.
 */
export default function QuickViewButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="fl-quickview__btn"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        Quick View
      </button>
      {open ? (
        <QuickViewModal slug={slug} onClose={() => setOpen(false)} triggerRef={triggerRef} />
      ) : null}
    </>
  );
}
